import React, { useState } from 'react';
import { PayoutRecord, DisputeRecord, PlatformSettings } from '../types/rental';
import { 
  CheckCircle2 
} from 'lucide-react';

interface AdminPayoutsDisputesProps {
  payouts: PayoutRecord[];
  disputes: DisputeRecord[];
  settings: PlatformSettings;
  onExecutePayout: (payoutId: string, transactionRef: string) => void;
  onResolveDispute: (disputeId: string, resolution: string) => void;
  onSaveSettings: (settings: PlatformSettings) => void;
  theme?: 'dark' | 'light';
}

export const AdminPayoutsDisputes: React.FC<AdminPayoutsDisputesProps> = ({
  payouts,
  disputes,
  settings,
  onExecutePayout,
  onResolveDispute,
  onSaveSettings,
  theme = 'dark',
}) => {
  const [subTab, setSubTab] = useState<'payouts' | 'disputes' | 'settings'>('payouts');
  
  // Platform Settings State
  const [commissionRate, setCommissionRate] = useState<number>(settings.commissionRate * 100);
  const [gstRate, setGstRate] = useState<number>(settings.gstRate * 100);
  const [dailyKmAllowance, setDailyKmAllowance] = useState<number>(settings.dailyKmAllowance);
  const [excessKmRate, setExcessKmRate] = useState<number>(settings.excessKmRate);
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  const totalDisbursed = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.netPayout, 0);

  const pendingDisbursement = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.netPayout, 0);

  const openDisputesCount = disputes.filter(d => d.status === 'open').length;

  const handlePayoutClick = (payoutId: string) => {
    const ref = prompt('Enter bank transaction / UPI UTR reference number:');
    if (ref && ref.trim()) {
      onExecutePayout(payoutId, ref.trim());
    }
  };

  const handleResolveClick = (disputeId: string) => {
    const resolution = prompt('Enter resolution message for this complaint:');
    if (resolution && resolution.trim()) {
      onResolveDispute(disputeId, resolution.trim());
    }
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      commissionRate: commissionRate / 100,
      gstRate: gstRate / 100,
      dailyKmAllowance: Number(dailyKmAllowance),
      excessKmRate: Number(excessKmRate),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
      }`}>
        <div>
          <h2 className={`text-xl font-extrabold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Owner Payouts & Complaints</h2>
          <p className={`text-xs mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
            Admin desk: Send bank payouts to car owners, solve customer/owner complaints, and set commission rates.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className={`flex rounded-xl p-1 border text-xs font-semibold ${
          theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-neutral-900 border-neutral-800'
        }`}>
          <button
            onClick={() => setSubTab('payouts')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              subTab === 'payouts'
                ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'bg-neutral-800 text-white')
                : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
            }`}
          >
            Pay Car Owners ({payouts.filter(p => p.status === 'pending').length} pending)
          </button>
          <button
            onClick={() => setSubTab('disputes')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              subTab === 'disputes'
                ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'bg-neutral-800 text-white')
                : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
            }`}
          >
            Complaints ({openDisputesCount})
          </button>
          <button
            onClick={() => setSubTab('settings')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              subTab === 'settings'
                ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'bg-neutral-800 text-white')
                : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
            }`}
          >
            Commission & GST Rules
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PAYOUTS */}
      {subTab === 'payouts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${
              theme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-neutral-900/60 border-neutral-800 text-neutral-100'
            }`}>
              <span className={`text-xs block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>Total Money Paid to Car Owners</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                ₹{(totalDisbursed || 0).toLocaleString()}
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${
              theme === 'light' ? 'bg-amber-50/80 border-amber-200 text-amber-900 shadow-sm' : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
            }`}>
              <span className="text-amber-700 text-xs block font-semibold">Pending Payouts to Pay</span>
              <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
                ₹{(pendingDisbursement || 0).toLocaleString()}
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${
              theme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-neutral-900/60 border-neutral-800 text-neutral-100'
            }`}>
              <span className={`text-xs block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>Fee Split</span>
              <div className={`text-2xl font-bold font-mono mt-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                85% Owner / 15% Platform
              </div>
            </div>
          </div>

          <div className={`rounded-xl border overflow-hidden ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-900/40 border-neutral-800'
          }`}>
            <table className="w-full text-left text-xs">
              <thead className={`font-semibold border-b ${
                theme === 'light' ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
              }`}>
                <tr>
                  <th className="py-2.5 px-3">Car Owner</th>
                  <th className="py-2.5 px-3">Car Plate</th>
                  <th className="py-2.5 px-3">Total Rent</th>
                  <th className="py-2.5 px-3">Platform Fee (15%)</th>
                  <th className="py-2.5 px-3 font-bold text-white">Amount to Pay</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 font-mono text-[11px]">
                {payouts.map(p => (
                  <tr key={p.id} className="hover:bg-neutral-800/40">
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-semibold text-white">{p.ownerName}</div>
                      <div className="text-[10px] text-neutral-500 font-mono">{p.ownerUpiOrBank}</div>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-300">{p.vehiclePlate}</td>
                    <td className="py-2.5 px-3 text-neutral-400">₹{(p.grossAmount || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-emerald-400">+₹{(p.platformCommission || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-white font-bold text-xs">₹{(p.netPayout || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        p.status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {p.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {p.status === 'pending' ? (
                        <button
                          onClick={() => handlePayoutClick(p.id)}
                          className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[10px]"
                        >
                          Mark Paid & Enter UTR
                        </button>
                      ) : (
                        <span className="text-[10px] text-neutral-500 font-sans">{p.transactionRef || 'Completed'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DISPUTES */}
      {subTab === 'disputes' && (
        <div className="space-y-4">
          <div className="space-y-3">
            {disputes.map(d => (
              <div key={d.id} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{d.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      d.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {d.status === 'resolved' ? 'Resolved' : 'Open'}
                    </span>
                  </div>
                  <span className="text-neutral-500 text-[10px]">
                    Filed by {d.reporterName} ({d.raisedBy.toUpperCase()}) &middot; {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-neutral-300 leading-relaxed bg-neutral-950 p-2.5 rounded border border-neutral-850">
                  {d.description}
                </p>

                {d.resolutionNotes ? (
                  <div className="p-2.5 rounded bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 text-[11px]">
                    <strong>Admin Resolution:</strong> {d.resolutionNotes} (by {d.resolvedBy})
                  </div>
                ) : (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleResolveClick(d.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs"
                    >
                      Solve & Close Complaint
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SETTINGS */}
      {subTab === 'settings' && (
        <form onSubmit={handleSettingsSubmit} className="max-w-xl space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 text-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="font-bold text-white text-sm">Platform Commission & GST Rules</h3>
            {settingsSaved && (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Saved successfully!</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-400 mb-1">Platform Fee (%)</label>
              <input
                type="number"
                min="5"
                max="35"
                value={commissionRate}
                onChange={e => setCommissionRate(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white font-mono"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Owner receives {100 - commissionRate}%</span>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">GST Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                max="28"
                value={gstRate}
                onChange={e => setGstRate(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white font-mono"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Added to customer invoice</span>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Default Free KM per Day</label>
              <input
                type="number"
                value={dailyKmAllowance}
                onChange={e => setDailyKmAllowance(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Extra KM Charge (₹/km)</label>
              <input
                type="number"
                value={excessKmRate}
                onChange={e => setExcessKmRate(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-neutral-800">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold"
            >
              Save Settings
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
