import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/**
 * Decorator to get current user from JWT payload
 * @example @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: keyof any | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user
    
    return data ? user?.[data] : user
  }
)