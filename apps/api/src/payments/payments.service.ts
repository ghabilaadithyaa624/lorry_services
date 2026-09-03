import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { prisma, PaymentPurpose, PaymentStatus, SubscriptionStatus, BookingStatus } from '@lorrycarry/database'
import { CashfreeService } from './cashfree.service'
import { RazorpayService } from './razorpay.service'
import { v4 as uuidv4 } from 'uuid'

export interface BookingPaymentInitDto {
  bookingId: string
  paymentType: 'advance' | 'balance'
  paymentMethod?: 'upi' | 'card' | 'netbanking'
}

export interface TripCompletionDto {
  bookingId: string
  podDetails: {
    consigneeName: string
    podPhotoUrl?: string
    deliveryNotes?: string
  }
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(
    private cashfree: CashfreeService,
    private razorpay: RazorpayService
  ) {}

  /**
   * Initialize booking payment (advance or balance)
   * Creates a payment order with Razorpay or Cashfree
   */
  async initializeBookingPayment(userId: string, dto: BookingPaymentInitDto) {
    const { bookingId, paymentType, paymentMethod = 'upi' } = dto

    // Get booking details
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ loadOwnerId: userId }, { truckOwnerId: userId }],
      },
      include: {
        load: { include: { user: true } },
        truck: { include: { user: true } },
      },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found or access denied')
    }

    // Validate payment type
    if (paymentType === 'advance' && booking.advanceConfirmed) {
      throw new BadRequestException('Advance payment already confirmed')
    }
    if (paymentType === 'balance' && !booking.advanceConfirmed) {
      throw new BadRequestException('Advance payment must be completed before balance payment')
    }
    if (paymentType === 'balance' && booking.balanceConfirmed) {
      throw new BadRequestException('Balance payment already confirmed')
    }

    // Calculate amount (50/50 split)
    const totalPrice = Number(booking.agreedPrice)
    const advanceAmount = Math.round(totalPrice * 0.5)
    const balanceAmount = totalPrice - advanceAmount
    const amount = paymentType === 'advance' ? advanceAmount : balanceAmount

    // Determine payer and payee
    const isLoadOwner = booking.loadOwnerId === userId
    const payer = isLoadOwner ? booking.load.user : booking.truck.user
    const payee = isLoadOwner ? booking.truck.user : booking.load.user

    const purpose = paymentType === 'advance' ? PaymentPurpose.booking_advance : PaymentPurpose.booking_balance
    const orderId = `BOOK_${bookingId.slice(0, 8).toUpperCase()}_${paymentType.toUpperCase()}_${Date.now()}`

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        bookingId,
        amount,
        currency: 'INR',
        purpose,
        status: PaymentStatus.Pending,
        provider: 'razorpay',
        providerOrderId: orderId,
        paymentMethod: paymentMethod.toUpperCase(),
      },
    })

    // Try Razorpay first, fallback to Cashfree
    let paymentSession: any = null

    if (this.razorpay.isConfigured()) {
      // Create Razorpay order
      const razorpayOrder = await this.razorpay.createOrder({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt: orderId,
        notes: {
          bookingId,
          paymentType,
          userName: payer.name || 'Customer',
          userPhone: payer.phone,
        },
      })

      // Create payment link for easier payment
      const paymentLink = await this.razorpay.createPaymentLink({
        amount: amount * 100,
        currency: 'INR',
        description: `LorryCarry ${paymentType === 'advance' ? 'Loading Advance' : 'Delivery Balance'} - Booking #${bookingId.slice(0, 8)}`,
        customer: {
          name: payer.name || 'Customer',
          contact: payer.phone,
        },
        notify: { sms: true, email: true },
        reminder_enable: true,
      })

      // Update payment record
      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerTxnId: razorpayOrder.id },
      })

      paymentSession = {
        provider: 'razorpay',
        orderId: razorpayOrder.id,
        paymentLinkId: paymentLink.id,
        shortUrl: paymentLink.short_url,
        amount,
        currency: 'INR',
        paymentId: payment.id,
      }
    } else {
      // Use Cashfree as fallback
      const cashfreeOrder = await this.cashfree.createOrder({
        orderId,
        amount,
        customerId: userId,
        customerPhone: payer.phone,
        customerName: payer.name || undefined,
        description: `LorryCarry ${paymentType === 'advance' ? 'Loading Advance' : 'Delivery Balance'}`,
      })

      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerTxnId: cashfreeOrder.cfOrderId, provider: 'cashfree' },
      })

      paymentSession = {
        provider: 'cashfree',
        orderId: cashfreeOrder.orderId,
        paymentSessionId: cashfreeOrder.paymentSessionId,
        amount,
        currency: 'INR',
        paymentId: payment.id,
      }
    }

    this.logger.log(`Booking payment initialized: ${paymentType} for booking ${bookingId}, amount: ₹${amount}`)

    return {
      success: true,
      paymentId: payment.id,
      amount,
      totalPrice,
      advanceAmount,
      balanceAmount,
      paymentType,
      ...paymentSession,
    }
  }

  /**
   * Confirm booking payment (called after successful payment)
   */
  async confirmBookingPayment(paymentId: string, providerData: { transactionId: string; method?: string }) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    })

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    if (payment.status === PaymentStatus.Success) {
      return { success: true, message: 'Payment already confirmed', bookingId: payment.bookingId }
    }

    const isAdvance = payment.purpose === PaymentPurpose.booking_advance

    // Update payment status
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.Success,
        paidAt: new Date(),
        providerTxnId: providerData.transactionId,
        paymentMethod: providerData.method,
      },
    })

    // Update booking payment status
    const updateData: any = {}
    if (isAdvance) {
      updateData.advanceConfirmed = true
      updateData.advanceConfirmedAt = new Date()
    } else {
      updateData.balanceConfirmed = true
      updateData.balanceConfirmedAt = new Date()
    }

    const booking = await prisma.booking.update({
      where: { id: payment.bookingId },
      data: updateData,
    })

    this.logger.log(`Booking payment confirmed: ${payment.purpose} for booking ${payment.bookingId}`)

    return {
      success: true,
      bookingId: payment.bookingId,
      paymentType: isAdvance ? 'advance' : 'balance',
      bookingStatus: booking.status,
    }
  }

  /**
   * Complete trip - driver action that releases payment and triggers rating
   */
  async completeTrip(driverId: string, dto: TripCompletionDto) {
    const { bookingId, podDetails } = dto

    // Get booking with validation
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        truckOwnerId: driverId,
      },
      include: {
        load: { include: { user: true } },
        truck: { include: { user: true } },
      },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found or you are not authorized to complete this trip')
    }

    if (booking.status === BookingStatus.Completed) {
      throw new BadRequestException('Trip is already completed')
    }

    if (!booking.advanceConfirmed) {
      throw new BadRequestException('Advance payment must be confirmed before completing the trip')
    }

    // Complete the booking
    const completedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.Completed,
        completedAt: new Date(),
      },
    })

    // Update load status
    await prisma.load.update({
      where: { id: booking.loadId },
      data: { status: 'Completed' },
    })

    // Create payment record for balance if not already paid
    if (!booking.balanceConfirmed) {
      const balanceAmount = Number(booking.agreedPrice) - Math.round(Number(booking.agreedPrice) * 0.5)
      
      await prisma.payment.create({
        data: {
          userId: booking.loadOwnerId,
          bookingId: booking.id,
          amount: balanceAmount,
          currency: 'INR',
          purpose: PaymentPurpose.booking_balance,
          status: PaymentStatus.Success,
          provider: 'pod_release',
          paidAt: new Date(),
          metadata: {
            releasedBy: 'trip_completion',
            podDetails,
            releasedAt: new Date().toISOString(),
          },
        },
      })

      // Mark balance as confirmed
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          balanceConfirmed: true,
          balanceConfirmedAt: new Date(),
        },
      })
    }

    // Create POD record (if checkpoint system supports it)
    await prisma.checkpoint.updateMany({
      where: { bookingId, seq: 5 },
      data: { 
        crossedAt: new Date(),
        crossedBy: driverId,
      },
    })

    this.logger.log(`Trip completed for booking ${bookingId} by driver ${driverId}`)

    return {
      success: true,
      bookingId,
      completedAt: completedBooking.completedAt,
      balanceReleased: !booking.balanceConfirmed,
      balanceAmount: !booking.balanceConfirmed 
        ? Number(booking.agreedPrice) - Math.round(Number(booking.agreedPrice) * 0.5)
        : 0,
      promptRating: true, // Flag to trigger rating modal on factory owner side
      factoryOwnerId: booking.loadOwnerId,
      driverId: booking.truckOwnerId,
    }
  }

  /**
   * Handle payment webhook from provider
   */
  async handleWebhook(providerOrPayload: 'razorpay' | 'cashfree' | any, maybePayload?: any): Promise<{ success: boolean; message: string; userId?: string }> {
    let provider: 'razorpay' | 'cashfree' = 'cashfree'
    let payload = providerOrPayload
    if (typeof providerOrPayload === 'string' && (providerOrPayload === 'razorpay' || providerOrPayload === 'cashfree')) {
      provider = providerOrPayload
      payload = maybePayload
    }
    if (provider === 'razorpay') {
      return this.handleRazorpayWebhook(payload)
    } else {
      return this.handleCashfreeWebhook(payload)
    }
  }

  private async handleRazorpayWebhook(payload: any) {
    const event = payload.event
    const paymentData = payload.payload?.payment?.entity || {}

    if (event === 'payment.captured') {
      const orderId = paymentData.order_id
      const transactionId = paymentData.id

      // Find payment by order ID
      const payment = await prisma.payment.findFirst({
        where: { providerOrderId: orderId },
      })

      if (payment) {
        await this.confirmBookingPayment(payment.id, {
          transactionId,
          method: paymentData.method,
        })
        return { success: true, message: 'Payment captured and confirmed' }
      }
    }

    return { success: true, message: `Event ${event} processed` }
  }

  private async handleCashfreeWebhook(payload: any) {
    const data = payload?.data || payload
    const order_id = data?.order_id || data?.order?.order_id
    const order_status = data?.order_status || data?.order?.order_status

    if (order_status === 'PAID') {
      const payment = await prisma.payment.findFirst({
        where: { providerOrderId: order_id },
      })

      if (payment) {
        await this.confirmBookingPayment(payment.id, {
          transactionId: data?.payment_details?.[0]?.payment_message || order_id,
        })
        return { success: true, message: 'Payment confirmed' }
      }
    }

    return { success: true, message: 'Webhook processed' }
  }

  /**
   * Get payment history for a booking
   */
  async getBookingPayments(bookingId: string, userId: string) {
    // Verify access
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [{ loadOwnerId: userId }, { truckOwnerId: userId }],
      },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found or access denied')
    }

    return prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Create subscription payment order
   */
  async createSubscriptionOrder(userId: string, plan: string, amount: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, name: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const orderId = `SUB_${uuidv4().slice(0, 8).toUpperCase()}`

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency: 'INR',
        purpose: PaymentPurpose.subscription,
        status: PaymentStatus.Pending,
        provider: 'cashfree',
        providerOrderId: orderId,
      },
    })

    // Create Cashfree order
    const order = await this.cashfree.createOrder({
      orderId,
      amount,
      customerId: userId,
      customerPhone: user.phone,
      customerName: user.name || undefined,
      description: `LorryCarry ${plan} Subscription`,
    })

    // Update payment with Cashfree order ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerTxnId: order.cfOrderId },
    })

    return {
      paymentId: payment.id,
      paymentSessionId: order.paymentSessionId,
      orderId: order.orderId,
    }
  }

  /**
   * Get user's payment history
   */
  async getPaymentHistory(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }
}
