import React, { useState, useMemo } from 'react';
import { UserProfile } from '../types/auth';
import { Vehicle, Booking } from '../types/rental';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  User, 
  Building2, 
  Car, 
  Calendar, 
  AlertTriangle, 
  Lock, 
  Unlock,
  CheckCircle2,
  X,
  Phone,
  Mail
} from 'lucide-react';

interface UserAccessControlProps {
  users: UserProfile[];
  vehicles: Vehicle[];
  bookings: Booking[];
  onSuspendUser: (userId: string, reason: string) => Promise<void>;
  onReactivateUser: (userId: string) => Promise<void>;
  theme?: 'dark' | 'light';
}

export const UserAccessControl: React.FC<UserAccessControlProps> = ({
  users,
  vehicles,
  bookings,
  onSuspendUser,
  onReactivateUser,
  theme = 'dark',
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'renter' | 'suspended'>('all');
  
  // Suspend Modal Target
  const [suspendingUser, setSuspendingUser] = useState<UserProfile | null>(null);
  const [suspensionReason, setSuspensionReason] = useState<string>('Violation of platform policy / vehicle misuse');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter out admins (Admin can never be listed/suspended)
  const nonAdminUsers = useMemo(() => {
    return users.filter(u => u.role !== 'admin' && u.email.toLowerCase() !== 'tanmayrajaura28@gmail.com');
  }, [users]);

  // Scoped & Filtered Users
  const filteredUsers = useMemo(() => {
    return nonAdminUsers.filter(u => {
      const isSuspended = u.approvalStatus === 'suspended' || u.ownerDetails?.approvalStatus === 'suspended';

      // Role Filter
      if (roleFilter === 'owner' && u.role !== 'vehicle_owner') return false;
      if (roleFilter === 'renter' && u.role !== 'renter') return false;
      if (roleFilter === 'suspended' && !isSuspended) return false;

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchPhone = (u.phone || '').toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone;
      }

      return true;
    });
  }, [nonAdminUsers, roleFilter, searchQuery]);

  const ownersCount = useMemo(() => nonAdminUsers.filter(u => u.role === 'vehicle_owner').length, [nonAdminUsers]);
  const customersCount = useMemo(() => nonAdminUsers.filter(u => u.role === 'renter').length, [nonAdminUsers]);
  const suspendedCount = useMemo(() => nonAdminUsers.filter(u => u.approvalStatus === 'suspended' || u.ownerDetails?.approvalStatus === 'suspended').length, [nonAdminUsers]);

  const handleConfirmSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendingUser) return;

    const finalReason = suspensionReason === 'Other' ? customReason.trim() : suspensionReason;
    if (!finalReason) return;

    setIsSubmitting(true);
    try {
      await onSuspendUser(suspendingUser.id, finalReason);
      setSuspendingUser(null);
      setCustomReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-xl font-extrabold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              User Access Control Desk
            </h2>
            <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>ADMIN PRIVILEGED</span>
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
            Manage platform permissions, suspend violating accounts, and review active car owners and customers.
          </p>
        </div>

        {/* Total Badge Summary */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
            theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-neutral-900 border-neutral-800 text-neutral-200'
          }`}>
            <User className="h-4 w-4 text-emerald-500" />
            <span>Total Accounts: <strong>{nonAdminUsers.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Filter and Role Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-2.5 h-4 w-4 ${theme === 'light' ? 'text-slate-400' : 'text-neutral-500'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search account name, email address, or phone number..."
            className={`w-full rounded-xl border pl-9 pr-3 py-2 text-xs transition-colors focus:outline-none ${
              theme === 'light'
                ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                : 'bg-neutral-900/80 border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500'
            }`}
          />
        </div>

        {/* Filter Pills */}
        <div className={`p-1 rounded-xl border flex items-center gap-1 ${
          theme === 'light' ? 'bg-slate-100/80 border-slate-200' : 'bg-neutral-900/80 border-neutral-800'
        }`}>
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === 'all'
                ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'bg-neutral-800 text-white shadow-sm font-bold')
                : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
            }`}
          >
            All ({nonAdminUsers.length})
          </button>

          <button
            type="button"
            onClick={() => setRoleFilter('owner')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              roleFilter === 'owner'
                ? (theme === 'light' ? 'bg-white text-teal-900 shadow-sm font-bold ring-1 ring-teal-300' : 'bg-neutral-800 text-teal-300 shadow-sm font-bold ring-1 ring-teal-500/50')
                : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-teal-500" />
            <span>Owners ({ownersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setRoleFilter('renter')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              roleFilter === 'renter'
                ? (theme === 'light' ? 'bg-white text-blue-900 shadow-sm font-bold ring-1 ring-blue-300' : 'bg-neutral-800 text-blue-300 shadow-sm font-bold ring-1 ring-blue-500/50')
                : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
            }`}
          >
            <User className="h-3.5 w-3.5 text-blue-500" />
            <span>Customers ({customersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setRoleFilter('suspended')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              roleFilter === 'suspended'
                ? (theme === 'light' ? 'bg-rose-100 text-rose-900 font-bold' : 'bg-rose-500/20 text-rose-300 font-bold ring-1 ring-rose-500/40')
                : (theme === 'light' ? 'text-rose-600 hover:bg-rose-50' : 'text-rose-400 hover:bg-rose-500/10')
            }`}
          >
            <Lock className="h-3.5 w-3.5 text-rose-500" />
            <span>Suspended ({suspendedCount})</span>
          </button>
        </div>
      </div>

      {/* Users Access Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-900/40 border-neutral-800'
      }`}>
        <table className="w-full text-left text-xs">
          <thead className={`font-semibold border-b ${
            theme === 'light' ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
          }`}>
            <tr>
              <th className="py-3 px-4">User Details</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Contact Phone</th>
              <th className="py-3 px-4">Join Date</th>
              <th className="py-3 px-4">Platform Activity Metric</th>
              <th className="py-3 px-4">Account Status</th>
              <th className="py-3 px-4 text-right">Access Action</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${
            theme === 'light' ? 'divide-slate-100' : 'divide-neutral-800/80'
          }`}>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className={`py-12 text-center text-xs ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                  No user accounts found matching your selected search or status filters.
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => {
                const isOwner = u.role === 'vehicle_owner';
                const isSuspended = u.approvalStatus === 'suspended' || u.ownerDetails?.approvalStatus === 'suspended';

                // Calculate metrics
                const carCount = vehicles.filter(v => v.ownerId === u.id || (v.ownerEmail && v.ownerEmail.toLowerCase() === u.email.toLowerCase())).length;
                const bookingCount = bookings.filter(b => b.customerId === u.id || (b.customer?.email && b.customer.email.toLowerCase() === u.email.toLowerCase())).length;

                return (
                  <tr key={u.id} className={`transition-colors ${
                    isSuspended 
                      ? (theme === 'light' ? 'bg-rose-50/50 hover:bg-rose-50' : 'bg-rose-950/20 hover:bg-rose-950/30')
                      : (theme === 'light' ? 'hover:bg-slate-50/80' : 'hover:bg-neutral-800/40')
                  }`}>
                    
                    {/* User Details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl border flex items-center justify-center font-bold shrink-0 ${
                          isSuspended 
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                            : (isOwner 
                                ? (theme === 'light' ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-teal-500/10 border-teal-500/20 text-teal-400')
                                : (theme === 'light' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'))
                        }`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={`font-bold flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                            <span>{u.name}</span>
                          </div>
                          <div className={`text-[11px] font-mono flex items-center gap-1 ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                            <Mail className="h-3 w-3 shrink-0" />
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        isOwner 
                          ? (theme === 'light' ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-teal-500/10 text-teal-300 border-teal-500/30')
                          : (theme === 'light' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-blue-500/10 text-blue-300 border-blue-500/30')
                      }`}>
                        {isOwner ? <Building2 className="h-3.5 w-3.5 text-teal-500" /> : <User className="h-3.5 w-3.5 text-blue-500" />}
                        <span>{isOwner ? 'Car Owner' : 'Customer'}</span>
                      </span>
                    </td>

                    {/* Contact Phone */}
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {u.phone ? (
                        <div className={`flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{u.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-sans italic text-[11px]">Not provided</span>
                      )}
                    </td>

                    {/* Join Date */}
                    <td className="py-3.5 px-4 font-mono text-xs">
                      <div className={`flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : (u.ownerDetails?.joinedDate || 'Recent')}
                        </span>
                      </div>
                    </td>

                    {/* Metric */}
                    <td className="py-3.5 px-4 font-mono">
                      {isOwner ? (
                        <div className={`flex items-center gap-1.5 font-bold ${theme === 'light' ? 'text-teal-700' : 'text-teal-400'}`}>
                          <Car className="h-3.5 w-3.5 stroke-[2.5]" />
                          <span>{carCount} {carCount === 1 ? 'Car Registered' : 'Cars Registered'}</span>
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1.5 font-bold ${theme === 'light' ? 'text-blue-700' : 'text-blue-400'}`}>
                          <Calendar className="h-3.5 w-3.5 stroke-[2.5]" />
                          <span>{bookingCount} {bookingCount === 1 ? 'Trip Booked' : 'Trips Booked'}</span>
                        </div>
                      )}
                    </td>

                    {/* Account Status */}
                    <td className="py-3.5 px-4">
                      {isSuspended ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            <Lock className="h-3 w-3" />
                            <span>Suspended</span>
                          </span>
                          {u.suspensionReason && (
                            <p className="text-[10px] text-rose-500 font-sans italic max-w-xs truncate" title={u.suspensionReason}>
                              "{u.suspensionReason}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Active</span>
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      {isSuspended ? (
                        <button
                          type="button"
                          onClick={() => onReactivateUser(u.id)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto ${
                            theme === 'light'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          <Unlock className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Reactivate Account</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSuspendingUser(u);
                            setSuspensionReason('Violation of platform policy / vehicle misuse');
                            setCustomReason('');
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto ${
                            theme === 'light'
                              ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                          }`}
                        >
                          <Lock className="h-3.5 w-3.5 text-rose-500" />
                          <span>Suspend</span>
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* SUSPEND USER MODAL */}
      {suspendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-5 transition-all duration-300 ${
            theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900 text-neutral-100'
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    Suspend User Account
                  </h3>
                  <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                    {suspendingUser.name} ({suspendingUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSuspendingUser(null)}
                className={`p-1 rounded-lg transition-colors ${
                  theme === 'light' ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Warning Callout */}
            <div className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1 ${
              theme === 'light' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Account Access Suspension</span>
              </div>
              <p>
                Suspending <strong>{suspendingUser.name}</strong> will immediately terminate active sessions and block them from logging in.
              </p>
              {suspendingUser.role === 'vehicle_owner' && (
                <p className="font-semibold text-rose-600">
                  ℹ️ All cars owned by this owner will be hidden from customer search results until reactivated.
                </p>
              )}
            </div>

            {/* Reason Form */}
            <form onSubmit={handleConfirmSuspend} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className={`block font-bold uppercase tracking-wider text-[11px] ${
                  theme === 'light' ? 'text-slate-800' : 'text-white'
                }`}>
                  Reason for Suspension <span className="text-rose-500">*</span>
                </label>
                <select
                  value={suspensionReason}
                  onChange={e => setSuspensionReason(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-rose-500'
                      : 'border-neutral-800 bg-neutral-950 text-white focus:border-rose-500'
                  }`}
                >
                  <option value="Violation of platform policy / vehicle misuse">Violation of platform policy / vehicle misuse</option>
                  <option value="Unpaid dues or invalid identity documentation">Unpaid dues or invalid identity documentation</option>
                  <option value="Multiple customer complaints or safety violations">Multiple customer complaints or safety violations</option>
                  <option value="Fraudulent activity or fake listing submission">Fraudulent activity or fake listing submission</option>
                  <option value="Other">Other reason (Specify below)</option>
                </select>

                {suspensionReason === 'Other' && (
                  <textarea
                    required
                    rows={2}
                    placeholder="Please enter exact reason for suspension..."
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none transition-colors mt-2 ${
                      theme === 'light'
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-rose-500'
                        : 'border-neutral-800 bg-neutral-950 text-white focus:border-rose-500'
                    }`}
                  />
                )}
              </div>

              {/* Actions */}
              <div className={`flex items-center justify-end gap-3 pt-3 border-t ${
                theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
              }`}>
                <button
                  type="button"
                  onClick={() => setSuspendingUser(null)}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || (suspensionReason === 'Other' && !customReason.trim())}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? 'Suspending...' : 'Confirm Suspension'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
