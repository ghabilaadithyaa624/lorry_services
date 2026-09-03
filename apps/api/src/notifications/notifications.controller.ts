import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { UsersService } from '../users/users.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { MarkNotificationReadDto } from './dto/mark-notification-read.dto'

/**
 * Notification centre API.
 *
 * Feed and read-state are owned by UsersService so derived alerts (pending KYC,
 * unconfirmed advance, checkpoint crossings) remain visible alongside persisted
 * WhatsApp notifications. `NotificationsService` is responsible for creating the
 * persisted rows and dispatching outbound WhatsApp messages.
 */
@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get notification centre feed with read/unread state' })
  async getNotifications(@CurrentUser('id') userId: string) {
    return this.usersService.getNotifications(userId)
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get the number of unread notifications' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const { unreadCount } = await this.usersService.getNotifications(userId)
    return { unreadCount }
  }

  @Post('read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markRead(
    @CurrentUser('id') userId: string,
    @Body() dto: MarkNotificationReadDto,
  ) {
    return this.usersService.markNotificationRead(userId, dto.notificationKey)
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark every notification in the feed as read' })
  async markAllRead(@CurrentUser('id') userId: string) {
    return this.usersService.markAllNotificationsRead(userId)
  }
}
