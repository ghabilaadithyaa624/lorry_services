import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

/**
 * MSG91 Service for SMS OTP
 * DLT-compliant for India (required for commercial SMS)
 * Docs: https://docs.msg91.com/
 */
@Injectable()
export class Msg91Service {
  private readonly logger = new Logger(Msg91Service.name)
  private readonly baseUrl = 'https://api.msg91.com/api/v5'

  constructor(private config: ConfigService) {}

  async sendOtp(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
    const authKey = this.config.get<string>('MSG91_API_KEY')
    const senderId = this.config.get<string>('MSG91_SENDER_ID', 'LORRYC')
    const templateId = this.config.get<string>('MSG91_TEMPLATE_ID')

    if (!authKey) {
      this.logger.warn('MSG91_API_KEY not configured, using dev mode')
      return { success: true, message: 'Dev mode - OTP not sent' }
    }

    // Remove +91 if present for MSG91
    const mobile = phone.replace(/^\+91/, '')

    try {
      const response = await axios.post(
        `${this.baseUrl}/otp`,
        {
          mobile,
          otp,
          sender: senderId,
          template_id: templateId,
          otp_length: 6,
          otp_expiry: 600, // 10 minutes
        },
        {
          headers: {
            'authkey': authKey,
            'Content-Type': 'application/json',
          },
        }
      )

      this.logger.log(`MSG91 OTP sent to ${phone}, response: ${JSON.stringify(response.data)}`)
      
      return { 
        success: response.data.type === 'success',
        message: response.data.message || 'OTP sent successfully'
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`MSG91 failed: ${error.message}`, error.response?.data)
        return {
          success: false,
          message: error.response?.data?.message || 'Failed to send SMS'
        }
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`MSG91 failed: ${errorMessage}`)
      return { 
        success: false, 
        message: 'Failed to send SMS'
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`MSG91 failed: ${errorMessage}`)
      return { success: false, message: 'Failed to send SMS' }
    }
  }

  async resendOtp(phone: string, retryType: 'text' | 'voice' = 'text'): Promise<{ success: boolean; message: string }> {
    const authKey = this.config.get<string>('MSG91_API_KEY')
    const mobile = phone.replace(/^\+91/, '')

    if (!authKey) {
      return { success: false, message: 'MSG91 not configured' }
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/otp/retry`,
        { mobile, retrytype: retryType },
        { headers: { 'authkey': authKey } }
      )

      return { 
        success: response.data.type === 'success',
        message: response.data.message
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`MSG91 resend failed: ${error.message}`)
        return { success: false, message: error.response?.data?.message || 'Resend failed' }
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`MSG91 resend failed: ${errorMessage}`)
      return { success: false, message: 'Resend failed' }
    }
  }

  async verifyOtp(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
    const authKey = this.config.get<string>('MSG91_API_KEY')
    const mobile = phone.replace(/^\+91/, '')

    if (!authKey) {
      // Dev mode: skip verification
      return { success: true, message: 'Dev mode - verification skipped' }
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/otp/verify`,
        { mobile, otp },
        { headers: { 'authkey': authKey } }
      )

      return { 
        success: response.data.type === 'success',
        message: response.data.message
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`MSG91 verify failed: ${errorMessage}`)
      return { success: false, message: 'Invalid OTP' }
    }
  }
}
