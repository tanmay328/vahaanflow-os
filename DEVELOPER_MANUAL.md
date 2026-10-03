# VahaanFlow OS — Simplified Two-Role Developer Manual & System Architecture

**Version:** 3.0.0 (Simplified Two-Role Edition)  
**Database ID:** `ai-studio-vehiclerentalsys-15d7931e-0e5f-4e76-bff0-d41e2603efb5`  
**Project ID:** `crested-dream-fkx2q`  

---

## 1. Simplified Architecture: Two Operational Roles

The platform is designed around two operational roles:

### 1. Platform Admin (Runs the platform)
- **Vehicles:**
  - Add, edit, and remove any vehicle.
  - Set status: `available`, `booked`, `on_trip`, `maintenance`, `blocked`.
  - Set platform price, km allowance (e.g. 300 km/day), and security deposit.
  - Track RC, insurance, PUC, fitness, and permit expiry dates.
  - Approve or reject vehicle owners and their submitted vehicles.
- **Bookings:**
  - View all bookings across the entire platform.
  - Approve, reject, extend, or cancel any booking.
  - Conduct check-out handover and check-in return inspections.
  - Apply or waive penalties (**always with a mandatory reason / waiver rationale**).
- **Renters:**
  - Approve or reject KYC documents (full DL, Aadhaar, and PAN review).
  - Blacklist or suspend fraudulent renters.
  - View full customer rental history.
- **Money & Financials:**
  - View all platform payments, deposits, and refunds.
  - Settle deposits after deducting damage, fuel deficit, or manual toll fees.
  - Generate GST tax invoices.
  - Disburse payouts to vehicle owners (85% owner share / 15% platform commission).
- **Platform Governance:**
  - Set platform commission rate (15%), GST tax rate (18%), and cancellation rules.
  - View immutable audit log (strictly read-only; nobody can edit or delete).
  - Review and resolve support disputes.

### 2. Vehicle Owner (Gives the car for rent)
- **Vehicles (Own vehicles only):**
  - Add vehicles with documents (RC, Insurance, PUC, Fitness, Permit) &mdash; with a **"Skip for now"** option for documents.
  - Vehicles enter `pending_approval` status until Admin reviews.
  - Set availability dates and **block dates for personal use**.
  - Suggest a rental price (Admin can override).
  - **Must NOT see other owners' vehicles.**
- **Bookings (Own vehicles only):**
  - View upcoming, active, and past bookings for their own fleet.
  - Approve or decline incoming booking requests.
  - **Must NOT see renter's full KYC** (only name and `Verified KYC` status badge are shown; document numbers are masked for privacy).
- **Earnings & Financials:**
  - View total gross rental, commission deducted (15%), and net owner share (85%).
  - View bank / UPI payout history and pending balance.
  - Download monthly earnings statements as CSV.
  - **Must NOT see platform-wide revenue.**
- **Support:**
  - Report an issue or dispute to platform administration.

### Normal Customer / Renter Use (Available to Both Roles)
- Both Admins and Vehicle Owners can toggle to **"Customer / Rent Mode"** at any time to browse the approved fleet and book cars as a regular user.
- **Forgot Password:** A password reset option is available on the login screen for both roles.

---

## 2. Platform Restrictions Matrix

| Capability | Platform Admin | Vehicle Owner | Regular Renter |
|---|---|---|---|
| Edit or delete audit logs | ❌ No (Read-only) | ❌ No (Read-only) | ❌ No |
| View other owners' vehicles | ✅ Yes | ❌ **No (Own only)** | ✅ Approved only |
| View renter's full KYC numbers | ✅ Yes | ❌ **No (Name/badge only)** | ❌ Own only |
| View platform-wide revenue | ✅ Yes | ❌ **No (Own earnings only)** | ❌ No |
| Change completed settlement | ❌ No (Adjustment only) | ❌ No | ❌ No |
| Waive penalty without reason | ❌ No (Reason required) | ❌ No | ❌ No |

---

## 3. Key Operational Changes & Cleanups

1. **Replaced Scratch Polygon Canvas with Guided Photo Capture:**
   - 7-Point Guided Photo Inspection: Front, Rear, Left, Right, Interior, Odometer, and Fuel/Battery level.
   - Clean damage notes and repair fee calculator replace manual coordinate plotting.
2. **Removed / Deferred FASTag Simulation:**
   - Simulated background toll pulse removed.
   - Replaced by **Manual Highway Toll Expense Logging** with receipt notes attached during check-in return settlements.
3. **Simulated Telemetry Disabled by Default:**
   - Background polling daemon turned off to prevent Firestore write quota consumption.
4. **Firebase Auth Linked Identity:**
   - User identity authenticated via Firebase Auth and linked to `users/{uid}` in Cloud Firestore.
   - Password reset via Firebase Auth password reset flow.

---

## 4. Firestore Database Collections

| Collection | Schema / Purpose | Access Rule |
|---|---|---|
| `users` | Role (`admin`, `vehicle_owner`), profile, owner bank/UPI details, KYC tokens | Read/Write |
| `vehicles` | Fleet inventory, `ownerId`, `approvalStatus`, rates, blocked dates, documents | Read/Write |
| `bookings` | Complete reservation dossiers, check-outs, return settlements, owner share | Read/Write |
| `auditLogs` | Append-only immutable log of handovers, returns, payouts, and status changes | **Read/Create Only** (No Update/Delete) |
| `payouts` | Owner payout records, net amounts, UTR / transaction references | Read/Write |
| `disputes` | Owner & renter dispute tickets with admin resolution outcome | Read/Write |
| `maintenance`| Workshop work orders and commercial RTO fitness certificate tracking | Read/Write |
| `settings` | Platform commission rate (15%), GST tax rate (18%), km allowances | Read/Write |

---

## 5. Development & Verification Commands

```bash
# Start local development server (port 3000)
npm run dev

# Run TypeScript compilation check
npm run lint

# Build production bundle
npm run build

# Seed or restore all Firestore collections
npx tsx scripts/seed.ts
```
