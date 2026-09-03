import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { ComplianceService } from './compliance.service'
import { VahanService } from '../common/services/vahan.service'
import { prisma } from '@lorrycarry/database'

jest.mock('@lorrycarry/database', () => ({
  prisma: {
    truck: { findUnique: jest.fn(), update: jest.fn() },
    booking: { findUnique: jest.fn(), update: jest.fn() },
  },
  EwayBillStatus: { Pending: 'Pending', Active: 'Active', Expired: 'Expired', Invalid: 'Invalid' },
  FastagStatus: { Unknown: 'Unknown', Active: 'Active', LowBalance: 'LowBalance', Inactive: 'Inactive' },
  VerificationStatus: { Pending: 'Pending', Verified: 'Verified', Rejected: 'Rejected' },
}))

describe('ComplianceService', () => {
  let service: ComplianceService
  let vahan: { validateRC: jest.Mock; toPersistableSnapshot: jest.Mock }

  const OWNER = 'owner-1'
  const ADMIN = 'admin-1'
  const OTHER = 'stranger-1'

  const futureIso = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)

  const truckWithVahan = (overrides: Record<string, any> = {}) => ({
    id: 'truck-1',
    userId: OWNER,
    registrationNumber: 'MH12QW8842',
    vahanValidatedAt: new Date(),
    vahanDetails: {
      registrationNumber: 'MH12QW8842',
      registrationStatus: 'ACTIVE',
      makerModel: 'Tata LPT 3118',
      fuelType: 'DIESEL',
      insuranceValidUpto: futureIso(90),
      fitnessValidUpto: futureIso(200),
      pucValidUpto: futureIso(60),
      permitType: 'National Permit',
      permitValidUpto: futureIso(150),
      source: 'vahan_api',
      checkedAt: new Date().toISOString(),
    },
    fastagStatus: 'Active',
    fastagUpdatedAt: new Date(),
    documents: [
      { type: 'RC', verificationStatus: 'Verified', verifiedAt: new Date() },
      { type: 'Insurance', verificationStatus: 'Verified', verifiedAt: new Date() },
    ],
    ...overrides,
  })

  beforeEach(async () => {
    jest.clearAllMocks()

    vahan = {
      validateRC: jest.fn(),
      toPersistableSnapshot: jest.fn((result: any) => result?.data ?? null),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: VahanService, useValue: vahan },
      ],
    }).compile()

    service = module.get<ComplianceService>(ComplianceService)
  })

  // ── Access control ────────────────────────────────────────────────────────

  describe('access control', () => {
    it('should 404 for a missing truck', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(null)
      await expect(service.getTruckCompliance('nope', OWNER, 'truck_owner')).rejects.toThrow(NotFoundException)
    })

    it('should allow the truck owner and admins, deny strangers', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValue(truckWithVahan())

      await expect(service.getTruckCompliance('truck-1', OWNER, 'truck_owner')).resolves.toBeTruthy()
      await expect(service.getTruckCompliance('truck-1', ADMIN, 'admin')).resolves.toBeTruthy()
      await expect(
        service.getTruckCompliance('truck-1', OTHER, 'truck_owner')
      ).rejects.toThrow(ForbiddenException)
    })
  })

  // ── Truck checklist ───────────────────────────────────────────────────────

  describe('getTruckCompliance', () => {
    it('should report a fully compliant truck with Vahan-backed items', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(truckWithVahan())

      const checklist = await service.getTruckCompliance('truck-1', OWNER, 'truck_owner')

      expect(checklist.overall).toBe('compliant')
      const keys = checklist.items.map((i) => i.key)
      expect(keys).toEqual(expect.arrayContaining(['rc_vahan', 'insurance', 'fitness', 'permit', 'puc', 'fastag']))
      checklist.items.forEach((item) => expect(item.status).toBe('compliant'))
    })

    it('should mark RC as pending when never validated via Vahan', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(
        truckWithVahan({ vahanValidatedAt: null, vahanDetails: null, fastagStatus: 'Unknown' }),
      )

      const checklist = await service.getTruckCompliance('truck-1', OWNER, 'truck_owner')

      const rc = checklist.items.find((i) => i.key === 'rc_vahan')!
      expect(rc.status).toBe('pending')
      const fastag = checklist.items.find((i) => i.key === 'fastag')!
      expect(fastag.status).toBe('pending')
      // No fitness/permit/puc items can be derived without a Vahan snapshot.
      expect(checklist.items.some((i) => i.key === 'fitness')).toBe(false)
      expect(checklist.overall).toBe('pending')
    })

    it('should flag expired insurance from the Vahan snapshot', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(
        truckWithVahan({
          vahanDetails: {
            ...truckWithVahan().vahanDetails,
            insuranceValidUpto: futureIso(-10),
          },
        }),
      )

      const checklist = await service.getTruckCompliance('truck-1', OWNER, 'truck_owner')
      expect(checklist.items.find((i) => i.key === 'insurance')!.status).toBe('expired')
      expect(checklist.overall).toBe('expired')
    })

    it('should flag LowBalance FASTag as action_required', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(truckWithVahan({ fastagStatus: 'LowBalance' }))

      const checklist = await service.getTruckCompliance('truck-1', OWNER, 'truck_owner')
      expect(checklist.items.find((i) => i.key === 'fastag')!.status).toBe('action_required')
      expect(checklist.overall).toBe('action_required')
    })

    it('should surface inactive RC registrations as action_required', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(
        truckWithVahan({
          vahanDetails: { ...truckWithVahan().vahanDetails, registrationStatus: 'SUSPENDED' },
        }),
      )

      const checklist = await service.getTruckCompliance('truck-1', OWNER, 'truck_owner')
      const rc = checklist.items.find((i) => i.key === 'rc_vahan')!
      expect(rc.status).toBe('action_required')
    })
  })

  // ── Vahan validation flow ─────────────────────────────────────────────────

  describe('validateTruckRC', () => {
    it('should persist the snapshot and return the refreshed checklist on success', async () => {
      ;(prisma.truck.findUnique as jest.Mock)
        .mockResolvedValueOnce(truckWithVahan({ vahanValidatedAt: null, vahanDetails: null })) // pre-validation fetch
        .mockResolvedValueOnce(truckWithVahan()) // post-validation fetch
      ;(prisma.truck.update as jest.Mock).mockResolvedValueOnce({})
      vahan.validateRC.mockResolvedValueOnce({ valid: true, found: true, data: { registrationNumber: 'MH12QW8842' } })

      const result = await service.validateTruckRC('truck-1', OWNER, 'truck_owner')

      expect(vahan.validateRC).toHaveBeenCalledWith('MH12QW8842')
      expect(prisma.truck.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'truck-1' },
          data: expect.objectContaining({ vahanValidatedAt: expect.any(Date) }),
        }),
      )
      expect(result.validation.valid).toBe(true)
      expect(result.checklist.overall).toBe('compliant')
    })

    it('should keep the checklist pending and skip persistence when Vahan cannot find the RC', async () => {
      ;(prisma.truck.findUnique as jest.Mock)
        .mockResolvedValueOnce(truckWithVahan({ vahanValidatedAt: null, vahanDetails: null, fastagStatus: 'Unknown' }))
        .mockResolvedValueOnce(truckWithVahan({ vahanValidatedAt: null, vahanDetails: null, fastagStatus: 'Unknown' }))
      ;(prisma.truck.update as jest.Mock).mockResolvedValueOnce({})
      vahan.validateRC.mockResolvedValueOnce({ valid: false, found: false, error: 'RC not found in the Vahan database' })

      const result = await service.validateTruckRC('truck-1', OWNER, 'truck_owner')

      expect(result.validation.valid).toBe(false)
      expect(prisma.truck.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vahanDetails: undefined, vahanValidatedAt: null }),
        }),
      )
      expect(result.checklist.overall).toBe('pending')
    })
  })

  // ── FASTag ────────────────────────────────────────────────────────────────

  describe('updateFastag', () => {
    it('should persist the reported status and refresh the checklist', async () => {
      ;(prisma.truck.findUnique as jest.Mock)
        .mockResolvedValueOnce(truckWithVahan({ fastagStatus: 'Unknown' }))
        .mockResolvedValueOnce(truckWithVahan({ fastagStatus: 'Active' }))
      ;(prisma.truck.update as jest.Mock).mockResolvedValueOnce({ id: 'truck-1', fastagStatus: 'Active' })

      const result = await service.updateFastag('truck-1', OWNER, 'truck_owner', 'Active')

      expect(prisma.truck.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ fastagStatus: 'Active' }) }),
      )
      expect(result.truck.fastagStatus).toBe('Active')
      expect(result.checklist.items.find((i) => i.key === 'fastag')!.status).toBe('compliant')
    })

    it('should deny a stranger reporting FASTag status', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(truckWithVahan())
      await expect(service.updateFastag('truck-1', OTHER, 'truck_owner', 'Active')).rejects.toThrow(ForbiddenException)
    })
  })

  // ── Booking checklist & E-Way Bill ────────────────────────────────────────

  const bookingFixture = (overrides: Record<string, any> = {}) => ({
    id: 'bk-1',
    loadOwnerId: 'load-owner-1',
    truckOwnerId: OWNER,
    agreedPrice: 42000,
    createdAt: new Date(),
    ewayBillNumber: '381234567890',
    ewayBillStatus: 'Active',
    ewayBillValidUpto: new Date(Date.now() + 2 * 86400000),
    ewayBillUpdatedAt: new Date(),
    truck: truckWithVahan(),
    ...overrides,
  })

  describe('getBookingCompliance', () => {
    it('should include the E-Way Bill item and be visible to both parties', async () => {
      const booking = bookingFixture()
      ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(booking)

      const forOwner = await service.getBookingCompliance('bk-1', 'load-owner-1', 'load_owner')
      const forTrucker = await service.getBookingCompliance('bk-1', OWNER, 'truck_owner')

      expect(forOwner.items.map((i) => i.key)).toContain('eway_bill')
      expect(forOwner.items.find((i) => i.key === 'eway_bill')!.status).toBe('compliant')
      expect(forTrucker.items.map((i) => i.key)).toContain('eway_bill')
    })

    it('should mark a missing E-Way Bill as pending', async () => {
      ;(prisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(
        bookingFixture({ ewayBillNumber: null, ewayBillStatus: 'Pending', ewayBillValidUpto: null, ewayBillUpdatedAt: null }),
      )

      const checklist = await service.getBookingCompliance('bk-1', 'load-owner-1', 'load_owner')
      const eway = checklist.items.find((i) => i.key === 'eway_bill')!
      expect(eway.status).toBe('pending')
      expect(eway.detail).toContain('GST/NIC portal')
    })

    it('should mark an expired E-Way Bill validity as expired', async () => {
      ;(prisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(
        bookingFixture({ ewayBillValidUpto: new Date(Date.now() - 86400000) }),
      )

      const checklist = await service.getBookingCompliance('bk-1', 'load-owner-1', 'load_owner')
      expect(checklist.items.find((i) => i.key === 'eway_bill')!.status).toBe('expired')
      expect(checklist.overall).toBe('expired')
    })

    it('should deny unrelated users', async () => {
      ;(prisma.booking.findUnique as jest.Mock).mockResolvedValueOnce(bookingFixture())
      await expect(service.getBookingCompliance('bk-1', OTHER, 'load_owner')).rejects.toThrow(ForbiddenException)
    })
  })

  describe('updateEwayBill', () => {
    // Echo the update payload back like Prisma would return the updated row.
    const mockBookingUpdateEcho = (base: Record<string, any>) => {
      ;(prisma.booking.update as jest.Mock).mockImplementation(({ data }: any) =>
        Promise.resolve({ ...base, ...data }),
      )
    }

    it('should attach a valid 12-digit bill with computed expiry and refresh the checklist', async () => {
      const detached = bookingFixture({ ewayBillNumber: null, ewayBillStatus: 'Pending', ewayBillValidUpto: null, ewayBillUpdatedAt: null })
      ;(prisma.booking.findUnique as jest.Mock)
        .mockResolvedValueOnce(detached) // pre-update fetch
        .mockResolvedValueOnce(bookingFixture()) // checklist refetch
      mockBookingUpdateEcho(detached)

      const result = await service.updateEwayBill('bk-1', 'load-owner-1', 'load_owner', '381234567890')

      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ewayBillNumber: '381234567890',
            ewayBillStatus: 'Active',
            ewayBillValidUpto: expect.any(Date),
          }),
        }),
      )
      expect(result.ewayBill.ewayBillStatus).toBe('Active')
      expect(result.checklist.items.find((i) => i.key === 'eway_bill')!.status).toBe('compliant')
    })

    it('should allow only the load owner (or admin) to manage the E-Way Bill', async () => {
      const booking = bookingFixture()
      ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(booking)
      mockBookingUpdateEcho(booking)
      await expect(service.updateEwayBill('bk-1', OWNER, 'truck_owner', '381234567890')).rejects.toThrow(ForbiddenException)
      await expect(service.updateEwayBill('bk-1', ADMIN, 'admin', '381234567890')).resolves.toBeTruthy()
    })

    it('should record a past validity as expired', async () => {
      const detached = bookingFixture({ ewayBillNumber: null, ewayBillStatus: 'Pending', ewayBillValidUpto: null })
      ;(prisma.booking.findUnique as jest.Mock)
        .mockResolvedValueOnce(detached)
        .mockResolvedValueOnce(bookingFixture({ ewayBillValidUpto: new Date(Date.now() - 5 * 86400000) }))
      mockBookingUpdateEcho(detached)

      const result = await service.updateEwayBill(
        'bk-1',
        'load-owner-1',
        'load_owner',
        '381234567890',
        futureIso(-5),
      )

      expect(result.ewayBill.ewayBillStatus).toBe('Expired')
    })

    it('should detach the bill when a null number is provided', async () => {
      const attached = bookingFixture()
      ;(prisma.booking.findUnique as jest.Mock)
        .mockResolvedValueOnce(attached) // pre-update fetch
        .mockResolvedValueOnce(
          bookingFixture({ ewayBillNumber: null, ewayBillStatus: 'Pending', ewayBillValidUpto: null, ewayBillUpdatedAt: null }),
        ) // checklist refetch
      mockBookingUpdateEcho(attached)

      const result = await service.updateEwayBill('bk-1', 'load-owner-1', 'load_owner', null)

      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ewayBillNumber: null, ewayBillStatus: 'Pending', ewayBillValidUpto: null }),
        }),
      )
      expect(result.checklist.items.find((i) => i.key === 'eway_bill')!.status).toBe('pending')
    })
  })
})
