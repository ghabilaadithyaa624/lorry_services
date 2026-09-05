import { IsString, IsEnum, IsIn, IsOptional, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from '@lorrycarry/database'
import { CANONICAL_ROLES, LEGACY_ROLE_MAP } from '../../common/utils/roles.util'

export enum OtpChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
}

export class RequestOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'Indian mobile number with country code' })
  @IsString()
  @Matches(/^(\+?91)?[6-9]\d{9}$/, { message: 'Invalid Indian mobile number format. Use: +919876543210' })
  phone: string

  @ApiProperty({ enum: OtpChannel, required: false, default: OtpChannel.WHATSAPP })
  @IsEnum(OtpChannel)
  @IsOptional()
  channel?: OtpChannel
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^(\+?91)?[6-9]\d{9}$/, { message: 'Invalid Indian mobile number format' })
  phone: string

  @ApiProperty({ example: '123456', description: '6-digit OTP' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string

  /**
   * Canonical roles: factory_owner | truck_driver | admin.
   * Legacy labels (load_owner, truck_owner, driver) are still accepted from
   * older clients and normalized server-side by `normalizeRole`.
   */
  @ApiProperty({
    enum: [...CANONICAL_ROLES, ...Object.keys(LEGACY_ROLE_MAP)],
    required: false,
    description: 'Required for new users. Legacy role labels are accepted and normalized.',
  })
  @IsIn([...CANONICAL_ROLES, ...Object.keys(LEGACY_ROLE_MAP)])
  @IsOptional()
  role?: UserRole
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string
}