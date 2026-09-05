import { INestApplication, NotFoundException, ServiceUnavailableException, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { AddressInfo } from 'node:net'
import { JwtStrategy } from '../auth/jwt.strategy'
import { ReturnLoadsController } from './return-loads.controller'
import { ReturnLoadsService } from './return-loads.service'

const mockFindUser = jest.fn()
jest.mock('@lorrycarry/database', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => mockFindUser(...args) } },
}))

const TRUCK_ID = '4518ce1f-7472-4b16-a169-fd991cab9c37'
const CALLER_ID = '96f727a0-6160-4140-915f-05bc7cf9c1ed'
const SECRET = 'return-load-controller-test-only'

describe('ReturnLoadsController HTTP contract (real JWT guard and validation pipe)', () => {
  let app: INestApplication
  let baseUrl: string
  const jwt = new JwtService({ secret: SECRET })
  const service = { getReturnLoadsForTruck: jest.fn() }
  const payload = { opportunities: [], radiusKm: 50, contactUnlocked: false }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReturnLoadsController],
      providers: [
        { provide: ReturnLoadsService, useValue: service },
        { provide: ConfigService, useValue: { get: () => SECRET } },
        JwtStrategy,
      ],
    }).compile()
    app = module.createNestApplication()
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.listen(0, '0.0.0.0')
    baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api/v1`
  })

  afterAll(async () => { await app?.close() })
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindUser.mockResolvedValue({ id: CALLER_ID, role: 'truck_driver' })
    service.getReturnLoadsForTruck.mockResolvedValue(payload)
  })

  const request = (query = '', prefix = 'matching', token = jwt.sign({ sub: CALLER_ID })) =>
    fetch(`${baseUrl}/${prefix}/truck/${TRUCK_ID}/return-loads${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

  it.each(['matching', 'matches'])('serves /%s and forwards the authenticated identity, never a query-supplied user', async (prefix) => {
    const response = await request('?userId=someone-else', prefix)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual(payload)
    expect(service.getReturnLoadsForTruck).toHaveBeenCalledWith(TRUCK_ID, CALLER_ID, {
      radiusKm: undefined, limit: undefined, minScore: undefined,
      destinationLat: undefined, destinationLng: undefined,
    })
  })

  it('transforms and forwards all supported parameters, including zero coordinates and scores', async () => {
    const response = await request('?radius=12.5&limit=5&minScore=0&destinationLat=0&destinationLng=0')
    expect(response.status).toBe(200)
    expect(service.getReturnLoadsForTruck).toHaveBeenCalledWith(TRUCK_ID, CALLER_ID, {
      radiusKm: 12.5, limit: 5, minScore: 0, destinationLat: 0, destinationLng: 0,
    })
  })

  it.each([
    'radius=51', 'radius=300', 'radius=0', 'radius=-1', 'radius=NaN', 'radius=Infinity',
    'radius=abc', 'radius=', 'radius=%20', 'radius=10&radius=20',
    'limit=0', 'limit=51', 'limit=1.5', 'limit=NaN', 'minScore=-1', 'minScore=101', 'minScore=',
    'destinationLat=12', 'destinationLng=77', 'destinationLat=91&destinationLng=77',
    'destinationLat=12&destinationLng=181', 'destinationLat=&destinationLng=0',
    'destinationLat=NaN&destinationLng=0', 'destinationLat=0&destinationLng=Infinity',
    'destinationLat=0&destinationLat=1&destinationLng=0',
  ])('rejects invalid query %s before discovery', async (query) => {
    const response = await request(`?${query}`)
    expect(response.status).toBe(400)
    expect(service.getReturnLoadsForTruck).not.toHaveBeenCalled()
  })

  it('requires a valid truck UUID', async () => {
    const response = await fetch(`${baseUrl}/matching/truck/not-a-uuid/return-loads`, {
      headers: { Authorization: `Bearer ${jwt.sign({ sub: CALLER_ID })}` },
    })
    expect(response.status).toBe(400)
    expect(service.getReturnLoadsForTruck).not.toHaveBeenCalled()
  })

  it.each(['', 'invalid-token', jwt.sign({ sub: CALLER_ID }, { expiresIn: -1 })])('rejects absent, invalid and expired credentials', async (token) => {
    const response = await request('', 'matching', token)
    expect(response.status).toBe(401)
    expect(service.getReturnLoadsForTruck).not.toHaveBeenCalled()
  })

  it('rejects a token belonging to a deleted user', async () => {
    mockFindUser.mockResolvedValueOnce(null)
    expect((await request()).status).toBe(401)
    expect(service.getReturnLoadsForTruck).not.toHaveBeenCalled()
  })

  it.each([
    [new NotFoundException('Truck not found'), 404],
    [new ServiceUnavailableException('Return-load discovery is temporarily unavailable'), 503],
  ])('preserves service error status', async (error, status) => {
    service.getReturnLoadsForTruck.mockRejectedValueOnce(error)
    expect((await request()).status).toBe(status)
  })
})
