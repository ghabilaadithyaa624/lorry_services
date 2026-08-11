import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  Ip,
  Headers,
  UnauthorizedException,
  UseGuards 
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService, OtpChannel } from './auth.service'
import { RequestOtpDto, VerifyOtpDto, RefreshTokenDto } from './dto'
import { Public } from '../common/decorators/public.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP via WhatsApp or SMS' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async requestOtp(
    @Body() dto: RequestOtpDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    // Use WhatsApp by default, fallback to SMS
    const channel = dto.channel || OtpChannel.WHATSAPP
    
    const result = await this.authService.requestOtp(
      dto.phone,
      channel,
      ip
    )

    return {
      success: result.success,
      message: result.message,
      channel: result.channel,
      isExistingUser: result.isExistingUser,
      // Only include devOtp in non-production
      ...(result.devOtp && { devOtp: result.devOtp }),
    }
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and get JWT tokens' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Ip() ip: string
  ) {
    return this.authService.verifyOtp(
      dto.phone,
      dto.otp,
      dto.role,
      ip
    )
  }

  @Public()
  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken)
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke tokens' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken)
    return { success: true, message: 'Logged out successfully' }
  }

  @Post('logout-all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout from all devices / revoke all active sessions' })
  @ApiResponse({ status: 200, description: 'All active sessions revoked' })
  async logoutAll(@CurrentUser('id') userId: string) {
    await this.authService.logoutAll(userId)
    return { success: true, message: 'All active sessions have been revoked successfully' }
  }
}