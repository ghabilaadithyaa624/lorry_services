import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt.strategy'
import { Msg91Service } from './msg91.service'
import { GupshupService } from './gupshup.service'
import { RateLimitService } from './rate-limit.service'
import { OtpStorageService } from './otp-storage.service'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRY', '7d') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, Msg91Service, GupshupService, RateLimitService, OtpStorageService],
  exports: [AuthService, Msg91Service, GupshupService, RateLimitService, OtpStorageService],
})
export class AuthModule {}
