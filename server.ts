import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// In-Memory Secure Reset Token Store (1-hour TTL)
interface ResetTokenRecord {
  token: string;
  code: string;
  email: string;
  expiresAt: number;
  used: boolean;
}
const resetTokensStore = new Map<string, ResetTokenRecord>();

// Middleware for parsing JSON requests
app.use(express.json());

// Nodemailer Gmail Transporter Configuration
const SMTP_USER = process.env.SMTP_USER || 'tanmayrajaura28@gmail.com';
const SMTP_PASS = (process.env.SMTP_PASS || 'awkw exnj ijew bkru').replace(/\s+/g, '');
const SENDER_NAME = process.env.SENDER_NAME || 'vahaanflowos';
const SENDER_EMAIL = `"${SENDER_NAME}" <${SMTP_USER}>`;

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Nodemailer transporter connection error:', error);
  } else {
    console.log(`✅ Nodemailer connected successfully to Gmail [${SMTP_USER}] as "${SENDER_NAME}"`);
  }
});

// 1. Generic Send Email API
app.post('/api/send-email', async (req: Request, res: Response) => {
  try {
    const { to, subject, html, text } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ success: false, error: 'Recipient "to" and "subject" are required.' });
    }

    const mailOptions = {
      from: SENDER_EMAIL,
      to,
      subject,
      text: text || '',
      html: html || `<p>${text || subject}</p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending generic email:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to send email' });
  }
});

// 2. Welcome Email API (For Car Owners & Customers)
app.post('/api/auth/send-welcome-email', async (req: Request, res: Response) => {
  try {
    const { email, name, role, phone, upiId, drivingLicense } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const isOwner = role === 'vehicle_owner';
    const roleTitle = isOwner ? 'Car Owner' : 'Customer (Rent a Car)';
    const subject = isOwner 
      ? `Welcome to VahaanFlow - Your Car Owner Account is Active!` 
      : `Welcome to VahaanFlow - Ready to Rent & Drive!`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #e5e5e5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #171717; border-radius: 16px; border: 1px solid #262626; overflow: hidden; }
          .header { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 28px 24px; }
          .welcome-box { background-color: #262626; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #404040; }
          .field-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
          .field-label { color: #a3a3a3; }
          .field-val { color: #ffffff; font-weight: 600; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; ${isOwner ? 'background-color: #064e3b; color: #34d399;' : 'background-color: #1e3a8a; color: #60a5fa;'} }
          .footer { padding: 20px 24px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #262626; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #10b981; color: #022c22; font-weight: bold; text-decoration: none; border-radius: 8px; margin-top: 16px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>व VahaanFlow</h1>
            <p>Smart Car Rental & Fleet Operations</p>
          </div>
          <div class="content">
            <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Welcome, ${name || 'User'}! 🎉</h2>
            <p style="color: #d4d4d4; font-size: 14px; line-height: 1.6;">
              Your account has been successfully created as a <span class="badge">${roleTitle}</span>.
            </p>

            <div class="welcome-box">
              <div class="field-row">
                <span class="field-label">Account Category:</span>
                <span class="field-val">${roleTitle}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Registered Email:</span>
                <span class="field-val">${email}</span>
              </div>
              ${phone ? `
              <div class="field-row">
                <span class="field-label">Phone Number:</span>
                <span class="field-val">${phone}</span>
              </div>` : ''}
              ${isOwner && upiId ? `
              <div class="field-row">
                <span class="field-label">Payout UPI ID:</span>
                <span class="field-val" style="color: #34d399;">${upiId}</span>
              </div>` : ''}
              ${!isOwner && drivingLicense ? `
              <div class="field-row">
                <span class="field-label">Driving Licence:</span>
                <span class="field-val">${drivingLicense}</span>
              </div>` : ''}
            </div>

            ${isOwner ? `
            <p style="color: #a3a3a3; font-size: 13px; line-height: 1.5;">
              🚗 <strong>Next Steps:</strong> You can now add your cars to your fleet, set your daily pricing, block dates for personal use, and track your daily bookings & bank payouts.
            </p>
            ` : `
            <p style="color: #a3a3a3; font-size: 13px; line-height: 1.5;">
              🔑 <strong>Next Steps:</strong> Browse our verified fleet of petrol, diesel, and electric cars. Book instantly with transparent per-km billing and start your road trip.
            </p>
            `}

            <div style="text-align: center; margin-top: 24px;">
              <a href="https://vahaanflow.in" class="btn">Open VahaanFlow Dashboard</a>
            </div>
          </div>
          <div class="footer">
            Sent with ❤️ by <strong>${SENDER_NAME}</strong><br>
            Official Support: tanmayrajaura28@gmail.com
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: SENDER_EMAIL,
      to: email,
      subject,
      html,
    });

    console.log(`✅ Welcome email sent to ${email} (messageId: ${info.messageId})`);
    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending welcome email:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to send welcome email' });
  }
});

// 3. Password Updated Confirmation Email API (No raw password leaked in email)
app.post('/api/auth/send-password-updated-email', async (req: Request, res: Response) => {
  try {
    const { email, userName } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const subject = `Your VahaanFlow Password Has Been Successfully Updated`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; margin: 0; padding: 20px; }
          .container { max-width: 550px; margin: 0 auto; background-color: #171717; border-radius: 16px; border: 1px solid #262626; overflow: hidden; }
          .header { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 24px; text-align: center; color: #ffffff; }
          .content { padding: 24px; }
          .status-box { background-color: #064e3b; border: 1px solid #059669; border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0; color: #34d399; font-weight: bold; }
          .footer { padding: 16px 24px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #262626; }
          .btn { display: inline-block; padding: 10px 20px; background-color: #10b981; color: #022c22; font-weight: bold; text-decoration: none; border-radius: 6px; margin-top: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin:0;">VahaanFlow Security Alert</h2>
          </div>
          <div class="content">
            <h3 style="color:#ffffff; margin-top:0;">Hello ${userName || 'Valued User'},</h3>
            <div class="status-box">
              ✅ Password Successfully Updated
            </div>
            <p style="color:#d4d4d4; font-size:13px; line-height:1.6;">
              Your account password for <strong>${email}</strong> was recently updated to your new customized password.
            </p>
            <p style="color:#a3a3a3; font-size:12px; line-height:1.5;">
              You can now sign in to VahaanFlow using your new customized password anytime.
            </p>
            <div style="text-align: center; margin: 18px 0;">
              <a href="https://vahaanflow.in" class="btn">Sign In to VahaanFlow</a>
            </div>
            <p style="color:#737373; font-size:11px; margin-top: 18px; border-top: 1px solid #262626; pt: 12px;">
              🛡️ <em>Security Notice: If you did not make this change, please contact support immediately at tanmayrajaura28@gmail.com.</em>
            </p>
          </div>
          <div class="footer">
            Sent by <strong>${SENDER_NAME}</strong> (tanmayrajaura28@gmail.com)
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: SENDER_EMAIL,
      to: email,
      subject,
      html,
    });

    console.log(`✅ Password updated confirmation email sent to ${email}`);
    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending password update confirmation email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3b. Send Password Reset Link & Code Email
app.post('/api/auth/send-reset-link', async (req: Request, res: Response) => {
  try {
    const { email, origin } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit verification OTP
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour validity

    const tokenRecord: ResetTokenRecord = {
      token,
      code,
      email: cleanEmail,
      expiresAt,
      used: false,
    };

    resetTokensStore.set(token, tokenRecord);
    resetTokensStore.set(code, tokenRecord);

    // Compute public accessible base URL (avoids internal aistudio.google.com 403 error)
    let baseUrl = 'https://ais-pre-k2zjwm3ysduz62wq3ftvfz-950987348502.asia-east1.run.app';
    if (process.env.APP_URL && !process.env.APP_URL.includes('MY_APP_URL') && !process.env.APP_URL.includes('aistudio.google.com')) {
      baseUrl = process.env.APP_URL;
    } else if (origin && !origin.includes('aistudio.google.com')) {
      baseUrl = origin;
    }

    const resetLink = `${baseUrl}/?reset_token=${token}&email=${encodeURIComponent(cleanEmail)}`;

    const subject = `Your VahaanFlow Password Reset Code: ${code}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; margin: 0; padding: 20px; }
          .container { max-width: 540px; margin: 0 auto; background-color: #171717; border-radius: 16px; border: 1px solid #262626; overflow: hidden; }
          .header { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
          .content { padding: 28px 24px; }
          .otp-box { background-color: #09090b; border: 2px solid #10b981; border-radius: 14px; padding: 24px; text-align: center; margin: 22px 0; }
          .otp-code { font-size: 40px; font-weight: 800; color: #34d399; letter-spacing: 12px; font-family: monospace; }
          .step-box { background-color: #262626; border-radius: 10px; padding: 14px; margin: 18px 0; font-size: 12px; color: #d4d4d4; }
          .footer { padding: 18px 24px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #262626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size:22px;">🔑 VahaanFlow Password Reset</h1>
            <p style="margin:6px 0 0 0; font-size:13px; opacity:0.9;">Secure Verification Code</p>
          </div>
          <div class="content">
            <h3 style="color:#ffffff; margin-top:0;">Hello,</h3>
            <p style="color:#d4d4d4; font-size:13px; line-height:1.6;">
              We received a request to reset the password for your VahaanFlow account (<strong>${cleanEmail}</strong>).
            </p>

            <!-- 6-Digit OTP Code -->
            <div class="otp-box">
              <div style="font-size: 11px; color: #94a3b8; font-weight: bold; letter-spacing: 2px; margin-bottom: 8px;">YOUR 6-DIGIT VERIFICATION CODE</div>
              <div class="otp-code">${code}</div>
              <div style="font-size: 12px; color: #cbd5e1; margin-top: 12px; font-weight: 500;">
                Valid for 60 minutes
              </div>
            </div>

            <!-- Simple Steps -->
            <div class="step-box">
              <strong>How to reset your password:</strong>
              <ol style="margin: 8px 0 0 0; padding-left: 18px; line-height: 1.6;">
                <li>Return to your open <strong>VahaanFlow</strong> window</li>
                <li>Enter the <strong>6-digit code</strong> shown above</li>
                <li>Create and confirm your <strong>New Customized Password</strong></li>
                <li>Click <strong>Set New Password</strong> to login</li>
              </ol>
            </div>

            <p style="color:#737373; font-size:11px; margin-top:16px; border-top:1px solid #262626; padding-top:12px;">
              🛡️ If you did not request this password reset, you can safely ignore this email. Your account remains completely secure.
            </p>
          </div>
          <div class="footer">
            Sent by <strong>${SENDER_NAME}</strong> (tanmayrajaura28@gmail.com)
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: SENDER_EMAIL,
      to: cleanEmail,
      subject,
      html,
    });

    console.log(`✅ Secure password reset code [${code}] & link sent to ${cleanEmail}`);
    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending reset link email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3c. Verify token or 6-digit code validity
app.post('/api/auth/verify-reset-token', (req: Request, res: Response) => {
  const { token, code, email } = req.body;
  const lookupKey = token || code;
  if (!lookupKey) {
    return res.status(400).json({ valid: false, error: 'Verification token or 6-digit code is required' });
  }

  const record = resetTokensStore.get(lookupKey.toString().trim());
  if (!record) {
    return res.status(404).json({ valid: false, error: 'Invalid or expired password reset code / link.' });
  }
  if (record.used) {
    return res.status(400).json({ valid: false, error: 'This reset code / link has already been used.' });
  }
  if (Date.now() > record.expiresAt) {
    resetTokensStore.delete(record.token);
    resetTokensStore.delete(record.code);
    return res.status(400).json({ valid: false, error: 'This reset code / link has expired. Please request a new one.' });
  }
  if (email && record.email.toLowerCase() !== email.trim().toLowerCase()) {
    return res.status(400).json({ valid: false, error: 'Email mismatch for this reset code / link.' });
  }

  return res.json({ valid: true, email: record.email, token: record.token });
});

// 3d. Invalidate token after successful reset
app.post('/api/auth/invalidate-reset-token', (req: Request, res: Response) => {
  const { token, code } = req.body;
  const lookupKey = token || code;
  if (lookupKey && resetTokensStore.has(lookupKey.toString().trim())) {
    const record = resetTokensStore.get(lookupKey.toString().trim())!;
    record.used = true;
    resetTokensStore.set(record.token, record);
    resetTokensStore.set(record.code, record);
  }
  return res.json({ success: true });
});

// 4. Booking Confirmation Email API
app.post('/api/bookings/send-confirmation-email', async (req: Request, res: Response) => {
  try {
    const { booking, vehicle } = req.body;
    if (!booking || !booking.customer?.email) {
      return res.status(400).json({ success: false, error: 'Booking and customer email required' });
    }

    const customerEmail = booking.customer.email;
    const subject = `Booking Confirmed: ${booking.bookingCode} - ${vehicle?.make || 'Car'} ${vehicle?.model || ''}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e5e5e5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #171717; border-radius: 16px; border: 1px solid #262626; overflow: hidden; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
          .content { padding: 24px; }
          .card { background-color: #262626; border-radius: 12px; padding: 18px; margin-bottom: 16px; border: 1px solid #333333; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .label { color: #a3a3a3; }
          .val { color: #ffffff; font-weight: 600; }
          .footer { padding: 16px 24px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #262626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size:22px;">Booking Confirmed! 🚗</h1>
            <p style="margin:4px 0 0 0; font-size:13px;">Code: <strong>${booking.bookingCode}</strong></p>
          </div>
          <div class="content">
            <h3 style="color:#ffffff; margin-top:0;">Dear ${booking.customer.name},</h3>
            <p style="color:#d4d4d4; font-size:13px;">Your car booking has been confirmed with VahaanFlow. Details below:</p>

            <div class="card">
              <div class="row">
                <span class="label">Vehicle:</span>
                <span class="val">${vehicle?.make || ''} ${vehicle?.model || ''} (${vehicle?.year || ''})</span>
              </div>
              <div class="row">
                <span class="label">Number Plate:</span>
                <span class="val" style="color:#34d399; font-family:monospace;">${vehicle?.plateNumber || 'Assigned on delivery'}</span>
              </div>
              <div class="row">
                <span class="label">Start Date:</span>
                <span class="val">${new Date(booking.startDate).toLocaleString('en-IN')}</span>
              </div>
              <div class="row">
                <span class="label">End Date:</span>
                <span class="val">${new Date(booking.endDate).toLocaleString('en-IN')}</span>
              </div>
              <div class="row">
                <span class="label">Estimated Total:</span>
                <span class="val" style="color:#34d399;">₹${booking.costs?.finalCost || booking.costs?.baseRate || 0}</span>
              </div>
              <div class="row">
                <span class="label">Security Deposit:</span>
                <span class="val">₹${booking.securityDeposit?.amount || 5000}</span>
              </div>
            </div>

            <p style="color:#a3a3a3; font-size:12px;">
              Please carry your original Driving Licence and Aadhaar card at the time of key handover.
            </p>
          </div>
          <div class="footer">
            Sent by <strong>${SENDER_NAME}</strong> (tanmayrajaura28@gmail.com)
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: SENDER_EMAIL,
      to: customerEmail,
      subject,
      html,
    });

    console.log(`✅ Booking confirmation email sent for ${booking.bookingCode} to ${customerEmail}`);
    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending booking confirmation email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Admin Activity Notification API (Sends instant alerts to tanmayrajaura28@gmail.com for owner/customer actions)
app.post('/api/admin/notify-activity', async (req: Request, res: Response) => {
  try {
    const { eventTitle, actorName, actorRole, actorEmail, detailsHtml, summaryText } = req.body;
    const adminEmail = 'tanmayrajaura28@gmail.com';

    const subject = `[VahaanFlow Alert] ${eventTitle} - ${actorName || 'User'}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #e5e5e5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #171717; border-radius: 16px; border: 1px solid #262626; overflow: hidden; }
          .header { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 24px; text-align: center; color: #ffffff; }
          .header h2 { margin: 0; font-size: 20px; font-weight: 800; }
          .content { padding: 24px; }
          .alert-box { background-color: #262626; border-radius: 12px; padding: 18px; margin: 16px 0; border: 1px solid #404040; }
          .field-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .field-label { color: #a3a3a3; }
          .field-val { color: #ffffff; font-weight: 600; }
          .footer { padding: 16px 24px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #262626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🛡️ VahaanFlow Admin Alert</h2>
            <p style="margin:4px 0 0 0; font-size:12px; opacity:0.9;">Platform Operations & Activity Log</p>
          </div>
          <div class="content">
            <h3 style="color: #34d399; margin-top: 0; font-size: 16px;">${eventTitle}</h3>
            <p style="color: #d4d4d4; font-size: 13px;">An important action was performed on the platform:</p>
            
            <div class="alert-box">
              <div class="field-row">
                <span class="field-label">Action By:</span>
                <span class="field-val">${actorName || 'User'} (${actorEmail || 'N/A'})</span>
              </div>
              <div class="field-row">
                <span class="field-label">Role:</span>
                <span class="field-val">${actorRole || 'Member'}</span>
              </div>
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #404040; color: #e5e5e5; font-size: 13px; line-height: 1.5;">
                ${detailsHtml || summaryText || 'Activity logged on platform.'}
              </div>
            </div>

            <p style="color: #737373; font-size: 11px;">Admin Recipient: tanmayrajaura28@gmail.com</p>
          </div>
          <div class="footer">
            VahaanFlow Admin Notification System &middot; tanmayrajaura28@gmail.com
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: SENDER_EMAIL,
      to: adminEmail,
      subject,
      html,
    });

    console.log(`✅ Admin activity alert email sent to ${adminEmail} for ${eventTitle}`);
    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending admin activity notification email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Transporter Health Check Endpoint
app.get('/api/email-health', async (_req: Request, res: Response) => {
  try {
    await transporter.verify();
    return res.json({
      status: 'healthy',
      senderName: SENDER_NAME,
      senderEmail: SMTP_USER,
      message: 'Nodemailer Gmail SMTP is ready and operational.',
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'unhealthy',
      error: err.message,
    });
  }
});

// Vite Development or Static Production Middleware
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT} with Nodemailer (Sender: ${SENDER_NAME})`);
  });
}

startServer();
