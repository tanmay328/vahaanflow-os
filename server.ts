import express, { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!saKey) {
    console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing. Server-side Firebase operations will not have admin credentials.');
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } else {
    try {
      const parsedKey = typeof saKey === 'string' ? JSON.parse(saKey) : saKey;
      initializeApp({
        credential: cert(parsedKey),
        projectId: firebaseConfig.projectId,
      });
      console.log('✅ Firebase Admin SDK initialized with FIREBASE_SERVICE_ACCOUNT_KEY for project:', firebaseConfig.projectId);
    } catch (e: any) {
      console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT_KEY contains invalid JSON:', e.message);
      initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// SMTP Configuration from process.env ONLY
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : undefined;
const SENDER_NAME = process.env.SENDER_NAME || 'GoDrive';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const APP_URL = process.env.APP_URL || '';

const isEmailConfigured = Boolean(SMTP_USER && SMTP_PASS);

if (!isEmailConfigured) {
  console.warn('⚠️ SMTP_USER or SMTP_PASS is missing in environment variables. Email sending is disabled (503 Service Unavailable).');
}

export const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

if (transporter && SMTP_USER) {
  transporter.verify((error) => {
    if (error) {
      console.warn('⚠️ Nodemailer SMTP verification notice:', error.message);
    } else {
      console.log(`✅ Nodemailer connected successfully to SMTP as "${SENDER_NAME}"`);
    }
  });
}

// Authentication Middleware via Firebase ID Token
export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

async function authenticateFirebaseToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid authorization token.' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Empty token provided.' });
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error: any) {
    console.warn('❌ Firebase ID token verification failed:', error.message);
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token.' });
  }
}

// In-Memory Rate Limiter (10 requests per minute per user/IP)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function emailRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const key = req.user?.uid || req.ip || 'anonymous';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;

  const current = rateLimitMap.get(key);
  if (!current || now > current.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  if (current.count >= maxRequests) {
    return res.status(429).json({ success: false, error: 'Too many email requests. Please try again later.' });
  }

  current.count++;
  next();
}

function checkEmailConfig(req: Request, res: Response, next: NextFunction) {
  if (!transporter || !SMTP_USER) {
    return res.status(503).json({ success: false, error: 'Email is not configured' });
  }
  next();
}

function escapeHtml(value: any): string {
  if (value == null) return '';
  const str = String(value).slice(0, 500);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeSubject(value: any): string {
  if (value == null) return '';
  const str = String(value).slice(0, 500);
  return str.replace(/[\r\n]/g, ' ');
}

// 1. Welcome Email API (For Car Owners & Customers - recipient fixed to verified user email)
app.post('/api/auth/send-welcome-email', authenticateFirebaseToken, checkEmailConfig, emailRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(400).json({ success: false, error: 'Authenticated user email not found.' });
    }

    const { name, role, phone, upiId, drivingLicense } = req.body;
    const isOwner = role === 'vehicle_owner';
    const roleTitle = isOwner ? 'Car Owner' : 'Customer (Rent a Car)';
    
    const safeName = escapeHtml(name || 'User');
    const safeRoleTitle = escapeHtml(roleTitle);
    const safeUserEmail = escapeHtml(userEmail);
    const safePhone = escapeHtml(phone);
    const safeUpiId = escapeHtml(upiId);
    const safeDrivingLicense = escapeHtml(drivingLicense);

    const rawSubject = isOwner 
      ? `Welcome to GoDrive - Your Car Owner Account is Active!` 
      : `Welcome to GoDrive - Ready to Rent & Drive!`;
    const subject = sanitizeSubject(rawSubject);

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
            <h1>GoDrive</h1>
            <p>Smart Car Rental & Fleet Operations</p>
          </div>
          <div class="content">
            <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Welcome, ${safeName}! 🎉</h2>
            <p style="color: #d4d4d4; font-size: 14px; line-height: 1.6;">
              Your account has been successfully created as a <span class="badge">${safeRoleTitle}</span>.
            </p>

            <div class="welcome-box">
              <div class="field-row">
                <span class="field-label">Account Category:</span>
                <span class="field-val">${safeRoleTitle}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Registered Email:</span>
                <span class="field-val">${safeUserEmail}</span>
              </div>
              ${phone ? `
              <div class="field-row">
                <span class="field-label">Phone Number:</span>
                <span class="field-val">${safePhone}</span>
              </div>` : ''}
              ${isOwner && upiId ? `
              <div class="field-row">
                <span class="field-label">Payout UPI ID:</span>
                <span class="field-val" style="color: #34d399;">${safeUpiId}</span>
              </div>` : ''}
              ${!isOwner && drivingLicense ? `
              <div class="field-row">
                <span class="field-label">Driving Licence:</span>
                <span class="field-val">${safeDrivingLicense}</span>
              </div>` : ''}
            </div>

            ${isOwner ? `
            <p style="color: #a3a3a3; font-size: 13px; line-height: 1.5;">
              🚗 <strong>Next Steps:</strong> You can now add your cars to your fleet, set your daily pricing, and track your daily bookings & bank payouts.
            </p>
            ` : `
            <p style="color: #a3a3a3; font-size: 13px; line-height: 1.5;">
              🔑 <strong>Next Steps:</strong> Browse our verified fleet of petrol, diesel, and electric cars. Book instantly with transparent per-km billing and start your road trip.
            </p>
            `}

            <div style="text-align: center; margin-top: 24px;">
              <a href="${APP_URL || '#'}" class="btn">Open GoDrive Dashboard</a>
            </div>
          </div>
          <div class="footer">
            Sent by <strong>${escapeHtml(SENDER_NAME)}</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter!.sendMail({
      from: `"${SENDER_NAME}" <${SMTP_USER}>`,
      to: userEmail,
      subject,
      html,
    });

    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending welcome email:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to send welcome email' });
  }
});

// 1.5. Sign-in Alert / Notification Email API (recipient fixed to verified user email)
app.post('/api/auth/send-login-notification', authenticateFirebaseToken, checkEmailConfig, emailRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(400).json({ success: false, error: 'Authenticated user email not found.' });
    }

    const { userName, role } = req.body;
    const safeName = escapeHtml(userName || req.user?.name || 'Valued User');
    const safeRole = escapeHtml(role === 'vehicle_owner' ? 'Car Owner' : (role === 'admin' ? 'Platform Administrator' : 'Customer (Renter)'));
    const safeEmail = escapeHtml(userEmail);

    // Format login time in Asia/Kolkata
    const loginTime = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date());

    const subject = sanitizeSubject(`GoDrive Security: New sign-in to your account`);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #e5e5e5; margin: 0; padding: 20px; }
          .container { max-width: 560px; margin: 0 auto; background-color: #171717; border-radius: 16px; border: 1px solid #262626; overflow: hidden; }
          .header { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
          .header p { margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 24px; }
          .box { background-color: #262626; border-radius: 12px; padding: 18px; margin: 18px 0; border: 1px solid #404040; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .label { color: #a3a3a3; }
          .val { color: #ffffff; font-weight: 600; }
          .alert-box { background-color: rgba(6, 78, 59, 0.2); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 14px; margin-top: 18px; font-size: 12px; color: #a7f3d0; line-height: 1.5; }
          .footer { padding: 18px 24px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #262626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Sign-in Notice</h1>
            <p>GoDrive Account Security Alert</p>
          </div>
          <div class="content">
            <p style="font-size: 14px; margin-top: 0;">Hello <strong>${safeName}</strong>,</p>
            <p style="font-size: 13px; color: #d4d4d4; line-height: 1.5;">
              You have successfully signed in to your <strong>GoDrive</strong> account.
            </p>
            <div class="box">
              <div class="row">
                <span class="label">Account Email:</span>
                <span class="val">${safeEmail}</span>
              </div>
              <div class="row">
                <span class="label">Account Role:</span>
                <span class="val" style="color: #34d399;">${safeRole}</span>
              </div>
              <div class="row" style="margin-bottom: 0;">
                <span class="label">Sign-in Time (IST):</span>
                <span class="val">${escapeHtml(loginTime)}</span>
              </div>
            </div>
            <div class="alert-box">
              🔒 <strong>Security Note:</strong> If this was you, you can safely disregard this email. If you did not sign in or suspect unauthorized activity, please change your password immediately or contact GoDrive support.
            </div>
          </div>
          <div class="footer">
            Sent by <strong>${escapeHtml(SENDER_NAME)}</strong> · Account Security Notification
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter!.sendMail({
      from: `"${SENDER_NAME}" <${SMTP_USER}>`,
      to: userEmail,
      subject,
      html,
    });

    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending sign-in notification email:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to send sign-in notification email' });
  }
});

// 2. Password Updated Confirmation Email API (recipient fixed to verified user email)
app.post('/api/auth/send-password-updated-email', authenticateFirebaseToken, checkEmailConfig, emailRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(400).json({ success: false, error: 'Authenticated user email not found.' });
    }

    const { userName } = req.body;
    const safeUserName = escapeHtml(userName || 'Valued User');
    const safeUserEmail = escapeHtml(userEmail);

    const subject = sanitizeSubject('Your GoDrive Password Has Been Successfully Updated');
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
            <h2 style="margin:0; color:#ffffff;">GoDrive Security Alert</h2>
          </div>
          <div class="content">
            <h3 style="color:#ffffff; margin-top:0;">Hello ${safeUserName},</h3>
            <div class="status-box">
              ✅ Password Successfully Updated
            </div>
            <p style="color:#d4d4d4; font-size:13px; line-height:1.6;">
              Your account password for <strong>${safeUserEmail}</strong> was recently updated.
            </p>
            <p style="color:#a3a3a3; font-size:12px; line-height:1.5;">
              You can now sign in to GoDrive using your new password.
            </p>
            <div style="text-align: center; margin: 18px 0;">
              <a href="${APP_URL || '#'}" class="btn">Sign In to GoDrive</a>
            </div>
            <p style="color:#737373; font-size:11px; margin-top: 18px; border-top: 1px solid #262626; padding-top: 12px;">
              🛡️ <em>Security Notice: If you did not make this change, please reset your password immediately.</em>
            </p>
          </div>
          <div class="footer">
            Sent by <strong>${escapeHtml(SENDER_NAME)}</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter!.sendMail({
      from: `"${SENDER_NAME}" <${SMTP_USER}>`,
      to: userEmail,
      subject,
      html,
    });

    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending password update confirmation email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Booking Confirmation Email API (recipient is verified customer email on booking)
app.post('/api/bookings/send-confirmation-email', authenticateFirebaseToken, checkEmailConfig, emailRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { booking, vehicle } = req.body;
    if (!booking) {
      return res.status(400).json({ success: false, error: 'Booking details required.' });
    }

    // Recipient is the authenticated user's email or the booking customer email if matching
    const recipientEmail = req.user?.email || booking.customer?.email;
    if (!recipientEmail) {
      return res.status(400).json({ success: false, error: 'Recipient email not available.' });
    }

    const safeBookingCode = escapeHtml(booking.bookingCode || '');
    const safeCustomerName = escapeHtml(booking.customer?.name || 'Customer');
    const safeMake = escapeHtml(vehicle?.make || 'Car');
    const safeModel = escapeHtml(vehicle?.model || '');
    const safeYear = escapeHtml(vehicle?.year || '');
    const safePlate = escapeHtml(vehicle?.plateNumber || 'Assigned on delivery');
    const safeTotal = escapeHtml(booking.costs?.finalCost || booking.costs?.baseRate || 0);
    const safeDeposit = escapeHtml(booking.securityDeposit?.amount || 5000);

    const rawSubject = `Booking Confirmed: ${booking.bookingCode || ''} - ${vehicle?.make || 'Car'} ${vehicle?.model || ''}`;
    const subject = sanitizeSubject(rawSubject);

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
            <p style="margin:4px 0 0 0; font-size:13px;">Code: <strong>${safeBookingCode}</strong></p>
          </div>
          <div class="content">
            <h3 style="color:#ffffff; margin-top:0;">Dear ${safeCustomerName},</h3>
            <p style="color:#d4d4d4; font-size:13px;">Your car booking has been confirmed with GoDrive. Details below:</p>

            <div class="card">
              <div class="row">
                <span class="label">Vehicle:</span>
                <span class="val">${safeMake} ${safeModel} (${safeYear})</span>
              </div>
              <div class="row">
                <span class="label">Number Plate:</span>
                <span class="val" style="color:#34d399; font-family:monospace;">${safePlate}</span>
              </div>
              <div class="row">
                <span class="label">Start Date:</span>
                <span class="val">${booking.startDate ? escapeHtml(new Date(booking.startDate).toLocaleString('en-IN')) : 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">End Date:</span>
                <span class="val">${booking.endDate ? escapeHtml(new Date(booking.endDate).toLocaleString('en-IN')) : 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Estimated Total:</span>
                <span class="val" style="color:#34d399;">₹${safeTotal}</span>
              </div>
              <div class="row">
                <span class="label">Security Deposit:</span>
                <span class="val">₹${safeDeposit}</span>
              </div>
            </div>

            <p style="color:#a3a3a3; font-size:12px;">
              Please carry your original Driving Licence and Aadhaar card at the time of key handover.
            </p>
          </div>
          <div class="footer">
            Sent by <strong>${escapeHtml(SENDER_NAME)}</strong>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter!.sendMail({
      from: `"${SENDER_NAME}" <${SMTP_USER}>`,
      to: recipientEmail,
      subject,
      html,
    });

    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending booking confirmation email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 3b. Vehicle Submission Summary Email API (sent to car owner with full service specs & finalized rates, plus admin notification)
app.post('/api/vehicles/send-submission-summary', authenticateFirebaseToken, checkEmailConfig, emailRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { vehicle } = req.body;
    if (!vehicle) {
      return res.status(400).json({ success: false, error: 'Vehicle details required.' });
    }

    // Recipient is the authenticated user or vehicle owner
    const recipientEmail = req.user?.email || vehicle.ownerEmail;
    if (!recipientEmail) {
      return res.status(400).json({ success: false, error: 'Recipient email not available.' });
    }

    const safeMake = escapeHtml(vehicle.make || 'Car');
    const safeModel = escapeHtml(vehicle.model || '');
    const safeYear = escapeHtml(vehicle.year || '');
    const safePlate = escapeHtml(vehicle.licensePlate || 'N/A');
    const safeCategory = escapeHtml(vehicle.category || 'Standard');
    const safeFuel = escapeHtml(vehicle.fuelType || 'Petrol');
    const safeTransmission = escapeHtml(vehicle.transmission || 'Manual');
    const safeSeats = escapeHtml(vehicle.seatingCapacity || 5);
    const safeDailyRate = escapeHtml(vehicle.dailyRate || vehicle.suggestedDailyRate || 0);
    const safeHourlyRate = escapeHtml(vehicle.hourlyRate || Math.round(Number(vehicle.dailyRate || 0) / 8));
    const safeDeposit = escapeHtml(vehicle.depositAmount || 5000);
    const safeKmAllowance = escapeHtml(vehicle.kmAllowancePerDay || 300);
    const safeExcessKm = escapeHtml(vehicle.excessKmRate || 15);
    const safeCity = escapeHtml(vehicle.currentLocation?.city || 'Bengaluru');
    const safeHub = escapeHtml(vehicle.currentLocation?.hubName || 'City Hub');
    const safeOwnerName = escapeHtml(vehicle.ownerName || req.user?.name || 'Vehicle Partner');
    const safeOwnerEmail = escapeHtml(recipientEmail);
    const safeColor = escapeHtml(vehicle.color || 'Standard');
    const safeRc = escapeHtml(vehicle.documents?.skipped ? 'Skipped (Upload prior to rental)' : (vehicle.documents?.rcNumber || 'Standard RC'));
    const safeInsurance = escapeHtml(vehicle.documents?.insuranceExpiry || '2027-12-31');
    const safePuc = escapeHtml(vehicle.documents?.pucExpiry || '2027-12-31');
    const safePermit = escapeHtml(vehicle.documents?.permitType || 'Self-Drive');
    const blockedDatesCount = vehicle.blockedDates?.length || 0;
    const safeBlockedDates = blockedDatesCount > 0 
      ? escapeHtml(vehicle.blockedDates.slice(0, 10).join(', ') + (blockedDatesCount > 10 ? ` (+${blockedDatesCount - 10} more)` : ''))
      : 'None (Available 24x7)';

    const rawSubject = `GoDrive Listing Confirmation: ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate}) - Rates Finalized at ₹${safeDailyRate}/day`;
    const subject = sanitizeSubject(rawSubject);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #e5e5e5; margin: 0; padding: 20px; }
          .container { max-width: 620px; margin: 0 auto; background-color: #171717; border-radius: 16px; border: 1px solid #262626; overflow: hidden; }
          .header { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
          .content { padding: 24px; }
          .highlight-card { background: linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.05) 100%); border: 1px solid #10b981; border-radius: 14px; padding: 20px; margin-bottom: 20px; }
          .card { background-color: #212121; border-radius: 12px; padding: 18px; margin-bottom: 18px; border: 1px solid #333333; }
          .card-title { margin-top: 0; margin-bottom: 12px; font-size: 14px; font-weight: 700; color: #34d399; text-transform: uppercase; letter-spacing: 0.5px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 9px; font-size: 13px; }
          .label { color: #a3a3a3; }
          .val { color: #ffffff; font-weight: 600; }
          .rate-banner { font-size: 26px; font-weight: 800; color: #34d399; margin: 6px 0; }
          .service-item { display: flex; align-items: flex-start; margin-bottom: 10px; font-size: 12px; color: #d4d4d4; }
          .service-bullet { color: #10b981; font-weight: bold; margin-right: 8px; }
          .footer { padding: 18px 24px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #262626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size:22px;">🚗 Vehicle Listing Submission Confirmed</h1>
            <p style="margin:6px 0 0 0; font-size:13px; opacity:0.9;">GoDrive Partner Network • Finalized Service & Rates</p>
          </div>
          <div class="content">
            <h3 style="color:#ffffff; margin-top:0;">Dear ${safeOwnerName},</h3>
            <p style="color:#d4d4d4; font-size:13px; line-height:1.5;">
              Thank you for listing your vehicle with GoDrive! We have received your car listing details and the finalized rates you have chosen. Below is the full summary of your vehicle specifications, finalized pricing, and included platform services:
            </p>

            <!-- Finalized Rates Card -->
            <div class="highlight-card">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #10b981; letter-spacing: 0.5px;">Finalized Rates by Owner</span>
              <div class="rate-banner">₹${safeDailyRate} <span style="font-size: 14px; color: #a3a3a3; font-weight: 400;">/ day</span></div>
              <div style="font-size: 12px; color: #a3a3a3; margin-bottom: 12px;">Agreed Daily Rental Base Rate</div>
              
              <div class="row" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                <span class="label">Hourly Rate:</span>
                <span class="val" style="color:#34d399;">₹${safeHourlyRate}/hr</span>
              </div>
              <div class="row">
                <span class="label">Security Deposit:</span>
                <span class="val">₹${safeDeposit}</span>
              </div>
              <div class="row">
                <span class="label">Free Daily KM Allowance:</span>
                <span class="val">${safeKmAllowance} km/day</span>
              </div>
              <div class="row" style="margin-bottom:0;">
                <span class="label">Excess KM Rate:</span>
                <span class="val">₹${safeExcessKm}/km</span>
              </div>
            </div>

            <!-- Vehicle Details Card -->
            <div class="card">
              <div class="card-title">Vehicle Specifications</div>
              <div class="row">
                <span class="label">Car:</span>
                <span class="val">${safeMake} ${safeModel} (${safeYear})</span>
              </div>
              <div class="row">
                <span class="label">License Plate:</span>
                <span class="val" style="color:#34d399; font-family:monospace; font-weight:bold;">${safePlate}</span>
              </div>
              <div class="row">
                <span class="label">Category:</span>
                <span class="val">${safeCategory}</span>
              </div>
              <div class="row">
                <span class="label">Fuel / Powertrain:</span>
                <span class="val">${safeFuel}</span>
              </div>
              <div class="row">
                <span class="label">Transmission:</span>
                <span class="val">${safeTransmission}</span>
              </div>
              <div class="row">
                <span class="label">Seating:</span>
                <span class="val">${safeSeats} Seater</span>
              </div>
              <div class="row">
                <span class="label">Color:</span>
                <span class="val">${safeColor}</span>
              </div>
              <div class="row" style="margin-bottom:0;">
                <span class="label">Pickup Hub & City:</span>
                <span class="val">${safeHub}, ${safeCity}</span>
              </div>
            </div>

            <!-- Included Services Card -->
            <div class="card">
              <div class="card-title">Full Platform Services Included</div>
              <div class="service-item">
                <span class="service-bullet">✓</span>
                <span><strong>24x7 Roadside Assistance:</strong> Full pan-India emergency towing, flat-tyre and puncture support for every rental trip.</span>
              </div>
              <div class="service-item">
                <span class="service-bullet">✓</span>
                <span><strong>Comprehensive Rental Coverage:</strong> Commercial self-drive protection for accidental damage and third-party liabilities.</span>
              </div>
              <div class="service-item">
                <span class="service-bullet">✓</span>
                <span><strong>Verified Customer KYC:</strong> Every customer is strictly verified via Aadhaar & Driving License before vehicle handover.</span>
              </div>
              <div class="service-item">
                <span class="service-bullet">✓</span>
                <span><strong>Contactless FASTag Toll Settlement:</strong> Toll fees are automatically tracked and billed to the renter.</span>
              </div>
              <div class="service-item" style="margin-bottom:0;">
                <span class="service-bullet">✓</span>
                <span><strong>Preventive Maintenance Reminders:</strong> Periodic engine oil, fitness and PUC renewal alerts handled by GoDrive.</span>
              </div>
            </div>

            <!-- Compliance & Documents -->
            <div class="card">
              <div class="card-title">Compliance & Personal Schedule</div>
              <div class="row">
                <span class="label">RC Status:</span>
                <span class="val">${safeRc}</span>
              </div>
              <div class="row">
                <span class="label">Insurance Validity:</span>
                <span class="val">${safeInsurance}</span>
              </div>
              <div class="row">
                <span class="label">PUC Expiry:</span>
                <span class="val">${safePuc}</span>
              </div>
              <div class="row">
                <span class="label">Permit Type:</span>
                <span class="val">${safePermit}</span>
              </div>
              <div class="row" style="margin-bottom:0;">
                <span class="label">Personal Blocked Dates:</span>
                <span class="val">${safeBlockedDates}</span>
              </div>
            </div>

            <div style="background-color:#1e293b; border-left:4px solid #38bdf8; padding:12px 16px; border-radius:6px; font-size:12px; color:#cbd5e1; line-height:1.4;">
              <strong>What happens next?</strong><br>
              Our verification team will review your photos and documents within 2 to 4 business hours. You will receive an instant notification once your listing goes live.
            </div>
          </div>
          <div class="footer">
            GoDrive Partner Network • Registered to ${safeOwnerName} (${safeOwnerEmail})<br>
            For assistance, contact operations support at support@godrive.in
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter!.sendMail({
      from: `"${SENDER_NAME}" <${SMTP_USER}>`,
      to: recipientEmail,
      subject,
      html,
    });

    // Also send alert to ADMIN_EMAIL if configured
    if (ADMIN_EMAIL && ADMIN_EMAIL !== recipientEmail) {
      try {
        await transporter!.sendMail({
          from: `"${SENDER_NAME}" <${SMTP_USER}>`,
          to: ADMIN_EMAIL,
          subject: sanitizeSubject(`[Admin Copy] New Vehicle Submission: ${vehicle.make} ${vehicle.model} by ${safeOwnerName}`),
          html,
        });
      } catch (adminErr) {
        console.warn('⚠️ Admin copy email failed:', adminErr);
      }
    }

    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending vehicle submission summary email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Admin Activity Notification API (recipient decided by server: ADMIN_EMAIL from process.env)
app.post('/api/admin/notify-activity', authenticateFirebaseToken, checkEmailConfig, emailRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!ADMIN_EMAIL) {
      console.warn('⚠️ ADMIN_EMAIL is not configured in environment variables.');
      return res.status(503).json({ success: false, error: 'Admin email recipient is not configured.' });
    }

    const { eventTitle, actorName, actorRole, actorEmail, summaryText } = req.body;

    const safeEventTitle = escapeHtml(eventTitle || 'Platform Event');
    const safeActorName = escapeHtml(actorName || 'User');
    const safeActorRole = escapeHtml(actorRole || 'Member');
    const safeActorEmail = escapeHtml(actorEmail || req.user?.email || 'N/A');
    const safeSummaryText = escapeHtml(summaryText || 'Activity logged on platform.');

    const rawSubject = `[GoDrive Alert] ${eventTitle || 'Platform Event'} - ${actorName || 'User'}`;
    const subject = sanitizeSubject(rawSubject);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #e5e5e5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #171717; border-radius: 16px; border: 1px solid #262626; overflow: hidden; }
          .header { background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 24px; text-align: center; color: #ffffff; }
          .header h2 { margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; }
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
            <h2>🛡️ GoDrive Admin Alert</h2>
            <p style="margin:4px 0 0 0; font-size:12px; opacity:0.9;">Platform Operations & Activity Log</p>
          </div>
          <div class="content">
            <h3 style="color: #34d399; margin-top: 0; font-size: 16px;">${safeEventTitle}</h3>
            <p style="color: #d4d4d4; font-size: 13px;">An action was performed on the platform:</p>
            
            <div class="alert-box">
              <div class="field-row">
                <span class="field-label">Action By:</span>
                <span class="field-val">${safeActorName} (${safeActorEmail})</span>
              </div>
              <div class="field-row">
                <span class="field-label">Role:</span>
                <span class="field-val">${safeActorRole}</span>
              </div>
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #404040; color: #e5e5e5; font-size: 13px; line-height: 1.5;">
                ${safeSummaryText}
              </div>
            </div>
          </div>
          <div class="footer">
            GoDrive Admin Notification System
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter!.sendMail({
      from: `"${SENDER_NAME}" <${SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject,
      html,
    });

    return res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending admin activity notification email:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Admin-privileged route to reset and recreate dummy users in Firebase Auth & Firestore
app.post('/api/admin/reset-dummy-users', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUserEmail = req.user?.email;
    if (!authUserEmail) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User identity not found.' });
    }

    const auth = getAuth();
    const db = getFirestore();

    // Fetch caller profile to verify they are admin
    const callerSnap = await db.collection('users').doc(req.user!.uid).get();
    if (!callerSnap.exists || callerSnap.data()?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin privileges required.' });
    }

    const emailsToDelete = ['owner_demo@godrive.com', 'customer_demo@godrive.com'];

    // 1. Delete matching users from Firebase Authentication
    for (const email of emailsToDelete) {
      try {
        const userRec = await auth.getUserByEmail(email);
        await auth.deleteUser(userRec.uid);
      } catch (e) {
        // user does not exist in Auth, skip safely
      }
    }

    // 2. Delete matching user documents from Firestore users collection
    for (const email of emailsToDelete) {
      const snap = await db.collection('users').where('email', '==', email).get();
      const batch = db.batch();
      snap.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // 3. Recreate Ravi Kumar (Demo Owner)
    const ownerAuth = await auth.createUser({
      email: 'owner_demo@godrive.com',
      password: 'ownerPassword123',
      displayName: 'Ravi Kumar (Demo Owner)',
    });

    await db.collection('users').doc(ownerAuth.uid).set({
      id: ownerAuth.uid,
      name: 'Ravi Kumar (Demo Owner)',
      email: 'owner_demo@godrive.com',
      phone: '+91 98765 43210',
      role: 'vehicle_owner',
      activeViewMode: 'vehicle_owner',
      approvalStatus: 'approved',
      createdAt: new Date().toISOString(),
      ownerDetails: {
        upiId: 'ravi@okaxis',
        bankAccount: '91827364554433',
        bankIfsc: 'HDFC0000123',
        approvalStatus: 'approved',
        payoutBalance: 12450,
        totalEarned: 35000,
        joinedDate: new Date().toISOString().split('T')[0],
      },
      renterDetails: {
        drivingLicense: 'DL-9918273645',
        aadhaarMasked: 'XXXX-XXXX-8822',
        kycStatus: 'verified',
      }
    });

    // 4. Recreate Pooja Sharma (Demo Customer)
    const customerAuth = await auth.createUser({
      email: 'customer_demo@godrive.com',
      password: 'customerPassword123',
      displayName: 'Pooja Sharma (Demo Customer)',
    });

    await db.collection('users').doc(customerAuth.uid).set({
      id: customerAuth.uid,
      name: 'Pooja Sharma (Demo Customer)',
      email: 'customer_demo@godrive.com',
      phone: '+91 87654 32109',
      role: 'renter',
      activeViewMode: 'renter',
      approvalStatus: 'approved',
      createdAt: new Date().toISOString(),
      renterDetails: {
        drivingLicense: 'DL-1122334455',
        aadhaarMasked: 'XXXX-XXXX-9911',
        kycStatus: 'verified',
      }
    });

    console.log('✅ Demo accounts successfully re-seeded by admin:', authUserEmail);
    return res.json({ 
      success: true, 
      message: 'Dummy accounts successfully reset and recreated.',
      owner: { email: 'owner_demo@godrive.com', password: 'ownerPassword123' },
      customer: { email: 'customer_demo@godrive.com', password: 'customerPassword123' }
    });
  } catch (error: any) {
    console.error('❌ Error resetting dummy users:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Transporter Health Check Endpoint
app.get('/api/email-health', async (_req: Request, res: Response) => {
  if (!isEmailConfigured) {
    return res.json({
      status: 'unconfigured',
      senderName: SENDER_NAME,
      message: 'SMTP credentials are not configured in environment variables.',
    });
  }

  try {
    await transporter!.verify();
    return res.json({
      status: 'healthy',
      senderName: SENDER_NAME,
      senderEmail: SMTP_USER,
      message: 'Nodemailer SMTP is ready and operational.',
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'unhealthy',
      error: err.message,
    });
  }
});

// =====================================================================
// SERVICE REMINDER ENGINE & HELPERS (Asia/Kolkata Whole Days)
// =====================================================================

function getKolkataDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function getDaysDiff(dueDateStr: string, todayStr: string): number {
  const [y1, m1, d1] = dueDateStr.split('-').map(Number);
  const [y2, m2, d2] = todayStr.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
}

function addMonthsClamped(dateStr: string, monthsToAdd: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetYear = year + Math.floor((month - 1 + monthsToAdd) / 12);
  const targetMonth = ((month - 1 + monthsToAdd) % 12) + 1;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

function buildReminderEmailContent(
  kind: 'main_service' | 'part_check',
  title: string,
  vehicleLabel: string,
  dueDate: string,
  daysLeft: number,
  mailNumber: number,
  ownerName: string,
  isTest = false
): { subject: string; html: string } {
  const prefix = isTest ? 'TEST: ' : '';
  const safeVehicle = escapeHtml(vehicleLabel);
  const safeTitle = escapeHtml(title);
  const safeDueDate = escapeHtml(dueDate);
  const safeOwnerName = escapeHtml(ownerName);

  if (kind === 'main_service') {
    const subject = sanitizeSubject(`${prefix}GoDrive reminder: ${title} for ${vehicleLabel} in ${daysLeft} day(s)`);
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 20px; margin: 0;">
        <div style="max-width: 560px; margin: 0 auto; background: #171717; border: 1px solid #262626; border-radius: 14px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, ${isTest ? '#d97706, #b45309' : '#059669, #0d9488'}); padding: 24px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 20px;">${isTest ? '⚠️ [TEST] ' : ''}Car Servicing Reminder</h2>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">GoDrive Fleet Management${isTest ? ' · Test Dispatch' : ''}</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 14px; margin-top: 0;">Hello ${safeOwnerName},</p>
            <p style="font-size: 14px; line-height: 1.5;">
              ${isTest ? 'This is an admin test simulation of reminder ' : 'This is reminder '}<strong>Mail ${mailNumber} of 3</strong> for your car:
            </p>
            <div style="background: #262626; border: 1px solid #404040; border-radius: 10px; padding: 16px; margin: 16px 0;">
              <div style="margin-bottom: 8px; font-size: 13px;"><strong>Vehicle:</strong> ${safeVehicle}</div>
              <div style="margin-bottom: 8px; font-size: 13px;"><strong>Service Due:</strong> ${safeTitle}</div>
              <div style="margin-bottom: 8px; font-size: 13px;"><strong>Due Date:</strong> ${safeDueDate}</div>
              <div style="color: #34d399; font-weight: bold; font-size: 13px;"><strong>Days Left:</strong> ${daysLeft} day(s) remaining</div>
            </div>
            <p style="font-size: 13px; color: #a3a3a3; line-height: 1.5;">
              Please arrange the service soon so the car stays in top running condition and ready for bookings. If you need any help, please contact GoDrive support.
            </p>
            ${isTest ? '<div style="margin-top: 14px; padding: 10px; background: rgba(217,119,6,0.1); border: 1px solid rgba(217,119,6,0.3); border-radius: 8px; font-size: 11px; color: #fbbf24;">ℹ️ This test email was triggered from the GoDrive Admin Desk to test automated delivery and styling for Main Service reminders.</div>' : ''}
          </div>
          <div style="padding: 16px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #262626;">
            Sent by <strong>${escapeHtml(SENDER_NAME)}</strong> · Automated Service Reminder
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  } else {
    const subject = sanitizeSubject(`${prefix}GoDrive reminder: ${title} check for ${vehicleLabel} is due today`);
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 20px; margin: 0;">
        <div style="max-width: 560px; margin: 0 auto; background: #171717; border: 1px solid #262626; border-radius: 14px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, ${isTest ? '#2563eb, #1d4ed8' : '#059669, #0d9488'}); padding: 24px; text-align: center; color: white;">
            <h2 style="margin: 0; font-size: 20px;">${isTest ? '⚠️ [TEST] ' : ''}Part Check Due Today</h2>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">GoDrive Fleet Management${isTest ? ' · Test Dispatch' : ''}</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 14px; margin-top: 0;">Hello ${safeOwnerName},</p>
            <p style="font-size: 14px; line-height: 1.5;">
              ${isTest ? 'This is an admin test simulation of a regular maintenance check due today for your car:' : 'A regular maintenance check is due today for your car:'}
            </p>
            <div style="background: #262626; border: 1px solid #404040; border-radius: 10px; padding: 16px; margin: 16px 0;">
              <div style="margin-bottom: 8px; font-size: 13px;"><strong>Vehicle:</strong> ${safeVehicle}</div>
              <div style="margin-bottom: 8px; font-size: 13px;"><strong>Item to Check:</strong> ${safeTitle}</div>
              <div style="margin-bottom: 8px; font-size: 13px;"><strong>Due Date:</strong> ${safeDueDate} (Today)</div>
            </div>
            <p style="font-size: 13px; color: #a3a3a3; line-height: 1.5;">
              Please check this item or get it inspected today to ensure smooth running and safety. Contact GoDrive support if you need assistance.
            </p>
            ${isTest ? '<div style="margin-top: 14px; padding: 10px; background: rgba(37,99,235,0.1); border: 1px solid rgba(37,99,235,0.3); border-radius: 8px; font-size: 11px; color: #93c5fd;">ℹ️ This test email was triggered from the GoDrive Admin Desk to test automated delivery and styling for Part Check reminders.</div>' : ''}
          </div>
          <div style="padding: 16px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #262626;">
            Sent by <strong>${escapeHtml(SENDER_NAME)}</strong> · Automated Service Reminder
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  }
}

export function formatFirestoreAdminError(err: any): string {
  const msg = err?.message || String(err);
  if (
    msg.includes('PERMISSION_DENIED') || 
    err?.code === 7 || 
    msg.includes('Missing or insufficient permissions')
  ) {
    return 'Permission Denied: Firebase Admin SDK lacks server credentials. The server requires FIREBASE_SERVICE_ACCOUNT_KEY or Cloud IAM role "Cloud Datastore User" on GCP project godrive-923da to read Firestore documents.';
  }
  return msg;
}

export async function runServiceReminders(): Promise<{
  success: boolean;
  today: string;
  processedCount: number;
  mailsSent: number;
  skippedCount: number;
  details: string[];
  error?: string;
}> {
  const todayStr = getKolkataDateString();
  const db = getFirestore();

  try {
    const snap = await db.collection('serviceReminders').where('paused', '==', false).get();
    let mailsSent = 0;
    let skippedCount = 0;
    const details: string[] = [];

    for (const docSnap of snap.docs) {
      const reminder = docSnap.data() as any;
      reminder.id = docSnap.id;

      if (reminder.frequency === 'once' && reminder.completed) {
        continue;
      }

      const daysLeft = getDaysDiff(reminder.dueDate, todayStr);

      // Never send twice for the same day
      if (reminder.lastMailDate === todayStr) {
        skippedCount++;
        details.push(`${reminder.vehicleLabel}: Already sent reminder mail today (${todayStr}).`);
        continue;
      }

      // Main service: daily mail for 3 days before dueDate (3, 2, or 1 days left)
      const isMainServiceDue = reminder.kind === 'main_service' && (daysLeft === 3 || daysLeft === 2 || daysLeft === 1);
      // Part checks: mail on due date itself (0 days left)
      const isPartCheckDue = reminder.kind === 'part_check' && daysLeft === 0;

      if (!isMainServiceDue && !isPartCheckDue) {
        continue;
      }

      // Recipient is decided only by the server from ownerId
      const ownerSnap = await db.collection('users').doc(reminder.ownerId).get();
      if (!ownerSnap.exists) {
        skippedCount++;
        details.push(`${reminder.vehicleLabel}: Owner not found in users collection (ID: ${reminder.ownerId}).`);
        continue;
      }

      const ownerData = ownerSnap.data() || {};
      const ownerEmail = ownerData.email;
      const ownerName = ownerData.name || 'Car Owner';

      if (!ownerEmail) {
        skippedCount++;
        details.push(`${reminder.vehicleLabel}: Owner has no email registered.`);
        continue;
      }

      if (ownerData.approvalStatus === 'suspended') {
        skippedCount++;
        details.push(`${reminder.vehicleLabel}: Owner account is suspended — mail skipped.`);
        continue;
      }

      if (!transporter || !SMTP_USER) {
        skippedCount++;
        details.push(`${reminder.vehicleLabel}: SMTP is not configured on server.`);
        continue;
      }

      let subject = '';
      let html = '';
      const safeVehicle = escapeHtml(reminder.vehicleLabel);
      const safeTitle = escapeHtml(reminder.title);
      const safeDueDate = escapeHtml(reminder.dueDate);
      const safeOwnerName = escapeHtml(ownerName);

      if (isMainServiceDue) {
        const mailNumber = (reminder.mailsSentForCurrentDue || 0) + 1;
        subject = sanitizeSubject(`GoDrive reminder: ${reminder.title} for ${reminder.vehicleLabel} in ${daysLeft} day(s)`);
        html = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 20px; margin: 0;">
            <div style="max-width: 560px; margin: 0 auto; background: #171717; border: 1px solid #262626; border-radius: 14px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 24px; text-align: center; color: white;">
                <h2 style="margin: 0; font-size: 20px;">Car Servicing Reminder</h2>
                <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">GoDrive Fleet Management</p>
              </div>
              <div style="padding: 24px;">
                <p style="font-size: 14px; margin-top: 0;">Hello ${safeOwnerName},</p>
                <p style="font-size: 14px; line-height: 1.5;">
                  This is reminder <strong>Mail ${mailNumber} of 3</strong> for your car:
                </p>
                <div style="background: #262626; border: 1px solid #404040; border-radius: 10px; padding: 16px; margin: 16px 0;">
                  <div style="margin-bottom: 8px; font-size: 13px;"><strong>Vehicle:</strong> ${safeVehicle}</div>
                  <div style="margin-bottom: 8px; font-size: 13px;"><strong>Service Due:</strong> ${safeTitle}</div>
                  <div style="margin-bottom: 8px; font-size: 13px;"><strong>Due Date:</strong> ${safeDueDate}</div>
                  <div style="color: #34d399; font-weight: bold; font-size: 13px;"><strong>Days Left:</strong> ${daysLeft} day(s) remaining</div>
                </div>
                <p style="font-size: 13px; color: #a3a3a3; line-height: 1.5;">
                  Please arrange the service soon so the car stays in top running condition and ready for bookings. If you need any help, please contact GoDrive support.
                </p>
              </div>
              <div style="padding: 16px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #262626;">
                Sent by <strong>${escapeHtml(SENDER_NAME)}</strong> · Automated Service Reminder
              </div>
            </div>
          </body>
          </html>
        `;
      } else if (isPartCheckDue) {
        subject = sanitizeSubject(`GoDrive reminder: ${reminder.title} check for ${reminder.vehicleLabel} is due today`);
        html = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 20px; margin: 0;">
            <div style="max-width: 560px; margin: 0 auto; background: #171717; border: 1px solid #262626; border-radius: 14px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #059669, #0d9488); padding: 24px; text-align: center; color: white;">
                <h2 style="margin: 0; font-size: 20px;">Part Check Due Today</h2>
                <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">GoDrive Fleet Management</p>
              </div>
              <div style="padding: 24px;">
                <p style="font-size: 14px; margin-top: 0;">Hello ${safeOwnerName},</p>
                <p style="font-size: 14px; line-height: 1.5;">
                  A regular maintenance check is due today for your car:
                </p>
                <div style="background: #262626; border: 1px solid #404040; border-radius: 10px; padding: 16px; margin: 16px 0;">
                  <div style="margin-bottom: 8px; font-size: 13px;"><strong>Vehicle:</strong> ${safeVehicle}</div>
                  <div style="margin-bottom: 8px; font-size: 13px;"><strong>Item to Check:</strong> ${safeTitle}</div>
                  <div style="margin-bottom: 8px; font-size: 13px;"><strong>Due Date:</strong> ${safeDueDate} (Today)</div>
                </div>
                <p style="font-size: 13px; color: #a3a3a3; line-height: 1.5;">
                  Please check this item or get it inspected today to ensure smooth running and safety. Contact GoDrive support if you need assistance.
                </p>
              </div>
              <div style="padding: 16px; text-align: center; font-size: 11px; color: #737373; border-top: 1px solid #262626;">
                Sent by <strong>${escapeHtml(SENDER_NAME)}</strong> · Automated Service Reminder
              </div>
            </div>
          </body>
          </html>
        `;
      }

      try {
        await transporter.sendMail({
          from: `"${SENDER_NAME}" <${SMTP_USER}>`,
          to: ownerEmail,
          subject,
          html,
        });

        const updatePayload: any = {
          lastMailDate: todayStr,
        };

        if (isMainServiceDue) {
          updatePayload.mailsSentForCurrentDue = (reminder.mailsSentForCurrentDue || 0) + 1;
        } else if (isPartCheckDue) {
          const monthsToAdd = reminder.frequency === 'monthly' ? 1 : 6;
          updatePayload.dueDate = addMonthsClamped(reminder.dueDate, monthsToAdd);
          updatePayload.mailsSentForCurrentDue = 0;
        }

        await db.collection('serviceReminders').doc(reminder.id).update(updatePayload);

        // Record Activity History
        await db.collection('auditLogs').add({
          category: 'maintenance',
          action: 'Service Reminder Mail Sent',
          summary: `Sent reminder mail to ${ownerEmail} for ${reminder.vehicleLabel}: ${reminder.title}. Subject: "${subject}".`,
          actor: {
            id: 'system',
            name: 'System',
            role: 'system',
          },
          timestamp: new Date().toISOString(),
          vehiclePlate: reminder.vehicleLabel,
          severity: 'info',
        });

        mailsSent++;
        details.push(`Sent reminder mail to ${ownerEmail} for ${reminder.vehicleLabel} (${reminder.title}).`);
      } catch (sendErr: any) {
        console.error(`❌ Failed to send reminder email for reminder ${reminder.id}:`, sendErr.message);
        details.push(`Failed to send to ${ownerEmail}: ${sendErr.message}`);
      }
    }

    return {
      success: true,
      today: todayStr,
      processedCount: snap.size,
      mailsSent,
      skippedCount,
      details,
    };
  } catch (err: any) {
    console.error('❌ Error executing runServiceReminders:', err);
    return {
      success: false,
      today: todayStr,
      processedCount: 0,
      mailsSent: 0,
      skippedCount: 0,
      details: [],
      error: formatFirestoreAdminError(err),
    };
  }
}

// (a) Protected Cron Endpoint
app.post('/api/cron/run-service-reminders', async (req: Request, res: Response) => {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers['x-cron-secret'];

  if (!cronSecret || typeof providedSecret !== 'string') {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or unconfigured cron secret.' });
  }

  const bufA = Buffer.from(cronSecret);
  const bufB = Buffer.from(providedSecret);

  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid cron secret.' });
  }

  const result = await runServiceReminders();
  if (!result.success) {
    return res.status(500).json(result);
  }
  return res.json(result);
});

// (b) Admin Endpoints: Send test reminder mail (supports single reminder, on-the-fly vehicle testing, and all reminder types)
app.post('/api/admin/service-reminders/test', authenticateFirebaseToken, emailRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();

    // Verify admin role via users collection
    const callerSnap = await db.collection('users').doc(req.user!.uid).get();
    if (!callerSnap.exists || callerSnap.data()?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin privileges required.' });
    }

    const { reminderId, vehicleId, kind, title, daysLeft, sendAllTypes } = req.body;
    if (!reminderId && !vehicleId) {
      return res.status(400).json({ success: false, error: 'Missing reminderId or vehicleId in request body.' });
    }

    if (!transporter || !SMTP_USER) {
      return res.status(503).json({ success: false, error: 'Email service is not configured (SMTP credentials missing).' });
    }

    let ownerId = '';
    let vehicleLabel = '';
    let reminderTitle = title || 'Main service';
    let reminderKind: 'main_service' | 'part_check' = kind || 'main_service';
    let dueDate = getKolkataDateString();
    let calculatedDaysLeft = typeof daysLeft === 'number' ? daysLeft : 3;

    if (reminderId) {
      const reminderSnap = await db.collection('serviceReminders').doc(reminderId).get();
      if (!reminderSnap.exists) {
        return res.status(404).json({ success: false, error: 'Reminder record not found.' });
      }
      const reminder = reminderSnap.data() as any;
      ownerId = reminder.ownerId;
      vehicleLabel = reminder.vehicleLabel;
      reminderTitle = reminder.title;
      reminderKind = reminder.kind;
      dueDate = reminder.dueDate;
      const todayStr = getKolkataDateString();
      calculatedDaysLeft = typeof daysLeft === 'number' ? daysLeft : Math.max(0, getDaysDiff(reminder.dueDate, todayStr));
    } else if (vehicleId) {
      const vehicleSnap = await db.collection('vehicles').doc(vehicleId).get();
      if (!vehicleSnap.exists) {
        return res.status(404).json({ success: false, error: 'Vehicle record not found.' });
      }
      const vehicle = vehicleSnap.data() as any;
      ownerId = vehicle.ownerId;
      vehicleLabel = `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`;
    }

    // Lookup owner in users collection
    const ownerSnap = await db.collection('users').doc(ownerId).get();
    if (!ownerSnap.exists) {
      return res.status(400).json({ success: false, error: 'Car owner record not found in database.' });
    }

    const ownerData = ownerSnap.data() || {};
    const ownerEmail = ownerData.email;
    if (!ownerEmail) {
      return res.status(400).json({ success: false, error: 'Car owner has no registered email.' });
    }

    if (ownerData.approvalStatus === 'suspended') {
      return res.status(400).json({ success: false, error: 'Owner account is suspended — mail skipped.' });
    }

    const ownerName = ownerData.name || 'Car Owner';
    const maskedEmail = ownerEmail.replace(/(^.{2})(.*)(@.*$)/, '$1***$3');

    // MODE 1: Send Test Reminders for ALL Types at once (Main Service + Part Check)
    if (sendAllTypes) {
      // 1. Send Main Service test email
      const mainContent = buildReminderEmailContent(
        'main_service',
        'Main service',
        vehicleLabel,
        dueDate,
        3,
        1,
        ownerName,
        true
      );
      await transporter.sendMail({
        from: `"${SENDER_NAME}" <${SMTP_USER}>`,
        to: ownerEmail,
        subject: mainContent.subject,
        html: mainContent.html,
      });

      // 2. Send Part Check test email
      const partContent = buildReminderEmailContent(
        'part_check',
        'Engine oil and filter',
        vehicleLabel,
        dueDate,
        0,
        1,
        ownerName,
        true
      );
      await transporter.sendMail({
        from: `"${SENDER_NAME}" <${SMTP_USER}>`,
        to: ownerEmail,
        subject: partContent.subject,
        html: partContent.html,
      });

      // Audit log
      await db.collection('auditLogs').add({
        category: 'maintenance',
        action: 'Test Reminder Mails Sent (All Types)',
        summary: `Admin ${req.user!.name || req.user!.email || 'Admin'} sent test reminders for all reminder types (Main service & Part check) to ${ownerEmail} for ${vehicleLabel}.`,
        actor: {
          id: req.user!.uid,
          name: req.user!.name || 'Admin',
          role: 'admin',
        },
        timestamp: new Date().toISOString(),
        vehiclePlate: vehicleLabel,
        severity: 'info',
      });

      return res.json({
        success: true,
        message: `Test reminder emails sent for all types (Main service + Part check) to car owner (${maskedEmail}).`,
        count: 2,
        types: ['main_service', 'part_check']
      });
    }

    // MODE 2: Send Single Specific Reminder Type
    const mailNumber = calculatedDaysLeft === 3 ? 1 : (calculatedDaysLeft === 2 ? 2 : (calculatedDaysLeft === 1 ? 3 : 1));
    const emailContent = buildReminderEmailContent(
      reminderKind,
      reminderTitle,
      vehicleLabel,
      dueDate,
      calculatedDaysLeft,
      mailNumber,
      ownerName,
      true
    );

    await transporter.sendMail({
      from: `"${SENDER_NAME}" <${SMTP_USER}>`,
      to: ownerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    // Audit log
    await db.collection('auditLogs').add({
      category: 'maintenance',
      action: 'Test Service Reminder Mail Sent',
      summary: `Admin ${req.user!.name || req.user!.email || 'Admin'} sent a test ${reminderKind === 'main_service' ? 'Main service' : 'Part check'} reminder mail ("${reminderTitle}") to ${ownerEmail} for ${vehicleLabel}.`,
      actor: {
        id: req.user!.uid,
        name: req.user!.name || 'Admin',
        role: 'admin',
      },
      timestamp: new Date().toISOString(),
      vehiclePlate: vehicleLabel,
      severity: 'info',
    });

    const typeDesc = reminderKind === 'main_service' 
      ? `Main service (${calculatedDaysLeft} day(s) left)` 
      : `Part check (${reminderTitle})`;

    return res.json({
      success: true,
      message: `Test mail for ${typeDesc} successfully sent to car owner (${maskedEmail}).`,
      reminderKind,
      reminderTitle
    });
  } catch (err: any) {
    console.error('❌ Error sending test reminder mail:', err);
    return res.status(500).json({ success: false, error: formatFirestoreAdminError(err) });
  }
});

// (c) Admin Endpoints: Run today's checks now
app.post('/api/admin/service-reminders/run', authenticateFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getFirestore();
    const callerSnap = await db.collection('users').doc(req.user!.uid).get();
    if (!callerSnap.exists || callerSnap.data()?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin privileges required.' });
    }

    const result = await runServiceReminders();
    if (!result.success) {
      return res.status(500).json(result);
    }
    return res.json(result);
  } catch (err: any) {
    console.error('❌ Error running service reminders via admin trigger:', err);
    return res.status(500).json({ success: false, error: formatFirestoreAdminError(err) });
  }
});

// Automated Cronjob: Runs every day at 08:00 AM India Time (Asia/Kolkata)
const serviceReminderCronJob = cron.schedule(
  '0 8 * * *',
  async () => {
    const todayStr = getKolkataDateString();
    console.log(`⏰ [CronJob] Starting scheduled daily service reminders check for ${todayStr} at 08:00 AM IST...`);
    try {
      const result = await runServiceReminders();
      if (result.success) {
        console.log(`✅ [CronJob] Daily reminders check completed for ${todayStr}: Processed=${result.processedCount}, Sent=${result.mailsSent}, Skipped=${result.skippedCount}`);
      } else {
        console.warn(`⚠️ [CronJob] Daily reminders check returned notice for ${todayStr}:`, result.error);
      }
    } catch (cronErr: any) {
      console.error(`❌ [CronJob] Unhandled error during scheduled reminders run:`, cronErr.message || cronErr);
    }
  },
  {
    timezone: 'Asia/Kolkata',
  }
);

console.log('🕒 [CronJob] Automated service reminder cronjob scheduled to run daily at 08:00 AM (Asia/Kolkata)');

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
