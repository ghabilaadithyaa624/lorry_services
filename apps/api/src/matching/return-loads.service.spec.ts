import { BadRequestException, Logger, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { ReturnLoadsService, ReturnLoadsOptions } from './return-loads.service'

const prismaMock = {
  truck: { findUnique: jest.fn() },
  booking: { findFirst: jest.fn() },
  subscription: { findFirst: jest.fn() },
  user: { findUnique: jest.fn() },
  load: { findMany: jest.fn() },
  $queryRaw: jest.fn(),
}

jest.mock('@lorrycarry/database', () => ({
  get prisma() { return prismaMock },
  // Real SQL fragment composition: assert the final bound values and SQL text.
  Prisma: jest.requireActual('@prisma/client').Prisma,
}))

const NOW = new Date('2026-09-04T12:00:00.000Z')
const HUB = { lat: 12.9756, lng: 77.5728 }

function buildTruck(overrides: Record<string, unknown> = {}) {
  return {
    id: 'truck-1', userId: 'driver-1', registrationNumber: 'KA01AB1234',
    bodyType: 'Open', tonnageCapacity: '20.00', lengthFt: 24, heightFt: 8,
    currentLat: '12.97560000', currentLng: '77.57280000', serviceableRadiusKm: 50,
    preferredDestinations: ['Chennai'], verificationStatus: 'Verified',
    ...overrides,
  }
}

function buildLoad(overrides: Record<string, unknown> = {}) {
  return {
    id: 'load-1', userId: 'shipper-1', tonnageRequired: '18.00',
    loadingAddress: 'Peenya Industrial Area, Bengaluru', loadingLat: '12.97190000', loadingLng: '77.64120000',
    unloadingAddress: 'Ambattur, Chennai', unloadingLat: '13.08270000', unloadingLng: '80.27070000',
    truckType: 'Open', minLengthFt: null, minHeightFt: null, urgent: false,
    maxPrice: '180000.00', createdAt: new Date('2026-09-01T08:00:00.000Z'),
    // Deliberately include PII even for locked mocks: DTO mapping must still mask it.
    ownerPhone: '+919000000002', ownerName: 'Sunrise Steels', pickupDistanceKm: 8,
    ...overrides,
  }
}

const completedBooking = (overrides: Record<string, unknown> = {}) => ({
  id: 'booking-9', status: 'Completed', completedAt: new Date('2026-09-03T10:00:00.000Z'),
  load: { unloadingAddress: 'Hyderabad Terminal', unloadingLat: '17.38500000', unloadingLng: '78.48670000' },
  ...overrides,
})

describe('ReturnLoadsService', () => {
  let service: ReturnLoadsService
  const discover = (options?: ReturnLoadsOptions) => service.getReturnLoadsForTruck('truck-1', 'driver-1', options)

  beforeEach(() => {
    jest.resetAllMocks()
    jest.useFakeTimers().setSystemTime(NOW)
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {})
    service = new ReturnLoadsService()
    prismaMock.truck.findUnique.mockResolvedValue(buildTruck())
    prismaMock.booking.findFirst.mockResolvedValue(null)
    prismaMock.subscription.findFirst.mockResolvedValue(null)
    prismaMock.$queryRaw.mockResolvedValue([buildLoad()])
  })
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

  describe('authorization', () => {
    it.each([null, buildTruck({ userId: 'other-driver' })])('does not disclose missing or another operator’s truck', async (truck) => {
      prismaMock.truck.findUnique.mockResolvedValueOnce(truck)
      await expect(discover()).rejects.toBeInstanceOf(NotFoundException)
      expect(prismaMock.booking.findFirst).not.toHaveBeenCalled()
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled()
      expect(prismaMock.subscription.findFirst).not.toHaveBeenCalled()
    })

    it('requires a caller even for internal service invocation', async () => {
      await expect(service.getReturnLoadsForTruck('truck-1', undefined)).rejects.toBeInstanceOf(UnauthorizedException)
      expect(prismaMock.truck.findUnique).not.toHaveBeenCalled()
    })

    it('does not fetch truck-owner contacts or documents', async () => {
      await discover()
      const query = prismaMock.truck.findUnique.mock.calls[0][0]
      expect(query.select.user).toBeUndefined()
      expect(query.select.documents).toBeUndefined()
      expect(query.select.currentLat).toBe(true)
      expect(query.select.currentLng).toBe(true)
      expect(query.select.preferredDestinations).toBe(true)
    })
  })

  describe('hub resolution', () => {
    it('uses the latest completed destination ahead of GPS and retains actual truck metadata', async () => {
      prismaMock.booking.findFirst.mockResolvedValueOnce(completedBooking())
      const result = await discover()
      expect(result.anchor).toMatchObject({
        source: 'booking_destination', bookingId: 'booking-9', bookingStatus: 'Completed',
        label: 'Hyderabad Terminal', lat: 17.385, lng: 78.4867, droppedAt: '2026-09-03T10:00:00.000Z',
      })
      expect(result.truck.currentLat).toBe(HUB.lat)
      expect(result.truck.preferredDestinations).toEqual(['Chennai'])
      expect(prismaMock.$queryRaw.mock.calls[0][0].values).toContain(17.385)
      expect(prismaMock.$queryRaw.mock.calls[0][0].values).toContain(78.4867)
    })

    it('excludes active, cancelled and pending trips; sorts completion dates with explicit null handling and a stable tie break', async () => {
      await discover()
      expect(prismaMock.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { truckId: 'truck-1', truckOwnerId: 'driver-1', status: 'Completed' },
        orderBy: [{ completedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }, { id: 'asc' }],
      }))
    })

    it('uses GPS when there is no completed trip', async () => {
      expect((await discover()).anchor).toMatchObject({ source: 'truck_current_location', ...HUB })
    })

    it.each([
      { unloadingLat: null, unloadingLng: '78.4867' },
      { unloadingLat: '95', unloadingLng: '78.4867' },
      { unloadingLat: 'NaN', unloadingLng: 'Infinity' },
    ])('falls back to GPS when the latest completed destination is unusable', async (load) => {
      prismaMock.booking.findFirst.mockResolvedValueOnce(completedBooking({ load }))
      expect((await discover()).anchor.source).toBe('truck_current_location')
    })

    it('accepts zero coordinates from completed bookings and GPS', async () => {
      prismaMock.booking.findFirst.mockResolvedValueOnce(completedBooking({ load: { unloadingLat: '0', unloadingLng: '0' } }))
      expect((await discover()).anchor).toMatchObject({ lat: 0, lng: 0, source: 'booking_destination' })
      prismaMock.truck.findUnique.mockResolvedValueOnce(buildTruck({ currentLat: '0', currentLng: '0' }))
      expect((await discover()).anchor).toMatchObject({ lat: 0, lng: 0, source: 'truck_current_location' })
    })

    it('honours a validated explicit destination without looking up a booking', async () => {
      const result = await discover({ destinationLat: 0, destinationLng: 72.8777 })
      expect(result.anchor).toMatchObject({ source: 'query_override', lat: 0, lng: 72.8777 })
      expect(prismaMock.booking.findFirst).not.toHaveBeenCalled()
    })

    it.each([
      { currentLat: null, currentLng: null, preferredDestinations: ['Chennai'] },
      { currentLat: null, currentLng: null, preferredDestinations: [] },
      { currentLat: 'Infinity', currentLng: '0' },
      { currentLat: '12', currentLng: '181' },
    ])('never searches without a coordinate hub, even if preferred corridor names exist', async (truck) => {
      prismaMock.truck.findUnique.mockResolvedValueOnce(buildTruck(truck))
      const result = await discover()
      expect(result.anchor.source).toBe('unresolved')
      expect(result.opportunities).toEqual([])
      expect(result.candidatesEvaluated).toBe(0)
      expect(result.totalRanked).toBe(0)
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled()
      expect(prismaMock.load.findMany).not.toHaveBeenCalled()
    })
  })

  describe('query limits and validation', () => {
    it('defaults to 50 km and 10 results, and parameterizes open-load capacity/owner/proximity predicates', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce(Array.from({ length: 15 }, (_, i) => buildLoad({ id: `load-${i}` })))
      const result = await discover()
      const query = prismaMock.$queryRaw.mock.calls[0][0]
      expect(result.radiusKm).toBe(50)
      expect(result.opportunities).toHaveLength(10)
      expect(result.totalRanked).toBe(15)
      expect(query.values).toEqual(expect.arrayContaining([20, 'driver-1', 50_000, 50, 100]))
      expect(query.text).toContain("l.status = 'Open'")
      expect(query.text).toContain('l.tonnage_required > 0')
      expect(query.text).toContain('ST_DWithin')
      expect(query.text).toContain('COALESCE(l.loading_point')
      expect(query.text).toContain('ORDER BY "pickupDistanceKm" ASC, id ASC')
      expect(query.text.indexOf('WHERE "pickupDistanceKm"')).toBeLessThan(query.text.indexOf('LIMIT'))
      expect(query.text).not.toContain('driver-1')
    })

    it('accepts a smaller fractional radius without silently rounding it up', async () => {
      const result = await discover({ radiusKm: 12.5, limit: 1 })
      expect(result.radiusKm).toBe(12.5)
      expect(prismaMock.$queryRaw.mock.calls[0][0].values).toContain(12_500)
    })

    it.each<ReturnLoadsOptions>([
      { radiusKm: 0 }, { radiusKm: -1 }, { radiusKm: 50.1 }, { radiusKm: 300 }, { radiusKm: NaN }, { radiusKm: Infinity },
      { limit: 0 }, { limit: 51 }, { limit: 1.1 }, { limit: NaN }, { minScore: -1 }, { minScore: 101 }, { minScore: NaN },
      { destinationLat: 0 }, { destinationLng: 0 }, { destinationLat: 91, destinationLng: 0 },
      { destinationLat: 0, destinationLng: -181 }, { destinationLat: Infinity, destinationLng: 0 },
    ])('rejects invalid options on direct service calls: %j', async (options) => {
      await expect(discover(options)).rejects.toBeInstanceOf(BadRequestException)
      expect(prismaMock.truck.findUnique).not.toHaveBeenCalled()
    })

    it('caps candidate processing at 100 and returned results at the requested limit', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce(Array.from({ length: 110 }, (_, i) => buildLoad({ id: `load-${i}`, pickupDistanceKm: i / 10 })))
      const result = await discover({ limit: 50 })
      expect(result.candidatesEvaluated).toBe(100)
      expect(result.opportunities).toHaveLength(50)
    })

    it('applies a hard distance boundary and rejects missing/invalid pickup data on every path', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([
        buildLoad({ id: 'inside', pickupDistanceKm: 49.99 }), buildLoad({ id: 'boundary', pickupDistanceKm: 50 }),
        ...[50.001, 65, -1, undefined, null, NaN, Infinity].map((distance, i) => buildLoad({ id: `bad-${i}`, pickupDistanceKm: distance })),
        buildLoad({ id: 'no-lat', loadingLat: null }), buildLoad({ id: 'invalid-lng', loadingLng: '181' }),
        buildLoad({ id: 'overweight', tonnageRequired: '21' }), buildLoad({ id: 'zero-payload', tonnageRequired: '0' }),
        buildLoad({ id: 'own-freight', userId: 'driver-1' }),
      ])
      const result = await discover()
      expect(result.opportunities.map((o) => o.loadId)).toEqual(['inside', 'boundary'])
      expect(result.candidatesEvaluated).toBe(2)
      expect(result.opportunities.every((o) => o.pickupDistanceFromDestinationKm <= 50)).toBe(true)
    })

    it('does not round a valid pickup beyond a fractional radius in the response', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([buildLoad({ pickupDistanceKm: 10.06 })])
      const result = await discover({ radiusKm: 10.06 })
      expect(result.opportunities[0].pickupDistanceFromDestinationKm).toBeLessThanOrEqual(result.radiusKm)
    })

    it('supports valid zero pickup coordinates and zero deadhead distance', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([buildLoad({ loadingLat: '0', loadingLng: '0', pickupDistanceKm: 0 })])
      const result = await discover({ destinationLat: 0, destinationLng: 0 })
      expect(result.opportunities[0].pickupDistanceFromDestinationKm).toBe(0)
      expect(result.opportunities[0].matchResult.distanceKm).toBe(0)
    })

    it('uses bounded, pre-limit spherical SQL when PostGIS is unavailable, never an unbounded JS or corridor fallback', async () => {
      prismaMock.$queryRaw.mockRejectedValueOnce(new Error('function st_dwithin does not exist'))
      const result = await discover({ radiusKm: 25 })
      expect(result.opportunities).toHaveLength(1)
      const query = prismaMock.$queryRaw.mock.calls[1][0]
      expect(query.text).not.toContain('ST_')
      expect(query.text).not.toContain('loading_point')
      expect(query.text).toContain('ASIN(SQRT(LEAST(1.0, GREATEST(0.0,')
      expect(query.text).toContain("l.status = 'Open'")
      expect(query.text).toContain('l.loading_lat BETWEEN')
      expect(query.text.indexOf('WHERE "pickupDistanceKm"')).toBeLessThan(query.text.indexOf('LIMIT'))
      expect(query.values).toContain(25)
      expect(prismaMock.load.findMany).not.toHaveBeenCalled()
    })

    it('reports an outage rather than a misleading empty load board if both queries fail', async () => {
      prismaMock.$queryRaw.mockRejectedValue(new Error('database unavailable'))
      await expect(discover()).rejects.toBeInstanceOf(ServiceUnavailableException)
    })
  })

  describe('shared ranking', () => {
    it('ranks all six requested factors with compatibility flags and explanations', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([
        buildLoad({ id: 'load-weak', truckType: 'Container', unloadingAddress: 'Hyderabad', maxPrice: '500', pickupDistanceKm: 12 }),
        buildLoad({ id: 'load-strong', pickupDistanceKm: 4 }),
      ])
      const result = await discover()
      const [strong, weak] = result.opportunities
      expect(result.opportunities.map((o) => o.loadId)).toEqual(['load-strong', 'load-weak'])
      expect(result.opportunities.map((o) => o.rank)).toEqual([1, 2])
      expect(strong.rankScore).toBeGreaterThan(weak.rankScore)
      expect(strong.rankFactors.map((f) => f.key)).toEqual(['matchScore', 'pickupProximity', 'payload', 'bodyType', 'rate', 'corridor'])
      expect(strong).toMatchObject({ payloadCompatible: true, payloadUtilizationPct: 90, bodyTypeExact: true, budgetFit: true, preferredCorridor: true })
      expect(weak).toMatchObject({ bodyTypeCompatible: false, budgetFit: false, preferredCorridor: false })
      expect(strong.benchmarkFreight).toBeGreaterThan(0)
      expect(strong.potentialEmptyRunReductionKm).toBeGreaterThan(0)
      expect(weak.matchScore).toBeLessThanOrEqual(65)
    })

    it('uses measured proximity, not rounded road distance from the truck’s GPS', async () => {
      prismaMock.booking.findFirst.mockResolvedValueOnce(completedBooking())
      prismaMock.$queryRaw.mockResolvedValueOnce([buildLoad({ loadingLat: '17.4', loadingLng: '78.5', pickupDistanceKm: 2.35 })])
      const [opportunity] = (await discover()).opportunities
      expect(opportunity.pickupDistanceFromDestinationKm).toBe(2.35)
      expect(opportunity.matchResult.distanceKm).toBe(2.35)
      expect(opportunity.matchResult.isProximityFit).toBe(true)
    })

    it('rewards fuller payloads and nearer pickup distances', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([
        buildLoad({ id: 'half-full', tonnageRequired: '10' }),
        buildLoad({ id: 'further', pickupDistanceKm: 40 }),
        buildLoad({ id: 'full-near' }),
      ])
      const result = await discover()
      expect(result.opportunities[0].loadId).toBe('full-near')
      expect(result.opportunities[0].rankScore).toBeGreaterThan(result.opportunities[1].rankScore)
    })

    it('keeps ties deterministic irrespective of database row order', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([buildLoad({ id: 'z' }), buildLoad({ id: 'a' })])
      expect((await discover()).opportunities.map((o) => o.loadId)).toEqual(['a', 'z'])
    })

    it('normalizes raw Open body enum labels and preferred destinations before scoring', async () => {
      prismaMock.truck.findUnique.mockResolvedValueOnce(buildTruck({ bodyType: 'OpenBody', preferredDestinations: ['  Chennai ', '', null, 42] }))
      prismaMock.$queryRaw.mockResolvedValueOnce([buildLoad({ truckType: 'Open body' })])
      const result = await discover()
      expect(result.truck.preferredDestinations).toEqual(['Chennai'])
      expect(result.opportunities[0]).toMatchObject({ truckType: 'OpenBody', bodyTypeExact: true, preferredCorridor: true })
    })

    it('filters by minScore before applying the response limit', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([
        buildLoad({ id: 'weak', truckType: 'Container', maxPrice: '500' }),
        buildLoad({ id: 'strong' }),
      ])
      const result = await discover({ minScore: 90, limit: 1 })
      expect(result.candidatesEvaluated).toBe(2)
      expect(result.totalRanked).toBe(1)
      expect(result.opportunities.map((o) => o.loadId)).toEqual(['strong'])
    })

    it('treats an unspecified budget as negotiable instead of failing the budget gate', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([buildLoad({ maxPrice: null })])
      expect((await discover()).opportunities[0].budgetFit).toBe(true)
    })
  })

  describe('contact privacy', () => {
    it('uses an explicit response allowlist and never selects PII for locked callers', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([buildLoad({ user: { email: 'secret@example.test', phone: 'secret' }, extra: 'private-record' })])
      const result = await discover()
      expect(result.contactUnlocked).toBe(false)
      expect(result.opportunities[0].contact).toEqual({
        locked: true, name: null, phone: null, message: 'An active subscription is required to reveal shipper contact details.',
      })
      const serialized = JSON.stringify(result)
      for (const pii of ['+919000000002', 'Sunrise Steels', 'secret@example.test', 'private-record', 'shipper-1']) {
        expect(serialized).not.toContain(pii)
      }
      expect(prismaMock.$queryRaw.mock.calls[0][0].text).not.toContain('users u')
      expect(prismaMock.$queryRaw.mock.calls[0][0].text).not.toContain('ownerPhone')
    })

    it('unlocks contacts only for the caller’s active, started, unexpired subscription', async () => {
      prismaMock.subscription.findFirst.mockResolvedValueOnce({ id: 'sub-1' })
      const result = await discover()
      expect(prismaMock.subscription.findFirst).toHaveBeenCalledWith({
        where: { userId: 'driver-1', status: 'active', startedAt: { lte: NOW }, expiresAt: { gt: NOW } },
        select: { id: true },
      })
      expect(result.contactUnlocked).toBe(true)
      expect(result.opportunities[0].contact).toEqual({ locked: false, name: 'Sunrise Steels', phone: '+919000000002' })
      expect(prismaMock.$queryRaw.mock.calls[0][0].text).toContain('u.phone as "ownerPhone"')
    })

    it('does not grant contact access solely from a free trial or query another user’s entitlement', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ trialStartedAt: new Date(NOW.getTime() - 1), trialEndsAt: new Date(NOW.getTime() + 86_400_000) })
      const result = await discover()
      expect(result.contactUnlocked).toBe(false)
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
      expect(prismaMock.subscription.findFirst).toHaveBeenCalledTimes(1)
    })

    it('fails closed on subscription errors, including the portable query fallback', async () => {
      prismaMock.subscription.findFirst.mockRejectedValueOnce(new Error('subscription store unavailable'))
      prismaMock.$queryRaw.mockRejectedValueOnce(new Error('PostGIS unavailable'))
      const result = await discover()
      expect(result.contactUnlocked).toBe(false)
      expect(result.opportunities[0].contact.phone).toBeNull()
      expect(prismaMock.$queryRaw.mock.calls.every(([query]) => !query.text.includes('ownerPhone'))).toBe(true)
    })
  })
})
