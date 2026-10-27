import axios from 'axios';

interface SendSmsResult {
  success: boolean;
  message: string;
  requestId?: string;
  raw?: unknown;
}

export class SmsService {
  private apiUrl: string;
  private authKey: string;
  private senderId: string;
  private route: string;
  private isDevelopment: boolean;

  constructor() {
    this.apiUrl = process.env.BLACKSMS_API_URL || 'https://blacksms.in/sms';
    this.authKey = process.env.BLACKSMS_AUTH_KEY || '';
    this.senderId = process.env.BLACKSMS_SENDER_ID || '424';
    this.route = process.env.BLACKSMS_ROUTE || '1';
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Send 6-digit OTP to Indian mobile number via BlackSMS
   */
  async sendOtp(mobileNumber: string, otp: string): Promise<SendSmsResult> {
    // Clean mobile number (strip +91, spaces, dashes)
    const cleanNumber = mobileNumber.replace(/\D/g, '').slice(-10);

    if (cleanNumber.length !== 10) {
      throw new Error('Invalid mobile number. 10-digit Indian mobile number required.');
    }

    if (this.isDevelopment) {
      console.log(`\n========================================`);
      console.log(`[SMS SERVICE] Sending OTP to: ${cleanNumber}`);
      console.log(`[SMS SERVICE] Generated OTP: ${otp}`);
      console.log(`========================================\n`);
    }

    if (!this.authKey) {
      const message = 'BLACKSMS_AUTH_KEY is not configured in server environment.';
      if (this.isDevelopment) {
        console.warn('[SMS SERVICE] Continuing in development mode with console OTP.');
        return {
          success: true,
          message: 'Development fallback: OTP logged to server console.'
        };
      }
      return { success: false, message };
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          sender_id: this.senderId,
          route: this.route,
          variables_values: otp,
          numbers: cleanNumber
        },
        {
          headers: {
            'Authorization': this.authKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const data = response.data;
      console.log('[SMS RAW RESPONSE]', data);
      const isSuccess = data?.return === true || data?.return === 'true' || data?.status === 1 || data?.status === 'success' || Boolean(data?.request_id);

      return {
        success: isSuccess,
        message: Array.isArray(data?.message) ? data.message.join(', ') : (data?.message || 'SMS sent successfully'),
        requestId: data?.request_id,
        raw: data
      };
    } catch (error: any) {
      console.error('[SMS SERVICE ERROR]', error?.response?.data || error?.message || error);
      
      // If SMS gateway fails or balance is low during development, don't block user testing
      if (this.isDevelopment) {
        console.warn('[SMS SERVICE] Continuing in development mode with console OTP.');
        return {
          success: true,
          message: 'Development fallback: OTP logged to server console.',
          requestId: 'dev_mode_' + Date.now()
        };
      }

      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Failed to dispatch SMS'
      };
    }
  }
}

export const smsService = new SmsService();
