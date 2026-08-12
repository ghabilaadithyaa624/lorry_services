import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from './roles.guard'
import { ROLES_KEY } from '../decorators/roles.decorator'

describe('RolesGuard (Admin Authorization)', () => {
  let guard: RolesGuard
  let reflector: jest.Mocked<Reflector>

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any

    guard = new RolesGuard(reflector)
  })

  it('should allow access if no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined)
    
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: null }),
      }),
    } as unknown as ExecutionContext

    expect(guard.canActivate(context)).toBe(true)
  })

  it('should throw ForbiddenException if user is not authenticated', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin'])
    
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: null }),
      }),
    } as unknown as ExecutionContext

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })

  it('should throw ForbiddenException if normal user accesses admin route', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin'])
    
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: { role: 'load_owner' } }),
      }),
    } as unknown as ExecutionContext

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException)
  })

  it('should allow access if admin user accesses admin route', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin'])
    
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: { role: 'admin' } }),
      }),
    } as unknown as ExecutionContext

    expect(guard.canActivate(context)).toBe(true)
  })
})
