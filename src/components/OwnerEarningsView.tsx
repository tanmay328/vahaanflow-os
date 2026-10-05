import React, { useState } from 'react';
import { Booking, PayoutRecord, DisputeRecord } from '../types/rental';
import { UserProfile } from '../types/auth';
import { 
  DollarSign, 
  Download, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  FileText,
  LifeBuoy
} from 'lucide-react';

interface OwnerEarningsViewProps {
  currentUser: UserProfile;
  ownerBookings: Booking[];
  ownerPayouts: PayoutRecord[];
  onReportDispute: (title: string, description: string, bookingId?: string) => void;
  theme?: 'dark' | 'light';
}

export const OwnerEarningsView: React.FC<OwnerEarningsViewProps> = ({
  currentUser,
  ownerBookings,
  ownerPayouts,
  onReportDispute,
  theme = 'dark',
}) => {
  const [disputeModalOpen, setDisputeModalOpen] = useState<boolean>(false);
  const [disputeTitle, setDisputeTitle] = useState<string>('');
  const [disputeDescription, setDisputeDescription] = useState<string>('');
  const [disputeBookingId, setDisputeBookingId] = useState<string>('');

  // Calculate Owner's private financial metrics (strictly isolated from platform-wide revenue!)
  const totalGrossRental = ownerBookings.reduce((sum, b) => sum + (b.totalRental || 0), 0);
  const totalCommissionDeducted = ownerBookings.reduce((sum, b) => sum + (b.platformCommission || 0), 0);
  const totalNetEarnings = ownerBookings.reduce((sum, b) => sum + (b.ownerNetShare || 0), 0);

  const totalPaidOut = ownerPayouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.netPayout, 0);

  const pendingPayoutBalance = ownerPayouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.netPayout, 0);

  // Download Statement (CSV)
  const handleDownloadStatement = () => {
    let csv = 'Booking Number,Car Number,Start Date,End Date,Total Rent (INR),Platform Fee 15% (INR),My Earnings 85% (INR),Payment Status\n';
    ownerBookings.forEach(b => {
      csv += `"${b.bookingCode}","${b.vehicle.licensePlate}","${b.startDate}","${b.endDate}",${b.totalRental},${b.platformCommission},${b.ownerNetShare},"${b.payoutStatus}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `VahaanFlow_Owner_Earnings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeTitle.trim() || !disputeDescription.trim()) return;
    onReportDispute(disputeTitle.trim(), disputeDescription.trim(), disputeBookingId || undefined);
    setDisputeTitle('');
    setDisputeDescription('');
    setDisputeBookingId('');
    setDisputeModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Statement Download */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
      }`}>
        <div>
          <h2 className={`text-xl font-extrabold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>My Earnings & Bank Payouts</h2>
          <p className={`text-xs mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
            Your earnings from your cars, platform fee deducted, and bank/UPI payout history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDisputeModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              theme === 'light'
                ? 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
                : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
            }`}
          >
            <LifeBuoy className="h-3.5 w-3.5 text-amber-500" />
            <span>Report an Issue</span>
          </button>

          <button
            onClick={handleDownloadStatement}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Statement (Excel/CSV)</span>
          </button>
        </div>
      </div>

      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border space-y-1 ${
          theme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-neutral-900/60 border-neutral-800 text-neutral-100'
        }`}>
          <div className={`flex items-center justify-between text-xs ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
            <span>Total Booking Amount</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className={`text-2xl font-bold font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            ₹{(totalGrossRental || 0).toLocaleString()}
          </div>
          <span className={`text-[10px] block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>Total paid by customers for your cars</span>
        </div>

        <div className={`p-4 rounded-xl border space-y-1 ${
          theme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-neutral-900/60 border-neutral-800 text-neutral-100'
        }`}>
          <div className={`flex items-center justify-between text-xs ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
            <span>Platform Fee (15%)</span>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className={`text-2xl font-bold font-mono ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
            -₹{(totalCommissionDeducted || 0).toLocaleString()}
          </div>
          <span className={`text-[10px] block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>For app maintenance and customer support</span>
        </div>

        <div className={`p-4 rounded-xl border space-y-1 ${
          theme === 'light' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 shadow-sm' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
        }`}>
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>My Net Earnings (85%)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-700">
            ₹{(totalNetEarnings || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-700/80 block font-medium">Your net profit</span>
        </div>

        <div className={`p-4 rounded-xl border space-y-1 ${
          theme === 'light' ? 'bg-amber-50/80 border-amber-200 text-amber-900 shadow-sm' : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
        }`}>
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Pending Payout</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">
            ₹{(pendingPayoutBalance || 0).toLocaleString()}
          </div>
          <span className={`text-[10px] block ${theme === 'light' ? 'text-amber-800/80' : 'text-neutral-500'}`}>
            Already received: ₹{(totalPaidOut || 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Payout History Table */}
      <div className={`rounded-xl border overflow-hidden space-y-3 p-4 ${
        theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-900/40 border-neutral-800'
      }`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-extrabold flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            <FileText className="h-4 w-4 text-emerald-600" />
            <span>Bank & UPI Payment History</span>
          </h3>
          <span className={`text-xs font-mono ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
            Linked UPI: {currentUser.ownerDetails?.upiId || 'suresh.patel@okaxis'}
          </span>
        </div>

        <div className={`overflow-x-auto rounded-lg border ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
          <table className="w-full text-left text-xs">
            <thead className={`font-semibold border-b ${
              theme === 'light' ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
            }`}>
              <tr>
                <th className="py-2.5 px-3">Payment ID</th>
                <th className="py-2.5 px-3">Car Plate</th>
                <th className="py-2.5 px-3">Total Rent</th>
                <th className="py-2.5 px-3">Platform Fee (15%)</th>
                <th className={`py-2.5 px-3 font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Your Share</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Bank Reference / Date</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-mono text-[11px] ${
              theme === 'light' ? 'divide-slate-100' : 'divide-neutral-800'
            }`}>
              {ownerPayouts.map(p => (
                <tr key={p.id} className="hover:bg-neutral-800/40">
                  <td className="py-2.5 px-3 text-neutral-300 font-semibold">{p.id}</td>
                  <td className="py-2.5 px-3 text-white font-sans">{p.vehiclePlate}</td>
                  <td className="py-2.5 px-3 text-neutral-400">₹{(p.grossAmount || 0).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-red-400">-₹{(p.platformCommission || 0).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold text-xs">₹{(p.netPayout || 0).toLocaleString()}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      p.status === 'paid' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {p.status === 'paid' ? 'Paid to Bank' : 'Pending Transfer'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-neutral-400 font-sans text-[11px]">
                    {p.paidAt ? (
                      <span>{p.transactionRef || 'NEFT Transfer'} ({new Date(p.paidAt).toLocaleDateString()})</span>
                    ) : (
                      <span className="text-amber-400/80">Pending admin transfer</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispute Modal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <LifeBuoy className="h-4 w-4 text-amber-400" />
                <span>Report an Issue or Complaint to Admin</span>
              </div>
              <button onClick={() => setDisputeModalOpen(false)} className="text-neutral-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleDisputeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={disputeTitle}
                  onChange={e => setDisputeTitle(e.target.value)}
                  placeholder="e.g. Damage claim review or payment inquiry"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Related Booking (Optional)</label>
                <select
                  value={disputeBookingId}
                  onChange={e => setDisputeBookingId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">General Support / No specific booking</option>
                  {ownerBookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bookingCode} - {b.vehicle.make} {b.vehicle.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Explain the Issue in Detail</label>
                <textarea
                  required
                  rows={4}
                  value={disputeDescription}
                  onChange={e => setDisputeDescription(e.target.value)}
                  placeholder="Tell us what happened so the admin can help you..."
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold"
                >
                  Send Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
