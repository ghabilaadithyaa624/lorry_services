import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { prisma } from '@lorrycarry/database'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    })
  }

  async validate(payload: { sub: string; phone: string; role: string }) {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, phone: true, name: true, role: true },
    })
    
    if (!user) {
      throw new UnauthorizedException()
    }
    
    return user // Attached to Request as req.user
  }
}
