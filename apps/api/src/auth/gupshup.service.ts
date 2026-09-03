import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

/**
 * Gupshup Service for WhatsApp OTP
 * Uses Meta's Cloud API via Gupshup BSP (Business Service Provider)
 * More reliable than SMS in India, higher open rates
 * Docs: https://www.gupshup.io/developer/docs
 */
@Injectable()
export class GupshupService {
  private readonly logger = new Logger(GupshupService.name)
  private readonly baseUrl = 'https://api.gupshup.io/sm/api/v1'

  constructor(private config: ConfigService) {}

  async sendOtp(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
    const appId = this.config.get<string>('GUPSHUP_APP_ID')
    const appToken = this.config.get<string>('GUPSHUP_APP_TOKEN')
    const templateName = 'otp_verification' // Must be pre-approved template

    if (!appId || !appToken) {
      this.logger.warn('Gupshup credentials not configured, using dev mode')
      return { success: true, message: 'Dev mode - WhatsApp OTP not sent' }
    }

    // Ensure phone has country code
    const to = phone.startsWith('+') ? phone : `+${phone}`

    try {
      const response = await axios.post(
        `${this.baseUrl}/template/msg`,
        {
          app: appId,
          sender: '919876543210', // Your Gupshup-approved WhatsApp number
          phone: to,
          template: {
            name: templateName,
            params: [otp], // {{1}} in template
          },
        },
        {
          headers: {
            'apikey': appToken,
            'Content-Type': 'application/json',
          },
        }
      )

      this.logger.log(`Gupshup OTP sent to ${to}, response: ${JSON.stringify(response.data)}`)

      return {
        success: response.data.status === 'success',
        message: response.data.message || 'WhatsApp OTP sent'
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`Gupshup failed: ${error.message}`, error.response?.data)
        return {
          success: false,
          message: error.response?.data?.message || 'Failed to send WhatsApp'
        }
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Gupshup failed: ${errorMessage}`)
      return { success: false, message: 'Failed to send WhatsApp' }
    }
  }

  /**
   * Send rich notification (for booking updates, checkpoint alerts)
   */
  async sendNotification(
    phone: string, 
    templateName: string, 
    params: string[]
  ): Promise<{ success: boolean; message: string; providerMsgId?: string }> {
    const appId = this.config.get<string>('GUPSHUP_APP_ID')
    const appToken = this.config.get<string>('GUPSHUP_APP_TOKEN')
    const sender = this.config.get<string>('GUPSHUP_SENDER', '919876543210')

    if (!appId || !appToken) {
      this.logger.warn('Gupshup notification skipped: credentials not configured')
      return { success: false, message: 'Gupshup not configured' }
    }

    const to = phone.startsWith('+') ? phone : `+${phone}`

    try {
      const response = await axios.post(
        `${this.baseUrl}/template/msg`,
        {
          app: appId,
          sender,
          phone: to,
          template: {
            name: templateName,
            params,
          },
        },
        { headers: { 'apikey': appToken } }
      )

      const providerMsgId =
        response.data?.messageId ||
        response.data?.messageID ||
        response.data?.id ||
        (typeof response.data === 'string' ? response.data : undefined)

      return {
        success: response.data.status === 'success',
        message: response.data.message || 'Notification sent',
        providerMsgId: providerMsgId ? String(providerMsgId) : undefined,
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`Gupshup notification failed: ${error.message}`, error.response?.data)
        return { success: false, message: error.response?.data?.message || 'Failed to send notification' }
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Gupshup notification failed: ${errorMessage}`)
      return { success: false, message: 'Failed to send notification' }
    }
  }

  /**
   * Handle incoming webhooks from Gupshup
   */
  async handleWebhook(payload: any): Promise<void> {
    this.logger.log(`Gupshup webhook: ${JSON.stringify(payload)}`)
    
    // Handle message delivery status, replies, etc.
    if (payload.type === 'message') {
      // Store delivery receipt
    }
  }
}
