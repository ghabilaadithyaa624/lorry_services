/**
 * Role-based access control coverage for the `transporter` role.
 *
 * Transporters operate on BOTH sides of the marketplace: they can post freight
 * loads AND list trucks, view the whole marketplace, and edit/delete ONLY their
 * own posts. These tests assert:
 *
 *   1. transporter can create a load        (route allows the role + service creates)
 *   2. transporter can create a truck        (route allows the role + service creates)
 *   3. transporter can edit their own load    (ownership passes)
 *   4. transporter cannot edit another's load (ownership rejected)
 *   5. transporter can edit their own truck   (ownership passes)
 *   6. transporter cannot edit another's truck(ownership rejected)
 *
 * Route authorization is verified through the real RolesGuard against the
 * `@Roles(...)` metadata declared on the controllers, and ownership enforcement
 * is verified against the real service methods (with Prisma mocked).
 */
import { Reflector } from '@nestjs/core'
import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { UserRole } from '@prisma/client'

import { RolesGuard } from '../guards/roles.guard'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { LoadsController } from '../../loads/loads.controller'
import { TrucksController } from '../../trucks/trucks.controller'
import { LoadsService } from '../../loads/loads.service'
import { TrucksService } from '../../trucks/trucks.service'
import { prisma, LoadStatus } from '@lorrycarry/database'

jest.mock('@lorrycarry/database', () => {
  const actual = jest.requireActual('@lorrycarry/database')
  return {
    ...actual,
    prisma: {
      $executeRaw: jest.fn(),
      load: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      truck: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    },
  }
})

/**
 * Drive the real RolesGuard the way Nest would for a given controller handler,
 * so the assertion reflects the actual `@Roles(...)` metadata on the route.
 */
function canAccess(
  reflector: Reflector,
  controller: any,
  handlerName: string,
  role: UserRole,
): boolean {
  const guard = new RolesGuard(reflector)
  const handler = controller.prototype[handlerName]
  const context = {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 'u-1', role } }),
    }),
  } as unknown as ExecutionContext

  return guard.canActivate(context)
}

describe('Transporter RBAC', () => {
  const reflector = new Reflector()

  const geo = { geocodeAddress: jest.fn(), calculateDistance: jest.fn().mockReturnValue(840) }
  const vahan = {
    isValidRegistrationFormat: jest.fn().mockReturnValue(true),
    validateRC: jest.fn().mockResolvedValue({ valid: false, found: false, source: 'unavailable' }),
    toPersistableSnapshot: jest.fn().mockReturnValue(null),
  }
  const s3 = { validateFile: jest.fn(), uploadFile: jest.fn() }

  let loadsService: LoadsService
  let trucksService: TrucksService

  beforeEach(() => {
    jest.clearAllMocks()
    loadsService = new LoadsService(geo as any)
    trucksService = new TrucksService(geo as any, vahan as any, s3 as any)
  })

  describe('route authorization (@Roles metadata via RolesGuard)', () => {
    it('allows transporter to reach the create-load route', () => {
      expect(canAccess(reflector, LoadsController, 'create', UserRole.transporter)).toBe(true)
      // sanity: factory_owner still allowed, truck_driver still blocked
      expect(canAccess(reflector, LoadsController, 'create', UserRole.factory_owner)).toBe(true)
      expect(() =>
        canAccess(reflector, LoadsController, 'create', UserRole.truck_driver),
      ).toThrow(ForbiddenException)
    })

    it('allows transporter to reach the create-truck route', () => {
      expect(canAccess(reflector, TrucksController, 'create', UserRole.transporter)).toBe(true)
      // sanity: truck_driver still allowed, factory_owner still blocked
      expect(canAccess(reflector, TrucksController, 'create', UserRole.truck_driver)).toBe(true)
      expect(() =>
        canAccess(reflector, TrucksController, 'create', UserRole.factory_owner),
      ).toThrow(ForbiddenException)
    })

    it('declares transporter on every load management route', () => {
      for (const handler of ['create', 'findMyLoads', 'updateStatus', 'delete']) {
        const roles: UserRole[] = reflector.get(ROLES_KEY, (LoadsController.prototype as any)[handler])
        expect(roles).toContain(UserRole.transporter)
      }
    })

    it('declares transporter on every truck management route', () => {
      for (const handler of ['create', 'uploadDocument', 'findMyTrucks', 'updateLocation']) {
        const roles: UserRole[] = reflector.get(ROLES_KEY, (TrucksController.prototype as any)[handler])
        expect(roles).toContain(UserRole.transporter)
      }
    })
  })

  describe('load management', () => {
    const dto = {
      tonnageRequired: 20,
      loadingAddress: 'JNPT, Navi Mumbai',
      loadingPin: '400707',
      unloadingAddress: 'Electronic City, Bangalore',
      unloadingPin: '560100',
      truckType: 'Container' as any,
    }

    it('transporter can create a load', async () => {
      geo.geocodeAddress
        .mockResolvedValueOnce({ lat: 18.94, lng: 72.94 })
        .mockResolvedValueOnce({ lat: 12.84, lng: 77.66 })
      ;(prisma.load.create as jest.Mock).mockResolvedValueOnce({ id: 'load-1', userId: 'transporter-1' })

      const result = await loadsService.create('transporter-1', dto as any)

      expect(prisma.load.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'transporter-1' }) }),
      )
      expect(result.id).toBe('load-1')
    })

    it('transporter can edit their OWN load', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'load-1',
        userId: 'transporter-1',
        status: LoadStatus.Open,
      })
      ;(prisma.load.update as jest.Mock).mockResolvedValueOnce({
        id: 'load-1',
        status: LoadStatus.Cancelled,
      })

      const result = await loadsService.updateStatus(
        'load-1',
        'transporter-1',
        LoadStatus.Cancelled,
        UserRole.transporter,
      )

      expect(result.status).toBe(LoadStatus.Cancelled)
      expect(prisma.load.update).toHaveBeenCalled()
    })

    it("transporter CANNOT edit another user's load", async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'load-2',
        userId: 'someone-else',
        status: LoadStatus.Open,
      })

      await expect(
        loadsService.updateStatus('load-2', 'transporter-1', LoadStatus.Cancelled, UserRole.transporter),
      ).rejects.toThrow(ForbiddenException)
      expect(prisma.load.update).not.toHaveBeenCalled()
    })

    it("transporter CANNOT delete another user's load", async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'load-2',
        userId: 'someone-else',
        status: LoadStatus.Open,
      })

      await expect(
        loadsService.delete('load-2', 'transporter-1', UserRole.transporter),
      ).rejects.toThrow(ForbiddenException)
      expect(prisma.load.delete).not.toHaveBeenCalled()
    })
  })

  describe('truck management', () => {
    const dto = {
      registrationNumber: 'MH04KT7788',
      bodyType: 'Container' as any,
      lengthFt: 32,
      heightFt: 8,
      tonnageCapacity: 22,
      currentLocationAddress: 'Navi Mumbai',
    }

    it('transporter can create a truck', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce(null) // no duplicate registration
      geo.geocodeAddress.mockResolvedValueOnce({ lat: 18.94, lng: 72.94 })
      ;(prisma.truck.create as jest.Mock).mockResolvedValueOnce({ id: 'truck-1', userId: 'transporter-1' })

      const result = await trucksService.create('transporter-1', dto as any)

      expect(prisma.truck.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'transporter-1' }) }),
      )
      expect(result.id).toBe('truck-1')
    })

    it('transporter can edit their OWN truck', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'truck-1',
        userId: 'transporter-1',
      })
      geo.geocodeAddress.mockResolvedValueOnce({ lat: 19.07, lng: 72.87 })
      ;(prisma.truck.update as jest.Mock).mockResolvedValueOnce({ id: 'truck-1', currentLat: 19.07, currentLng: 72.87 })

      const result = await trucksService.updateLocation(
        'truck-1',
        'transporter-1',
        'Mumbai',
        UserRole.transporter,
      )

      expect(result.id).toBe('truck-1')
      expect(prisma.truck.update).toHaveBeenCalled()
    })

    it("transporter CANNOT edit another user's truck", async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'truck-2',
        userId: 'someone-else',
      })

      await expect(
        trucksService.updateLocation('truck-2', 'transporter-1', 'Mumbai', UserRole.transporter),
      ).rejects.toThrow(ForbiddenException)
      expect(prisma.truck.update).not.toHaveBeenCalled()
    })

    it("transporter CANNOT upload documents to another user's truck", async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'truck-2',
        userId: 'someone-else',
      })

      await expect(
        trucksService.uploadDocument(
          'truck-2',
          'transporter-1',
          { buffer: Buffer.from('x'), mimetype: 'application/pdf', originalname: 'rc.pdf', size: 10 } as any,
          'RC',
          'MH04RC1',
          UserRole.transporter,
        ),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('admin override', () => {
    it('admin can edit any load regardless of ownership', async () => {
      ;(prisma.load.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'load-9',
        userId: 'someone-else',
        status: LoadStatus.Open,
      })
      ;(prisma.load.update as jest.Mock).mockResolvedValueOnce({ id: 'load-9', status: LoadStatus.Matched })

      const result = await loadsService.updateStatus('load-9', 'admin-1', LoadStatus.Matched, UserRole.admin)
      expect(result.status).toBe(LoadStatus.Matched)
    })

    it('admin can edit any truck regardless of ownership', async () => {
      ;(prisma.truck.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'truck-9', userId: 'someone-else' })
      geo.geocodeAddress.mockResolvedValueOnce({ lat: 19.07, lng: 72.87 })
      ;(prisma.truck.update as jest.Mock).mockResolvedValueOnce({ id: 'truck-9' })

      const result = await trucksService.updateLocation('truck-9', 'admin-1', 'Mumbai', UserRole.admin)
      expect(result.id).toBe('truck-9')
    })
  })
})
