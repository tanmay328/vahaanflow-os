import React, { useState, useEffect, useMemo } from 'react';
import { PayoutRecord, DisputeRecord, PlatformSettings } from '../types/rental';
import { 
  CheckCircle2,
  X,
  CreditCard,
  Building2,
  AlertCircle,
  MessageSquare,
  Pencil,
  Sliders,
  Percent,
  User,
  ShieldAlert,
  Search,
  Plus,
  Filter
} from 'lucide-react';

interface AdminPayoutsDisputesProps {
  payouts: PayoutRecord[];
  disputes: DisputeRecord[];
  settings: PlatformSettings;
  onExecutePayout: (payoutId: string, transactionRef: string) => void;
  onResolveDispute: (disputeId: string, resolution: string) => void;
  onSaveSettings: (settings: PlatformSettings) => void;
  onUpdatePendingSplit?: (newCommissionRate: number) => void;
  onReportDispute?: (title: string, description: string, bookingId?: string, raisedBy?: 'admin' | 'owner' | 'renter') => void;
  theme?: 'dark' | 'light';
}

export const AdminPayoutsDisputes: React.FC<AdminPayoutsDisputesProps> = ({
  payouts,
  disputes,
  settings,
  onExecutePayout,
  onResolveDispute,
  onSaveSettings,
  onUpdatePendingSplit,
  onReportDispute,
  theme = 'dark',
}) => {
  const [subTab, setSubTab] = useState<'payouts' | 'disputes' | 'settings'>('payouts');
  
  // Platform Settings State
  const [commissionRate, setCommissionRate] = useState<number>(Math.round(settings.commissionRate * 100));
  const [gstRate, setGstRate] = useState<number>(settings.gstRate * 100);
  const [dailyKmAllowance, setDailyKmAllowance] = useState<number>(settings.dailyKmAllowance);
  const [excessKmRate, setExcessKmRate] = useState<number>(settings.excessKmRate);
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  // Sync when settings prop updates
  useEffect(() => {
    setCommissionRate(Math.round(settings.commissionRate * 100));
    setTempCommissionRate(Math.round(settings.commissionRate * 100));
  }, [settings.commissionRate]);

  // Modal states for Editing Fee Split
  const [showSplitModal, setShowSplitModal] = useState<boolean>(false);
  const [tempCommissionRate, setTempCommissionRate] = useState<number>(Math.round(settings.commissionRate * 100));
  const [recalculatePending, setRecalculatePending] = useState<boolean>(true);

  const totalDisbursed = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.netPayout, 0);

  const pendingDisbursement = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.netPayout, 0);

  const openDisputesCount = disputes.filter(d => d.status === 'open').length;

  // Complaints Switching & Filtering State
  const [disputeSourceFilter, setDisputeSourceFilter] = useState<'all' | 'admin' | 'owner' | 'renter'>('all');
  const [disputeStatusFilter, setDisputeStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [disputeSearchQuery, setDisputeSearchQuery] = useState<string>('');

  // Counts for Complaints Switcher
  const adminDisputesCount = useMemo(() => disputes.filter(d => d.raisedBy === 'admin').length, [disputes]);
  const ownerDisputesCount = useMemo(() => disputes.filter(d => d.raisedBy === 'owner').length, [disputes]);
  const customerDisputesCount = useMemo(() => disputes.filter(d => d.raisedBy === 'renter').length, [disputes]);

  // Filtered Complaints List
  const filteredDisputes = useMemo(() => {
    return disputes.filter(d => {
      if (disputeSourceFilter !== 'all') {
        if (disputeSourceFilter === 'admin' && d.raisedBy !== 'admin') return false;
        if (disputeSourceFilter === 'owner' && d.raisedBy !== 'owner') return false;
        if (disputeSourceFilter === 'renter' && d.raisedBy !== 'renter') return false;
      }
      if (disputeStatusFilter !== 'all' && d.status !== disputeStatusFilter) return false;
      if (disputeSearchQuery.trim()) {
        const q = disputeSearchQuery.toLowerCase();
        const matchTitle = d.title.toLowerCase().includes(q);
        const matchDesc = d.description.toLowerCase().includes(q);
        const matchReporter = d.reporterName.toLowerCase().includes(q);
        const matchBooking = (d.bookingId || '').toLowerCase().includes(q);
        const matchNotes = (d.resolutionNotes || '').toLowerCase().includes(q);
        return matchTitle || matchDesc || matchReporter || matchBooking || matchNotes;
      }
      return true;
    });
  }, [disputes, disputeSourceFilter, disputeStatusFilter, disputeSearchQuery]);

  // Modal states for creating new complaint/change
  const [newComplaintModalOpen, setNewComplaintModalOpen] = useState<boolean>(false);
  const [newComplaintRaisedBy, setNewComplaintRaisedBy] = useState<'admin' | 'owner' | 'renter'>('admin');
  const [newComplaintTitle, setNewComplaintTitle] = useState<string>('');
  const [newComplaintDescription, setNewComplaintDescription] = useState<string>('');
  const [newComplaintBookingId, setNewComplaintBookingId] = useState<string>('');
  const [newComplaintError, setNewComplaintError] = useState<string | null>(null);

  const handleCreateComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComplaintTitle.trim()) {
      setNewComplaintError('Please enter a subject or title.');
      return;
    }
    if (!newComplaintDescription.trim()) {
      setNewComplaintError('Please enter the description of the change or complaint.');
      return;
    }
    if (onReportDispute) {
      onReportDispute(
        newComplaintTitle.trim(),
        newComplaintDescription.trim(),
        newComplaintBookingId.trim() || undefined,
        newComplaintRaisedBy
      );
    }
    setNewComplaintModalOpen(false);
    setNewComplaintTitle('');
    setNewComplaintDescription('');
    setNewComplaintBookingId('');
    setNewComplaintError(null);
  };

  // Modal states for Payout UTR entry
  const [selectedPayoutForUtr, setSelectedPayoutForUtr] = useState<PayoutRecord | null>(null);
  const [utrInput, setUtrInput] = useState<string>('');
  const [utrError, setUtrError] = useState<string | null>(null);

  // Modal states for Dispute Resolution
  const [selectedDisputeForResolution, setSelectedDisputeForResolution] = useState<DisputeRecord | null>(null);
  const [resolutionInput, setResolutionInput] = useState<string>('');
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  const handleOpenPayoutModal = (payout: PayoutRecord) => {
    setSelectedPayoutForUtr(payout);
    setUtrInput(`UTR-${Date.now().toString().slice(-8)}`);
    setUtrError(null);
  };

  const handleConfirmPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayoutForUtr) return;
    if (!utrInput.trim()) {
      setUtrError('Please enter a bank transaction or UPI UTR reference number.');
      return;
    }
    onExecutePayout(selectedPayoutForUtr.id, utrInput.trim());
    setSelectedPayoutForUtr(null);
    setUtrInput('');
    setUtrError(null);
  };

  const handleOpenResolveModal = (dispute: DisputeRecord) => {
    setSelectedDisputeForResolution(dispute);
    setResolutionInput('Reviewed and refunded / adjusted amicably with user.');
    setResolutionError(null);
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisputeForResolution) return;
    if (!resolutionInput.trim()) {
      setResolutionError('Please enter a resolution message before closing.');
      return;
    }
    onResolveDispute(selectedDisputeForResolution.id, resolutionInput.trim());
    setSelectedDisputeForResolution(null);
    setResolutionInput('');
    setResolutionError(null);
  };

  const handleSaveSplit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRateDecimal = tempCommissionRate / 100;
    setCommissionRate(tempCommissionRate);
    onSaveSettings({
      ...settings,
      commissionRate: newRateDecimal,
    });
    if (recalculatePending && onUpdatePendingSplit) {
      onUpdatePendingSplit(newRateDecimal);
    }
    setShowSplitModal(false);
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
            {/* Fee Split Card with Edit Split Ability */}
            <div className={`p-4 rounded-xl border relative transition-all ${
              theme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-neutral-900/60 border-neutral-800 text-neutral-100'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>Fee Split</span>
                <button
                  type="button"
                  onClick={() => {
                    setTempCommissionRate(Math.round(commissionRate));
                    setShowSplitModal(true);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer border shadow-sm ${
                    theme === 'light'
                      ? 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-700'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-400'
                  }`}
                  title="Edit owner and platform commission percentage"
                >
                  <Pencil className="h-3 w-3" />
                  <span>Edit Split</span>
                </button>
              </div>
              <div className={`text-2xl font-bold font-mono mt-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                {100 - Math.round(commissionRate)}% Owner / {Math.round(commissionRate)}% Platform
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${100 - Math.round(commissionRate)}%` }}
                    className="h-full bg-emerald-500 transition-all duration-300"
                    title={`Owner: ${100 - Math.round(commissionRate)}%`}
                  />
                  <div
                    style={{ width: `${Math.round(commissionRate)}%` }}
                    className="h-full bg-blue-500 transition-all duration-300"
                    title={`Platform: ${Math.round(commissionRate)}%`}
                  />
                </div>
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
                  <th className="py-2.5 px-3">Platform Fee ({Math.round(commissionRate)}%)</th>
                  <th className={`py-2.5 px-3 font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Amount to Pay</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-mono text-[11px] ${theme === 'light' ? 'divide-slate-200' : 'divide-neutral-800'}`}>
                {payouts.map(p => (
                  <tr key={p.id} className={theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-neutral-800/40'}>
                    <td className="py-2.5 px-3 font-sans">
                      <div className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{p.ownerName}</div>
                      <div className={`text-[10px] font-mono ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>{p.ownerUpiOrBank}</div>
                    </td>
                    <td className={`py-2.5 px-3 font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>{p.vehiclePlate}</td>
                    <td className={`py-2.5 px-3 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>₹{(p.grossAmount || 0).toLocaleString()}</td>
                    <td className={`py-2.5 px-3 font-medium ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>+₹{(p.platformCommission || 0).toLocaleString()}</td>
                    <td className={`py-2.5 px-3 font-bold text-xs ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>₹{(p.netPayout || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        p.status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      }`}>
                        {p.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {p.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPayoutModal(p)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[11px] transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          Mark Paid & Enter UTR
                        </button>
                      ) : (
                        <span className={`text-[10px] font-sans ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>{p.transactionRef || 'Completed'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DISPUTES & COMPLAINTS */}
      {subTab === 'disputes' && (
        <div className="space-y-4">
          {/* Top Organization Switch Bar */}
          <div className={`p-3 rounded-xl border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 ${
            theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-900/70 border-neutral-800'
          }`}>
            {/* The Switch requested by user for switching changes made by admin / owner / customer */}
            <div className={`flex flex-wrap items-center p-1 rounded-xl border gap-1 text-xs font-semibold ${
              theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-neutral-950 border-neutral-800'
            }`}>
              <button
                type="button"
                onClick={() => setDisputeSourceFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  disputeSourceFilter === 'all'
                    ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'bg-neutral-800 text-white shadow-sm font-bold')
                    : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
                }`}
              >
                <span>All Complaints</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  disputeSourceFilter === 'all'
                    ? (theme === 'light' ? 'bg-slate-200 text-slate-900 font-bold' : 'bg-neutral-700 text-white')
                    : (theme === 'light' ? 'bg-slate-200/80 text-slate-600' : 'bg-neutral-800 text-neutral-400')
                }`}>
                  {disputes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDisputeSourceFilter('admin')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  disputeSourceFilter === 'admin'
                    ? (theme === 'light' ? 'bg-white text-indigo-950 shadow-sm ring-1 ring-indigo-400 font-bold' : 'bg-neutral-800 text-indigo-300 shadow-sm ring-1 ring-indigo-500/50 font-bold')
                    : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>changes made by admin</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  disputeSourceFilter === 'admin'
                    ? (theme === 'light' ? 'bg-indigo-100 text-indigo-900 font-bold' : 'bg-indigo-500/30 text-indigo-200')
                    : (theme === 'light' ? 'bg-slate-200/80 text-slate-600' : 'bg-neutral-800 text-neutral-400')
                }`}>
                  {adminDisputesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDisputeSourceFilter('owner')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  disputeSourceFilter === 'owner'
                    ? (theme === 'light' ? 'bg-white text-amber-950 shadow-sm ring-1 ring-amber-400 font-bold' : 'bg-neutral-800 text-amber-300 shadow-sm ring-1 ring-amber-500/50 font-bold')
                    : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
                }`}
              >
                <Building2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>changes made by owner</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  disputeSourceFilter === 'owner'
                    ? (theme === 'light' ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-amber-500/30 text-amber-200')
                    : (theme === 'light' ? 'bg-slate-200/80 text-slate-600' : 'bg-neutral-800 text-neutral-400')
                }`}>
                  {ownerDisputesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDisputeSourceFilter('renter')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  disputeSourceFilter === 'renter'
                    ? (theme === 'light' ? 'bg-white text-emerald-950 shadow-sm ring-1 ring-emerald-400 font-bold' : 'bg-neutral-800 text-emerald-300 shadow-sm ring-1 ring-emerald-500/50 font-bold')
                    : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
                }`}
              >
                <User className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>changes made by customer</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  disputeSourceFilter === 'renter'
                    ? (theme === 'light' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-emerald-500/30 text-emerald-200')
                    : (theme === 'light' ? 'bg-slate-200/80 text-slate-600' : 'bg-neutral-800 text-neutral-400')
                }`}>
                  {customerDisputesCount}
                </span>
              </button>
            </div>

            {/* Search, Status & Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-52 min-w-[140px]">
                <Search className={`absolute left-2.5 top-2.5 h-3.5 w-3.5 ${theme === 'light' ? 'text-slate-400' : 'text-neutral-500'}`} />
                <input
                  type="text"
                  value={disputeSearchQuery}
                  onChange={e => setDisputeSearchQuery(e.target.value)}
                  placeholder="Search complaints, title, notes..."
                  className={`w-full rounded-lg border pl-8 pr-2.5 py-1.5 text-xs transition-colors focus:outline-none ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
                      : 'bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-500 focus:border-emerald-500'
                  }`}
                />
              </div>

              <select
                value={disputeStatusFilter}
                onChange={e => setDisputeStatusFilter(e.target.value as 'all' | 'open' | 'resolved')}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium focus:outline-none ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : 'bg-neutral-950 border-neutral-800 text-white'
                }`}
              >
                <option value="all">All Status</option>
                <option value="open">Open Only ({openDisputesCount})</option>
                <option value="resolved">Resolved Only</option>
              </select>

              {onReportDispute && (
                <button
                  type="button"
                  onClick={() => setNewComplaintModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Record Complaint / Change</span>
                </button>
              )}
            </div>
          </div>

          {/* Complaints Cards List */}
          <div className="space-y-3">
            {filteredDisputes.length === 0 ? (
              <div className={`p-8 text-center rounded-xl border ${
                theme === 'light' ? 'bg-white border-slate-200 text-slate-600' : 'bg-neutral-900/40 border-neutral-800 text-neutral-400'
              }`}>
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                <p className="font-semibold text-sm">No complaints found</p>
                <p className="text-xs mt-1">
                  {disputeSourceFilter !== 'all' 
                    ? `No complaints or adjustments filed under "${disputeSourceFilter === 'admin' ? 'changes made by admin' : disputeSourceFilter === 'owner' ? 'changes made by owner' : 'changes made by customer'}".`
                    : 'No complaints match the current filter or search keyword.'}
                </p>
              </div>
            ) : (
              filteredDisputes.map(d => (
                <div key={d.id} className={`rounded-xl border p-4 space-y-3 text-xs transition-all ${
                  theme === 'light' ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300' : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-bold text-sm ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{d.title}</span>

                      {/* Origin Badge */}
                      {d.raisedBy === 'admin' && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          theme === 'light'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          <ShieldAlert className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span>changes made by admin</span>
                        </span>
                      )}
                      {d.raisedBy === 'owner' && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          theme === 'light'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          <Building2 className="h-3 w-3 text-amber-500 shrink-0" />
                          <span>changes made by owner</span>
                        </span>
                      )}
                      {d.raisedBy === 'renter' && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          theme === 'light'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          <User className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>changes made by customer</span>
                        </span>
                      )}

                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                        d.status === 'resolved' 
                          ? (theme === 'light' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')
                          : (theme === 'light' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-500/10 text-rose-400 border-rose-500/20')
                      }`}>
                        {d.status === 'resolved' ? '✓ Resolved' : '● Open'}
                      </span>
                    </div>

                    <div className={`flex items-center gap-2 text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                      {d.bookingId && d.bookingId !== 'General' && (
                        <span className={`font-mono px-1.5 py-0.5 rounded border text-[10px] ${
                          theme === 'light' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                        }`}>
                          #{d.bookingId}
                        </span>
                      )}
                      <span>
                        Filed by <strong className={theme === 'light' ? 'text-slate-800' : 'text-neutral-200'}>{d.reporterName}</strong> &middot; {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <p className={`leading-relaxed p-3 rounded-lg border ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-neutral-950 border-neutral-850 text-neutral-300'
                  }`}>
                    {d.description}
                  </p>

                  {d.resolutionNotes ? (
                    <div className={`p-3 rounded-lg text-[11px] border ${
                      theme === 'light' 
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    }`}>
                      <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-700 mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Administrative Resolution:</span>
                      </div>
                      <div>{d.resolutionNotes}</div>
                      <div className={`mt-1 text-[10px] opacity-80 ${theme === 'light' ? 'text-emerald-800' : 'text-emerald-400'}`}>
                        Settled by {d.resolvedBy || 'Admin Desk'} {d.resolvedAt ? `on ${new Date(d.resolvedAt).toLocaleDateString()}` : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenResolveModal(d)}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer shadow-sm active:scale-95"
                      >
                        Solve & Close Complaint
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SETTINGS */}
      {subTab === 'settings' && (
        <form onSubmit={handleSettingsSubmit} className={`max-w-xl space-y-4 rounded-xl border p-5 text-xs ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'border-neutral-800 bg-neutral-900/60'
        }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${
            theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
          }`}>
            <h3 className={`font-bold text-sm ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Platform Commission & GST Rules</h3>
            {settingsSaved && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Saved successfully!</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1 font-medium ${theme === 'light' ? 'text-slate-700' : 'text-neutral-400'}`}>Platform Fee (%)</label>
              <input
                type="number"
                min="5"
                max="35"
                value={commissionRate}
                onChange={e => setCommissionRate(Number(e.target.value))}
                className={`w-full rounded-lg border px-3 py-2 font-mono ${
                  theme === 'light'
                    ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none'
                }`}
              />
              <span className={`text-[10px] mt-0.5 block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>Owner receives {100 - commissionRate}%</span>
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'light' ? 'text-slate-700' : 'text-neutral-400'}`}>GST Tax Rate (%)</label>
              <input
                type="number"
                min="0"
                max="28"
                value={gstRate}
                onChange={e => setGstRate(Number(e.target.value))}
                className={`w-full rounded-lg border px-3 py-2 font-mono ${
                  theme === 'light'
                    ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none'
                }`}
              />
              <span className={`text-[10px] mt-0.5 block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>Added to customer invoice</span>
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'light' ? 'text-slate-700' : 'text-neutral-400'}`}>Default Free KM per Day</label>
              <input
                type="number"
                value={dailyKmAllowance}
                onChange={e => setDailyKmAllowance(Number(e.target.value))}
                className={`w-full rounded-lg border px-3 py-2 font-mono ${
                  theme === 'light'
                    ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none'
                }`}
              />
            </div>

            <div>
              <label className={`block mb-1 font-medium ${theme === 'light' ? 'text-slate-700' : 'text-neutral-400'}`}>Extra KM Charge (₹/km)</label>
              <input
                type="number"
                value={excessKmRate}
                onChange={e => setExcessKmRate(Number(e.target.value))}
                className={`w-full rounded-lg border px-3 py-2 font-mono ${
                  theme === 'light'
                    ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-950 text-white focus:border-emerald-500 focus:outline-none'
                }`}
              />
            </div>
          </div>

          <div className={`flex justify-end pt-3 border-t ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold transition-colors cursor-pointer shadow-sm"
            >
              Save Settings
            </button>
          </div>
        </form>
      )}

      {/* Payout UTR Modal Dialog */}
      {selectedPayoutForUtr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'border-neutral-800 bg-neutral-900 text-neutral-100'
          }`}>
            
            <div className={`flex items-center justify-between border-b pb-3 ${
              theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Disburse Owner Payout</h3>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>Record bank transfer & mark payout as paid</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayoutForUtr(null)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  theme === 'light' ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Payout Summary Info */}
            <div className={`rounded-xl border p-3.5 space-y-2 text-xs ${
              theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-neutral-950/70 border-neutral-800 text-neutral-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}>Car Owner:</span>
                <span className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{selectedPayoutForUtr.ownerName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}>Owner Bank / UPI ID:</span>
                <span className="font-mono text-emerald-600 font-semibold">{selectedPayoutForUtr.ownerUpiOrBank}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}>Car Number Plate:</span>
                <span className={`font-mono font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>{selectedPayoutForUtr.vehiclePlate}</span>
              </div>
              <div className={`flex items-center justify-between border-t pt-2 ${
                theme === 'light' ? 'border-slate-200' : 'border-neutral-800/80'
              }`}>
                <span className={`font-medium ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>Net Amount to Disburse:</span>
                <span className="text-base font-extrabold text-emerald-600 font-mono">
                  ₹{(selectedPayoutForUtr.netPayout || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmPayout} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`text-xs font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                    Bank Transaction / UPI UTR Reference:
                  </label>
                  <button
                    type="button"
                    onClick={() => setUtrInput(`UTR-HDFC-${Math.floor(100000 + Math.random() * 900000)}`)}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                  >
                    + Auto-fill Mock UTR
                  </button>
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={utrInput}
                  onChange={e => {
                    setUtrInput(e.target.value);
                    if (utrError) setUtrError(null);
                  }}
                  placeholder="e.g. UTR429810481239 or PAYOUT-HDFC-991204"
                  className={`w-full rounded-lg border px-3 py-2 font-mono text-xs focus:border-emerald-500 focus:outline-none ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
                      : 'border-neutral-800 bg-neutral-950 text-white placeholder:text-neutral-500'
                  }`}
                />
                {utrError && (
                  <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{utrError}</span>
                  </p>
                )}
              </div>

              <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
                theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
              }`}>
                <button
                  type="button"
                  onClick={() => setSelectedPayoutForUtr(null)}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  Confirm Payout & Mark Paid
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Dispute Resolution Modal Dialog */}
      {selectedDisputeForResolution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'border-neutral-800 bg-neutral-900 text-neutral-100'
          }`}>
            
            <div className={`flex items-center justify-between border-b pb-3 ${
              theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Resolve Complaint</h3>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>Record administrative resolution and close</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDisputeForResolution(null)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  theme === 'light' ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className={`rounded-xl border p-3.5 space-y-1.5 text-xs ${
              theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-neutral-950/70 border-neutral-800 text-neutral-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}>Subject:</span>
                <span className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{selectedDisputeForResolution.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}>Filed by:</span>
                <span className={`font-medium ${theme === 'light' ? 'text-slate-700' : 'text-neutral-200'}`}>{selectedDisputeForResolution.reporterName}</span>
              </div>
              <p className={`text-[11px] p-2 rounded border mt-2 ${
                theme === 'light' ? 'bg-white border-slate-200 text-slate-700' : 'bg-neutral-900/80 border-neutral-800 text-neutral-400'
              }`}>
                "{selectedDisputeForResolution.description}"
              </p>
            </div>

            <form onSubmit={handleConfirmResolve} className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                  Resolution Message / Notes:
                </label>
                <textarea
                  required
                  autoFocus
                  rows={3}
                  value={resolutionInput}
                  onChange={e => {
                    setResolutionInput(e.target.value);
                    if (resolutionError) setResolutionError(null);
                  }}
                  placeholder="Describe how the complaint was investigated and settled..."
                  className={`w-full rounded-lg border p-2.5 text-xs focus:border-emerald-500 focus:outline-none ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
                      : 'border-neutral-800 bg-neutral-950 text-white placeholder:text-neutral-500'
                  }`}
                />
                {resolutionError && (
                  <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{resolutionError}</span>
                  </p>
                )}
              </div>

              <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
                theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
              }`}>
                <button
                  type="button"
                  onClick={() => setSelectedDisputeForResolution(null)}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  Resolve & Close Complaint
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Fee Split Edit Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'border-neutral-800 bg-neutral-900 text-neutral-100'
          }`}>
            
            <div className={`flex items-center justify-between border-b pb-3 ${
              theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Edit Owner & Platform Fee Split</h3>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>Configure platform commission and owner earnings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  theme === 'light' ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Visual Split Ratio Bar */}
            <div className={`rounded-xl border p-4 space-y-3 ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950/70 border-neutral-800'
            }`}>
              <div className="flex items-center justify-between font-mono text-sm font-bold">
                <span className={theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}>
                  {100 - tempCommissionRate}% Owner
                </span>
                <span className={theme === 'light' ? 'text-blue-700' : 'text-blue-400'}>
                  {tempCommissionRate}% Platform
                </span>
              </div>

              {/* Progress bar */}
              <div className={`h-3 w-full rounded-full overflow-hidden flex shadow-inner ${
                theme === 'light' ? 'bg-slate-200' : 'bg-neutral-800'
              }`}>
                <div
                  style={{ width: `${100 - tempCommissionRate}%` }}
                  className="h-full bg-emerald-500 transition-all duration-150"
                />
                <div
                  style={{ width: `${tempCommissionRate}%` }}
                  className="h-full bg-blue-500 transition-all duration-150"
                />
              </div>

              <div className={`flex items-center justify-between text-[11px] font-medium ${
                theme === 'light' ? 'text-slate-600' : 'text-neutral-400'
              }`}>
                <span>Owner: ₹{((100 - tempCommissionRate) * 100).toLocaleString()} / ₹10,000</span>
                <span>Platform: ₹{(tempCommissionRate * 100).toLocaleString()}</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label className={`block text-xs mb-1.5 font-medium ${
                theme === 'light' ? 'text-slate-700' : 'text-neutral-400'
              }`}>Quick Presets:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { owner: 90, platform: 10 },
                  { owner: 85, platform: 15 },
                  { owner: 80, platform: 20 },
                  { owner: 75, platform: 25 },
                ].map(preset => (
                  <button
                    key={preset.platform}
                    type="button"
                    onClick={() => setTempCommissionRate(preset.platform)}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                      tempCommissionRate === preset.platform
                        ? (theme === 'light' ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500' : 'border-emerald-500 bg-emerald-500/20 text-emerald-300')
                        : (theme === 'light' ? 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:border-neutral-700')
                    }`}
                  >
                    {preset.owner}/{preset.platform}
                  </button>
                ))}
              </div>
            </div>

            {/* Slider & Custom Input */}
            <form onSubmit={handleSaveSplit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                    Platform Commission Rate (%):
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={tempCommissionRate}
                      onChange={e => {
                        const val = Math.max(0, Math.min(50, Number(e.target.value)));
                        setTempCommissionRate(isNaN(val) ? 0 : val);
                      }}
                      className={`w-16 rounded-md border px-2 py-1 text-right font-mono text-xs focus:border-emerald-500 focus:outline-none ${
                        theme === 'light'
                          ? 'border-slate-300 bg-white text-slate-900 font-bold'
                          : 'border-neutral-700 bg-neutral-950 text-white'
                      }`}
                    />
                    <span className={`text-xs font-mono ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>%</span>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={tempCommissionRate}
                  onChange={e => setTempCommissionRate(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className={`flex justify-between text-[10px] font-mono ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>
                  <span>0% (All to Owner)</span>
                  <span>15% (Standard)</span>
                  <span>50% (Max)</span>
                </div>
              </div>

              {/* Recalculate Pending Payouts Option */}
              <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs ${
                theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/60'
              }`}>
                <input
                  type="checkbox"
                  checked={recalculatePending}
                  onChange={e => setRecalculatePending(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 accent-emerald-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className={`font-semibold block ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Apply to pending owner payouts</span>
                  <span className={`text-[11px] block leading-tight ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                    Instantly update the platform fee and net amount for existing unpaid bookings.
                  </span>
                </div>
              </label>

              <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
                theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowSplitModal(false)}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  Save & Apply Split
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Record New Complaint / Change Modal */}
      {newComplaintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'border-neutral-800 bg-neutral-900 text-neutral-100'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Record New Complaint or Change</h3>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>Log an incident, penalty review, or manual operational adjustment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewComplaintModalOpen(false);
                  setNewComplaintError(null);
                }}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  theme === 'light' ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="space-y-3.5 text-xs">
              <div>
                <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                  Initiator / Source:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewComplaintRaisedBy('admin')}
                    className={`p-2 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                      newComplaintRaisedBy === 'admin'
                        ? (theme === 'light' ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm' : 'border-indigo-500 bg-indigo-500/20 text-indigo-300')
                        : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white')
                    }`}
                  >
                    changes made by admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewComplaintRaisedBy('owner')}
                    className={`p-2 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                      newComplaintRaisedBy === 'owner'
                        ? (theme === 'light' ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm' : 'border-amber-500 bg-amber-500/20 text-amber-300')
                        : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white')
                    }`}
                  >
                    changes made by owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewComplaintRaisedBy('renter')}
                    className={`p-2 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                      newComplaintRaisedBy === 'renter'
                        ? (theme === 'light' ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm' : 'border-emerald-500 bg-emerald-500/20 text-emerald-300')
                        : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100' : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white')
                    }`}
                  >
                    changes made by customer
                  </button>
                </div>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                  Subject / Title:
                </label>
                <input
                  type="text"
                  required
                  value={newComplaintTitle}
                  onChange={e => {
                    setNewComplaintTitle(e.target.value);
                    if (newComplaintError) setNewComplaintError(null);
                  }}
                  placeholder="e.g. Late return penalty assessment or Toll reconciliation"
                  className={`w-full rounded-lg border px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
                      : 'border-neutral-800 bg-neutral-950 text-white placeholder:text-neutral-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                  Related Booking ID or Vehicle Plate (Optional):
                </label>
                <input
                  type="text"
                  value={newComplaintBookingId}
                  onChange={e => setNewComplaintBookingId(e.target.value)}
                  placeholder="e.g. VLC-IN-8908 or KA 05 MN 4921"
                  className={`w-full rounded-lg border px-3 py-2 text-xs font-mono focus:border-emerald-500 focus:outline-none ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
                      : 'border-neutral-800 bg-neutral-950 text-white placeholder:text-neutral-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                  Description & Details:
                </label>
                <textarea
                  required
                  rows={3}
                  value={newComplaintDescription}
                  onChange={e => {
                    setNewComplaintDescription(e.target.value);
                    if (newComplaintError) setNewComplaintError(null);
                  }}
                  placeholder="Provide context, financial adjustments, or issue specifics..."
                  className={`w-full rounded-lg border p-2.5 text-xs focus:border-emerald-500 focus:outline-none ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400'
                      : 'border-neutral-800 bg-neutral-950 text-white placeholder:text-neutral-500'
                  }`}
                />
              </div>

              {newComplaintError && (
                <p className="text-red-500 text-[11px] flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{newComplaintError}</span>
                </p>
              )}

              <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
                theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
              }`}>
                <button
                  type="button"
                  onClick={() => setNewComplaintModalOpen(false)}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  Save & Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
