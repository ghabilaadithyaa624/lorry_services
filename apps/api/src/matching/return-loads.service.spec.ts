import { NotFoundException } from '@nestjs/common'
import { ReturnLoadsService } from './return-loads.service'

const prismaMock: any = {
  truck: { findUnique: jest.fn() },
  booking: { findFirst: jest.fn() },
  load: { findMany: jest.fn() },
  subscription: { findFirst: jest.fn() },
  user: { findUnique: jest.fn() },
  $queryRaw: jest.fn(),
}

jest.mock('@lorrycarry/database', () => ({
  get prisma() {
    return prismaMock
  },
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
    raw: (value: string) => value,
  },
}))

/** Bengaluru drop-off hub used by every fixture. */
const HUB = { lat: 12.9756, lng: 77.5728 }

function buildTruck(overrides: Record<string, unknown> = {}) {
  return {
    id: 'truck-1',
    userId: 'driver-1',
    registrationNumber: 'KA01AB1234',
    bodyType: 'Open',
    tonnageCapacity: '20.00',
    currentLat: '12.97560000',
    currentLng: '77.57280000',
    serviceableRadiusKm: 50,
    preferredDestinations: ['Chennai'],
    verificationStatus: 'Verified',
    user: { id: 'driver-1', name: 'Ravi', phone: '+919000000001' },
    ...overrides,
  }
}

function buildLoadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'load-1',
    userId: 'shipper-1',
    tonnageRequired: '18.00',
    loadingAddress: 'Peenya Industrial Area, Bengaluru',
    loadingLat: '12.97190000',
    loadingLng: '77.64120000',
    unloadingAddress: 'Ambattur, Chennai',
    unloadingLat: '13.08270000',
    unloadingLng: '80.27070000',
    truckType: 'Open',
    urgent: false,
    maxPrice: '180000.00',
    createdAt: new Date('2026-09-01T08:00:00.000Z'),
    ownerPhone: '+919000000002',
    ownerName: 'Sunrise Steels',
    pickupDistanceKm: 8,
    ...overrides,
  }
}

describe('ReturnLoadsService', () => {
  let service: ReturnLoadsService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ReturnLoadsService()
    prismaMock.truck.findUnique.mockResolvedValue(buildTruck())
    prismaMock.booking.findFirst.mockResolvedValue(null)
    prismaMock.load.findMany.mockResolvedValue([])
    prismaMock.subscription.findFirst.mockResolvedValue(null)
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.$queryRaw.mockResolvedValue([buildLoadRow()])
  })

  it('throws when the truck does not exist', async () => {
    prismaMock.truck.findUnique.mockResolvedValueOnce(null)
    await expect(service.getReturnLoadsForTruck('missing', 'driver-1')).rejects.toBeInstanceOf(NotFoundException)
  })

  describe('drop-off hub resolution', () => {
    it('prefers the most recent booking destination over the truck GPS position', async () => {
      prismaMock.booking.findFirst.mockResolvedValueOnce({
        id: 'booking-9',
        status: 'Completed',
        completedAt: new Date('2026-09-03T10:00:00.000Z'),
        load: {
          unloadingAddress: 'Hyderabad Terminal',
          unloadingLat: '17.38500000',
          unloadingLng: '78.48670000',
        },
      })

      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1')

      expect(result.anchor.source).toBe('booking_destination')
      expect(result.anchor.bookingId).toBe('booking-9')
      expect(result.anchor.label).toBe('Hyderabad Terminal')
      expect(result.anchor.lat).toBeCloseTo(17.385, 4)
      expect(result.anchor.droppedAt).toBe('2026-09-03T10:00:00.000Z')
    })

    it('only considers completed or in-flight trips as drop-off points', async () => {
      await service.getReturnLoadsForTruck('truck-1', 'driver-1')

      expect(prismaMock.booking.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { truckId: 'truck-1', status: { in: ['Completed', 'InTransit', 'Confirmed'] } },
        }),
      )
    })

    it('falls back to the truck current location when there is no recent trip', async () => {
      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1')

      expect(result.anchor.source).toBe('truck_current_location')
      expect(result.anchor.lat).toBeCloseTo(HUB.lat, 4)
      expect(result.anchor.lng).toBeCloseTo(HUB.lng, 4)
    })

    it('falls back to the preferred corridor when no coordinates exist anywhere', async () => {
      prismaMock.truck.findUnique.mockResolvedValueOnce(
        buildTruck({ currentLat: null, currentLng: null, preferredDestinations: ['Chennai', 'Hosur'] }),
      )
      prismaMock.load.findMany.mockResolvedValueOnce([
        { ...buildLoadRow(), user: { phone: '+919000000002', name: 'Sunrise Steels' } },
      ])

      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1')

      expect(result.anchor.source).toBe('preferred_destination')
      expect(result.anchor.label).toBe('Chennai')
      expect(prismaMock.$queryRaw).not.toHaveBeenCalled()
      expect(prismaMock.load.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { loadingAddress: { contains: 'Chennai', mode: 'insensitive' } },
              { loadingAddress: { contains: 'Hosur', mode: 'insensitive' } },
            ],
          }),
        }),
      )
    })

    it('honours an explicit destination override from the caller', async () => {
      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1', {
        destinationLat: 19.076,
        destinationLng: 72.8777,
      })

      expect(result.anchor.source).toBe('query_override')
      expect(result.anchor.lat).toBe(19.076)
      expect(prismaMock.booking.findFirst).not.toHaveBeenCalled()
    })

    it('reports an unresolved hub instead of failing when the truck has no signals', async () => {
      prismaMock.truck.findUnique.mockResolvedValueOnce(
        buildTruck({ currentLat: null, currentLng: null, preferredDestinations: null }),
      )

      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1')

      expect(result.anchor.source).toBe('unresolved')
      expect(result.opportunities).toEqual([])
    })
  })

  describe('candidate discovery', () => {
    it('queries open loads within the radius, excluding the operator own freight', async () => {
      await service.getReturnLoadsForTruck('truck-1', 'driver-1', { radiusKm: 120 })

      const [query] = prismaMock.$queryRaw.mock.calls[0]
      expect(query.values).toContain(20) // tonnage capacity
      expect(query.values).toContain('driver-1') // excluded owner
      expect(query.values).toContain(120 * 1000) // radius in metres
      expect(query.strings.join(' ')).toContain("l.status = 'Open'")
    })

    it('clamps the radius to the 300 km ceiling and the limit to 50', async () => {
      const rows = Array.from({ length: 60 }, (_, index) =>
        buildLoadRow({ id: `load-${index}`, pickupDistanceKm: index }),
      )
      prismaMock.$queryRaw.mockResolvedValueOnce(rows)

      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1', { radiusKm: 5000, limit: 999 })

      expect(result.radiusKm).toBe(300)
      expect(result.opportunities.length).toBe(50)
      expect(result.candidatesEvaluated).toBe(60)
    })

    it('falls back to an in-memory distance filter when PostGIS is unavailable', async () => {
      prismaMock.$queryRaw.mockRejectedValueOnce(new Error('function st_dwithin does not exist'))
      prismaMock.load.findMany.mockResolvedValueOnce([
        { ...buildLoadRow(), user: { phone: '+919000000002', name: 'Sunrise Steels' } },
        {
          ...buildLoadRow({ id: 'load-far', loadingLat: '19.07600000', loadingLng: '72.87770000' }),
          user: { phone: '+919000000003', name: 'Far Away Traders' },
        },
      ])

      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1', { radiusKm: 150 })

      expect(prismaMock.load.findMany).toHaveBeenCalled()
      expect(result.opportunities.map((o) => o.loadId)).toEqual(['load-1'])
    })
  })

  describe('ranking', () => {
    it('ranks opportunities with an explainable breakdown', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([
        buildLoadRow({ id: 'load-near', pickupDistanceKm: 4 }),
        buildLoadRow({
          id: 'load-mismatch',
          truckType: 'Container',
          unloadingAddress: 'Hyderabad',
          pickupDistanceKm: 6,
        }),
      ])

      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1', { radiusKm: 150 })

      expect(result.opportunities.map((o) => o.loadId)).toEqual(['load-near', 'load-mismatch'])
      expect(result.opportunities.map((o) => o.rank)).toEqual([1, 2])
      expect(result.opportunities[0].rankScore).toBeGreaterThan(result.opportunities[1].rankScore)
      expect(result.opportunities[0].rankFactors.map((f) => f.key)).toEqual([
        'matchScore',
        'pickupProximity',
        'payload',
        'bodyType',
        'rate',
        'corridor',
      ])
      expect(result.opportunities[0].preferredCorridor).toBe(true)
      expect(result.opportunities[0].bodyTypeExact).toBe(true)
      expect(result.opportunities[1].bodyTypeCompatible).toBe(false)
    })

    it('exposes payload, body type, budget and corridor compatibility flags', async () => {
      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1')
      const [opportunity] = result.opportunities

      expect(opportunity.payloadCompatible).toBe(true)
      expect(opportunity.payloadUtilizationPct).toBe(90)
      expect(opportunity.budgetFit).toBe(true)
      expect(opportunity.benchmarkFreight).toBeGreaterThan(0)
      expect(opportunity.isReturnLoad).toBe(true)
      expect(opportunity.potentialEmptyRunReductionKm).toBeGreaterThan(0)
    })

    it('drops opportunities below the requested minimum score', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([
        buildLoadRow({ id: 'load-strong' }),
        buildLoadRow({ id: 'load-weak', truckType: 'Container', unloadingAddress: 'Hyderabad', maxPrice: '500.00' }),
      ])

      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1', { minScore: 90 })

      expect(result.candidatesEvaluated).toBe(2)
      expect(result.totalRanked).toBe(1)
      expect(result.opportunities.map((o) => o.loadId)).toEqual(['load-strong'])
    })

    it('measures pickup distance from the drop-off hub, not the truck GPS position', async () => {
      prismaMock.booking.findFirst.mockResolvedValueOnce({
        id: 'booking-9',
        status: 'InTransit',
        completedAt: null,
        load: {
          unloadingAddress: 'Hyderabad Terminal',
          unloadingLat: '17.38500000',
          unloadingLng: '78.48670000',
        },
      })
      prismaMock.$queryRaw.mockResolvedValueOnce([
        buildLoadRow({ id: 'load-hyd', loadingLat: '17.40000000', loadingLng: '78.50000000' }),
      ])

      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1')

      // ~2 km from the Hyderabad drop-off, ~700 km from the Bengaluru GPS ping.
      expect(result.opportunities[0].pickupDistanceFromDestinationKm).toBeLessThan(10)
    })
  })

  describe('contact masking', () => {
    it('masks shipper contact details without a subscription or trial', async () => {
      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1')

      expect(result.contactUnlocked).toBe(false)
      expect(result.opportunities[0].contact).toEqual({
        locked: true,
        name: null,
        phone: null,
        message: 'Subscribe or start your free trial to reveal shipper contact details.',
      })
      expect(JSON.stringify(result)).not.toContain('+919000000002')
    })

    it('reveals contact details for an active subscription', async () => {
      prismaMock.subscription.findFirst.mockResolvedValueOnce({ id: 'sub-1' })

      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1')

      expect(result.contactUnlocked).toBe(true)
      expect(result.opportunities[0].contact).toEqual({
        locked: false,
        name: 'Sunrise Steels',
        phone: '+919000000002',
      })
    })

    it('reveals contact details during the free trial', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        trialStartedAt: new Date(Date.now() - 86_400_000),
        trialEndsAt: new Date(Date.now() + 86_400_000),
      })

      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1')

      expect(result.contactUnlocked).toBe(true)
      expect(result.opportunities[0].contact.phone).toBe('+919000000002')
    })

    it('keeps contacts masked once the trial has expired', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce({
        trialStartedAt: new Date(Date.now() - 200 * 86_400_000),
        trialEndsAt: new Date(Date.now() - 86_400_000),
      })

      const result = await service.getReturnLoadsForTruck('truck-1', 'driver-1')

      expect(result.contactUnlocked).toBe(false)
      expect(result.opportunities[0].contact.locked).toBe(true)
    })

    it('masks contacts for anonymous callers', async () => {
      const result = await service.getReturnLoadsForTruck('truck-1', undefined)

      expect(result.contactUnlocked).toBe(false)
      expect(prismaMock.subscription.findFirst).not.toHaveBeenCalled()
    })
  })
})
