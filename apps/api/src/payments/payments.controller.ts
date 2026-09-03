import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Request } from 'express'
import { PaymentsService, BookingPaymentInitDto, TripCompletionDto } from './payments.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Initialize booking payment (advance or balance)
   */
  @Post('booking/initialize')
  @ApiOperation({ summary: 'Initialize booking payment (advance or balance split)' })
  async initializeBookingPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: BookingPaymentInitDto,
  ) {
    return this.paymentsService.initializeBookingPayment(userId, dto)
  }

  /**
   * Confirm booking payment after successful payment
   */
  @Patch('booking/:paymentId/confirm')
  @ApiOperation({ summary: 'Confirm booking payment' })
  async confirmBookingPayment(
    @Param('paymentId') paymentId: string,
    @Body() body: { transactionId: string; method?: string },
  ) {
    return this.paymentsService.confirmBookingPayment(paymentId, body)
  }

  /**
   * Get payments for a specific booking
   */
  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Get booking payment history' })
  async getBookingPayments(
    @Param('bookingId') bookingId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.getBookingPayments(bookingId, userId)
  }

  /**
   * Complete trip - driver action
   * Triggers payment release and notifies factory owner for rating
   */
  @Post('trip/complete')
  @ApiOperation({ summary: 'Complete trip and release balance payment' })
  async completeTrip(
    @CurrentUser('id') userId: string,
    @Body() dto: TripCompletionDto,
  ) {
    return this.paymentsService.completeTrip(userId, dto)
  }

  /**
   * Get user's payment history
   */
  @Get('history')
  @ApiOperation({ summary: 'Get user payment history' })
  async getPaymentHistory(@CurrentUser('id') userId: string) {
    return this.paymentsService.getPaymentHistory(userId)
  }

  /**
   * Initialize subscription payment
   */
  @Post('subscription/initialize')
  @ApiOperation({ summary: 'Initialize subscription payment' })
  async createSubscriptionOrder(
    @CurrentUser('id') userId: string,
    @Body() body: { plan: string; amount: number },
  ) {
    return this.paymentsService.createSubscriptionOrder(userId, body.plan, body.amount)
  }
}
