export interface WelcomeEmailParams {
  name: string;
  email: string;
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
  // Send Welcome Email upon registration
  static async sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Welcome email fetch failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Send Secure Password Reset Link via Email (vahaanflowos)
  static async sendPasswordResetLink(email: string, origin?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/send-reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          origin: origin || (typeof window !== 'undefined' ? window.location.origin : undefined) 
        }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Send reset link fetch failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Verify Reset Token
  static async verifyResetToken(token: string, email?: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/verify-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  // Invalidate Reset Token
  static async invalidateResetToken(token: string): Promise<void> {
    try {
      await fetch('/api/auth/invalidate-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      console.warn('Token invalidation error:', err);
    }
  }

  // Send Password Updated Confirmation Email (No raw password leaked in email)
  static async sendPasswordUpdatedConfirmation(email: string, userName?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await fetch('/api/auth/send-password-updated-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userName }),
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
      const res = await fetch('/api/bookings/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Booking confirmation email fetch failed:', err);
      return { success: false, error: err.message };
    }
  }

  // Send Admin Notification Email to tanmayrajaura28@gmail.com
  static async notifyAdmin(params: {
    eventTitle: string;
    actorName: string;
    actorRole: string;
    actorEmail: string;
    detailsHtml?: string;
    summaryText?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/notify-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Admin notification email fetch error:', err);
      return { success: false, error: err.message };
    }
  }

  // Send Custom / Generic Email
  static async sendCustomEmail(params: { to: string; subject: string; html?: string; text?: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.warn('Custom email fetch failed:', err);
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
