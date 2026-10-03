import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  BookOpen, 
  ShieldCheck, 
  Car, 
  DollarSign, 
  Lock, 
  FileText,
  AlertTriangle
} from 'lucide-react';

interface DeveloperManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MANUAL_MARKDOWN = `# VahaanFlow OS — Simplified Two-Role Developer Manual & System Architecture

**Version:** 3.0.0 (Simplified Two-Role Edition)  
**Database ID:** \`ai-studio-vehiclerentalsys-15d7931e-0e5f-4e76-bff0-d41e2603efb5\`  
**Project ID:** \`crested-dream-fkx2q\`  

---

## 1. Simplified Architecture: Two Operational Roles

### 1. Platform Admin (Runs the platform)
- **Vehicles:**
  - Add, edit, and remove any vehicle.
  - Set status: available, booked, on_trip, maintenance, blocked.
  - Set platform price, km allowance (e.g. 300 km/day), and security deposit.
  - Track RC, insurance, PUC, fitness, and permit expiry dates.
  - Approve or reject vehicle owners and their submitted vehicles.
- **Bookings:**
  - View all bookings across the entire platform.
  - Approve, reject, extend, or cancel any booking.
  - Conduct check-out handover and check-in return inspections.
  - Apply or waive penalties (always with a mandatory reason / waiver rationale).
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
  - Add vehicles with documents (RC, Insurance, PUC, Fitness, Permit) — with a "Skip for now" option for documents.
  - Vehicles enter pending_approval status until Admin reviews.
  - Set availability dates and block dates for personal use.
  - Suggest a rental price (Admin can override).
  - Must NOT see other owners' vehicles.
- **Bookings (Own vehicles only):**
  - View upcoming, active, and past bookings for their own fleet.
  - Approve or decline incoming booking requests.
  - Must NOT see renter's full KYC (only name and Verified KYC status badge are shown; document numbers are masked for privacy).
- **Earnings & Financials:**
  - View total gross rental, commission deducted (15%), and net owner share (85%).
  - View bank / UPI payout history and pending balance.
  - Download monthly earnings statements as CSV.
  - Must NOT see platform-wide revenue.
- **Support:**
  - Report an issue or dispute to platform administration.

---

## 2. Platform Restrictions Matrix

| Capability | Platform Admin | Vehicle Owner | Regular Renter |
|---|---|---|---|
| Edit or delete audit logs | No (Read-only) | No (Read-only) | No |
| View other owners' vehicles | Yes | No (Own only) | Approved only |
| View renter's full KYC numbers | Yes | No (Name/badge only) | Own only |
| View platform-wide revenue | Yes | No (Own earnings only) | No |
| Change completed settlement | No (Adjustment only) | No | No |
| Waive penalty without reason | No (Reason required) | No | No |

---

## 3. Key Operational Changes & Cleanups
1. Replaced Scratch Polygon Canvas with Guided Photo Capture:
   - 7-Point Guided Photo Inspection: Front, Rear, Left, Right, Interior, Odometer, Fuel gauge.
   - Clean damage notes and repair fee calculator replace manual coordinate plotting.
2. Removed / Deferred FASTag Simulation:
   - Background toll pulse removed. Replaced by manual highway toll expense logging with receipt notes.
3. Simulated Telemetry Disabled by Default:
   - Background polling daemon turned off to prevent Firestore write quota consumption.
4. Firebase Auth Linked Identity:
   - User identity authenticated via Firebase Auth and linked to users/{uid} in Cloud Firestore.
   - Password reset via sendPasswordResetEmail flow.
`;

export const DeveloperManualModal: React.FC<DeveloperManualModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'roles' | 'matrix' | 'markdown'>('roles');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(MANUAL_MARKDOWN);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([MANUAL_MARKDOWN], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'VahaanFlow_Developer_Manual_Two_Roles.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Developer Manual & Two-Role Architecture</h2>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  v3.0.0
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Admin & Vehicle Owner roles, permissions matrix, guided photo capture, and manual tolls
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors shadow-sm"
              title="Download as Markdown file"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download (.md)</span>
            </button>

            <button
              onClick={handleCopyMarkdown}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Copy markdown text"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 px-6 py-2.5 border-b border-neutral-800 bg-neutral-950/40 text-xs font-medium">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'roles' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Two Roles (Admin & Owner)
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'matrix' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Access Restrictions Matrix
          </button>
          <button
            onClick={() => setActiveTab('markdown')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'markdown' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Raw Markdown
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-neutral-300">
          
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Admin Card */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>1. Platform Admin (Runs Platform)</span>
                  </div>
                  <ul className="space-y-1.5 text-neutral-400 list-disc pl-4 text-[11px]">
                    <li><strong className="text-white">Vehicles:</strong> Add/edit/remove any vehicle, set status (available, booked, on trip, maintenance, blocked), track RC, insurance, PUC, fitness expiries, approve/reject owners.</li>
                    <li><strong className="text-white">Bookings:</strong> View all bookings, approve/reject/extend/cancel, do check-out & check-in, apply/waive penalties with mandatory reasons.</li>
                    <li><strong className="text-white">Renters:</strong> Full KYC review (DL, Aadhaar, PAN), approve/reject KYC, blacklist fraudulent renters.</li>
                    <li><strong className="text-white">Money:</strong> View payments, deposits, refunds, GST invoices, and disburse owner payouts (85% owner share / 15% platform commission).</li>
                    <li><strong className="text-white">Audit Log:</strong> Strictly read-only, tamper-proof audit trail.</li>
                  </ul>
                </div>

                {/* Owner Card */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <Car className="h-4 w-4 text-emerald-400" />
                    <span>2. Vehicle Owner (Gives Car for Rent)</span>
                  </div>
                  <ul className="space-y-1.5 text-neutral-400 list-disc pl-4 text-[11px]">
                    <li><strong className="text-white">Vehicles (Own only):</strong> Add vehicles with documents or use <strong className="text-amber-400">"Skip for now"</strong>, block personal dates, suggest pricing.</li>
                    <li><strong className="text-white">Bookings (Own only):</strong> See upcoming, active, and past bookings for own fleet, approve or decline booking requests.</li>
                    <li><strong className="text-white">Privacy Protection:</strong> Cannot see renter's full KYC numbers (only name and Verified KYC status badge).</li>
                    <li><strong className="text-white">Earnings:</strong> View gross rental, commission deducted, net payout balance, and download monthly statements.</li>
                    <li><strong className="text-white">Support:</strong> Report issues and disputes to platform admin.</li>
                  </ul>
                </div>
              </div>

              {/* Both Roles can use as customer */}
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-neutral-300 text-[11px] flex items-center justify-between">
                <span>Both Admin and Vehicle Owners have a 1-click toggle to browse and book vehicles as a normal customer inside the app.</span>
                <span className="font-mono text-emerald-400 font-bold">"Rent Mode" Included</span>
              </div>
            </div>
          )}

          {activeTab === 'matrix' && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 text-neutral-400 font-semibold border-b border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3">Operation / Capability</th>
                    <th className="py-2.5 px-3">Platform Admin</th>
                    <th className="py-2.5 px-3">Vehicle Owner</th>
                    <th className="py-2.5 px-3">Regular Renter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80 font-mono text-[11px]">
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-white">Edit or delete audit logs</td>
                    <td className="py-2.5 px-3 text-red-400 font-bold">❌ No (Read-Only)</td>
                    <td className="py-2.5 px-3 text-red-400 font-bold">❌ No (Read-Only)</td>
                    <td className="py-2.5 px-3 text-neutral-500">❌ No</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-white">See other owners' vehicles</td>
                    <td className="py-2.5 px-3 text-emerald-400">✅ Yes (Manages all)</td>
                    <td className="py-2.5 px-3 text-red-400 font-bold">❌ No (Own only)</td>
                    <td className="py-2.5 px-3 text-neutral-300">✅ Approved only</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-white">See renter's full KYC numbers</td>
                    <td className="py-2.5 px-3 text-emerald-400">✅ Yes (DL/Aadhaar/PAN)</td>
                    <td className="py-2.5 px-3 text-red-400 font-bold">❌ No (Name/badge only)</td>
                    <td className="py-2.5 px-3 text-neutral-300">✅ Own only</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-white">See platform-wide revenue</td>
                    <td className="py-2.5 px-3 text-emerald-400">✅ Yes</td>
                    <td className="py-2.5 px-3 text-red-400 font-bold">❌ No (Own earnings only)</td>
                    <td className="py-2.5 px-3 text-neutral-500">❌ No</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-white">Change completed settlement</td>
                    <td className="py-2.5 px-3 text-red-400 font-bold">❌ No (New adjustment only)</td>
                    <td className="py-2.5 px-3 text-red-400 font-bold">❌ No</td>
                    <td className="py-2.5 px-3 text-neutral-500">❌ No</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-white">Waive penalty without reason</td>
                    <td className="py-2.5 px-3 text-red-400 font-bold">❌ No (Reason required)</td>
                    <td className="py-2.5 px-3 text-red-400 font-bold">❌ No</td>
                    <td className="py-2.5 px-3 text-neutral-500">❌ No</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'markdown' && (
            <pre className="p-4 rounded-xl border border-neutral-800 bg-neutral-950 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-[50vh] leading-relaxed">
              {MANUAL_MARKDOWN}
            </pre>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 px-6 py-3.5 bg-neutral-950/80 flex items-center justify-between text-xs">
          <span className="text-neutral-500 font-mono">
            Saved in repo root as: <strong className="text-neutral-300">/DEVELOPER_MANUAL.md</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
