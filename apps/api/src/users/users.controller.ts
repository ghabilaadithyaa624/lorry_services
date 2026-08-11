import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { UpdateUserDto } from './dto/update-user.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and account statistics' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId)
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update user name or profile details' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto
  ) {
    return this.usersService.updateProfile(userId, dto)
  }

  @Get('documents')
  @ApiOperation({ summary: 'Get all KYC vehicle documents for current user' })
  @ApiResponse({ status: 200, description: 'Documents retrieved with presigned URLs' })
  async getDocuments(@CurrentUser('id') userId: string) {
    return this.usersService.getDocuments(userId)
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get user chronological activity history across loads, trucks, and bookings' })
  @ApiResponse({ status: 200, description: 'Activity history retrieved successfully' })
  async getActivity(@CurrentUser('id') userId: string) {
    return this.usersService.getActivity(userId)
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get notifications and operational alerts' })
  @ApiResponse({ status: 200, description: 'Notifications list retrieved' })
  async getNotifications(@CurrentUser('id') userId: string) {
    return this.usersService.getNotifications(userId)
  }
}
