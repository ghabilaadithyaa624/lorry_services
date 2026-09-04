import { SetMetadata } from '@nestjs/common'
import { UserRole } from '@prisma/client'

export const ROLES_KEY = 'roles'

/**
 * Decorator to specify required roles for a route
 * @example @Roles(UserRole.admin, UserRole.truck_driver)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)