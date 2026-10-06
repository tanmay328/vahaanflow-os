import express, { Request, Response, NextFunction } from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
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
    const db = getFirestore(firebaseConfig.firestoreDatabaseId);

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
