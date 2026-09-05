import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from '@lorrycarry/database'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { normalizeRole } from '../utils/roles.util'

/**
 * Roles Guard - Check if user has required role
 * Use after JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard)
 * Then specify roles: @Roles(UserRole.admin)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true // No roles required
    }

    const { user } = context.switchToHttp().getRequest()
    
    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    // Normalize so tokens/sessions still carrying legacy labels
    // (load_owner / truck_owner / driver) resolve to their canonical role.
    const userRole = normalizeRole(user.role) ?? user.role
    const hasRole = requiredRoles.some((role) => userRole === normalizeRole(role as string))
    
    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`)
    }

    return true
  }
}