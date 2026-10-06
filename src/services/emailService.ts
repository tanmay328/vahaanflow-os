import { auth } from './firebase';

export interface WelcomeEmailParams {
  name: string;
  role: 'admin' | 'vehicle_owner' | 'renter';
  phone?: string;
  upiId?: string;
  drivingLicense?: string;
}

export interface BookingEmailParams {
  booking: any;
  vehicle: any;
}

export class EmailService {
  private static async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Could not get Firebase auth token for email service:', err);
    }
    return headers;
  }

  // Send Welcome Email upon registration
  static async sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/auth/send-welcome-email', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Welcome email fetch failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Send Password Updated Confirmation Email
  static async sendPasswordUpdatedConfirmation(userName?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/auth/send-password-updated-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userName }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Password updated confirmation email fetch failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Send Booking Confirmation Email
  static async sendBookingConfirmation(params: BookingEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/bookings/send-confirmation-email', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Booking confirmation email fetch failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Send Admin Notification Email
  static async notifyAdmin(params: {
    eventTitle: string;
    actorName: string;
    actorRole: string;
    actorEmail?: string;
    detailsHtml?: string;
    summaryText?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const headers = await this.getAuthHeaders();
      const res = await fetch('/api/admin/notify-activity', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Admin notification email fetch error:', err);
      return { success: false, error: err.message };
    }
  }

  // Check email backend status
  static async checkHealth(): Promise<{ status: string; senderName?: string; senderEmail?: string; error?: string }> {
    try {
      const res = await fetch('/api/email-health');
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { status: 'offline', error: err.message };
    }
  }
}
