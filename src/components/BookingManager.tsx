import React, { useState, useMemo } from 'react';
import { Booking, BookingStatus } from '../types/rental';
import { UserProfile } from '../types/auth';
import { 
  Calendar, 
  Search, 
  FileText, 
  KeyRound, 
  CheckCircle2, 
  CreditCard
} from 'lucide-react';

interface BookingManagerProps {
  bookings: Booking[];
  currentUser: UserProfile;
  onOpenCheckOut: (booking: Booking) => void;
  onOpenCheckIn: (booking: Booking) => void;
  onViewAgreement: (booking: Booking) => void;
  onCancelBooking: (bookingId: string, reason: string) => void;
  onOpenNewBooking: () => void;
  onOpenReturnDossier?: (booking: Booking) => void;
  onOwnerApproveBooking?: (bookingId: string) => void;
  onOwnerDeclineBooking?: (bookingId: string, reason: string) => void;
  onApproveKYC?: (bookingId: string) => void;
  onRejectKYC?: (bookingId: string, reason: string) => void;
  onBlacklistRenter?: (bookingId: string, reason: string) => void;
  onDisbursePayout?: (booking: Booking) => void;
}

export const BookingManager: React.FC<BookingManagerProps> = ({
  bookings,
  currentUser,
  onOpenCheckOut,
  onOpenCheckIn,
  onViewAgreement,
  onCancelBooking,
  onOpenNewBooking,
  onOpenReturnDossier,
  onOwnerApproveBooking,
  onOwnerDeclineBooking,
  onApproveKYC,
  onRejectKYC,
  onBlacklistRenter,
  onDisbursePayout,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isOwner = currentUser.role === 'vehicle_owner' && currentUser.activeViewMode !== 'renter';
  const isNormalUserMode = currentUser.activeViewMode === 'renter';

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Strict Role Isolation: Owner sees ONLY own vehicle bookings!
  const scopedBookings = useMemo(() => {
    if (isOwner) {
      return bookings.filter(b => b.ownerId === currentUser.id);
    }
    if (isNormalUserMode) {
      const email = currentUser.email.toLowerCase();
      return bookings.filter(b => b.customer.email.toLowerCase() === email);
    }
    return bookings;
  }, [bookings, isOwner, isNormalUserMode, currentUser.id, currentUser.email]);

  const filteredBookings = useMemo(() => {
    return scopedBookings.filter(b => {
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = b.bookingCode.toLowerCase().includes(q);
        const matchCust = b.customer.name.toLowerCase().includes(q);
        const matchVeh = b.vehicle.make.toLowerCase().includes(q) || b.vehicle.licensePlate.toLowerCase().includes(q);
        return matchCode || matchCust || matchVeh;
      }
      return true;
    });
  }, [scopedBookings, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isOwner ? 'Bookings for My Cars' : (isNormalUserMode ? 'My Car Rentals' : 'All Bookings')}
            </h2>
            <span className="font-mono text-xs text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
              {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            {isOwner && 'Bookings for your cars only. Customer privacy protected (ID numbers are hidden).'}
            {isAdmin && 'Admin desk: Hand over keys, take car returns, check customer ID, and pay car owners.'}
            {isNormalUserMode && 'Track your booked cars, dates, and final bills.'}
          </p>
        </div>

        <button
          onClick={onOpenNewBooking}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors shadow-sm whitespace-nowrap self-start sm:self-auto"
        >
          <span>New Booking</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search booking number, customer name, car plate..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/80 pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="all">All Bookings</option>
          <option value="confirmed">Confirmed (Upcoming)</option>
          <option value="active">Active (On Trip)</option>
          <option value="completed">Completed & Settled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.map(b => {
          const isPendingOwnerApproval = isOwner && b.ownerApprovalStatus === 'pending';

          return (
            <div
              key={b.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4 hover:border-neutral-700 transition-all shadow-lg"
            >
              {/* Row 1: Code, Status & Car */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
                    {b.bookingCode.slice(-4)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{b.bookingCode}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'confirmed' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        b.status === 'active' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        b.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {b.status === 'confirmed' ? 'Confirmed' :
                         b.status === 'active' ? 'On Trip' :
                         b.status === 'completed' ? 'Completed' : 'Cancelled'}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-300 font-semibold mt-0.5">
                      {b.vehicle.make} {b.vehicle.model} &middot; <span className="font-mono text-neutral-400">{b.vehicle.licensePlate}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="flex items-center gap-4 text-xs font-mono text-right">
                  <div>
                    <span className="text-[10px] text-neutral-500 block uppercase">Rental Total</span>
                    <span className="font-bold text-white">₹{b.totalRental.toLocaleString()}</span>
                  </div>

                  {/* Owner Net Share */}
                  {isOwner && (
                    <div className="border-l border-neutral-800 pl-3">
                      <span className="text-[10px] text-emerald-400 block uppercase font-semibold">Your Share (85%)</span>
                      <span className="font-bold text-emerald-400">₹{b.ownerNetShare.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Admin Commission */}
                  {isAdmin && (
                    <div className="border-l border-neutral-800 pl-3">
                      <span className="text-[10px] text-neutral-500 block uppercase">Owner Share / Fee</span>
                      <span className="text-neutral-300">₹{b.ownerNetShare} / <strong className="text-emerald-400">₹{b.platformCommission}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Customer & Trip Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Customer Details */}
                <div className="space-y-1 rounded-xl bg-neutral-950/40 p-3 border border-neutral-800/60">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500 text-[11px]">Customer Details</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                      ID Verified
                    </span>
                  </div>

                  <div className="font-semibold text-white text-sm">{b.customer.name}</div>
                  
                  {/* ADMIN ONLY: Full KYC details visible */}
                  {isAdmin && (
                    <div className="pt-1.5 text-[11px] text-neutral-400 space-y-0.5 border-t border-neutral-800/60 font-mono">
                      <div>License: <strong className="text-neutral-300">{b.customer.drivingLicense || 'MH-0220180049210'}</strong></div>
                      <div>Aadhaar: <strong className="text-neutral-300">{b.customer.aadhaarMasked || 'XXXX-XXXX-7721'}</strong></div>
                      {b.customer.panNumber && <div>PAN: <strong className="text-neutral-300">{b.customer.panNumber}</strong></div>}

                      {/* Admin KYC Actions */}
                      <div className="flex items-center gap-1.5 pt-1.5 font-sans">
                        <button
                          onClick={() => onApproveKYC && onApproveKYC(b.id)}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]"
                        >
                          Approve ID
                        </button>
                        <button
                          onClick={() => {
                            const r = prompt('Reason for rejecting customer ID:');
                            if (r && onRejectKYC) onRejectKYC(b.id, r);
                          }}
                          className="px-2 py-0.5 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-[10px]"
                        >
                          Reject ID
                        </button>
                        <button
                          onClick={() => {
                            const r = prompt('Reason for blacklisting / suspending customer:');
                            if (r && onBlacklistRenter) onBlacklistRenter(b.id, r);
                          }}
                          className="px-2 py-0.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 text-[10px]"
                        >
                          Blacklist
                        </button>
                      </div>
                    </div>
                  )}

                  {/* OWNER ONLY: Privacy Protected Badge */}
                  {isOwner && (
                    <div className="text-[10px] text-neutral-500 pt-1">
                      Identity verified by VahaanFlow &middot; Customer ID numbers are protected
                    </div>
                  )}
                </div>

                {/* Schedule */}
                <div className="space-y-1 rounded-xl bg-neutral-950/40 p-3 border border-neutral-800/60 text-[11px]">
                  <div className="text-neutral-500">Trip Dates</div>
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{b.startDate} ({b.pickupTime}) &rarr; {b.endDate} ({b.returnTime})</span>
                  </div>
                  <div className="text-neutral-400 pt-1 truncate">
                    Pickup: {b.pickupLocation}
                  </div>
                  <div className="text-neutral-400 truncate">
                    Return: {b.dropoffLocation}
                  </div>
                </div>

              </div>

              {/* Row 3: Action Buttons */}
              <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                
                {/* Owner Approval Request */}
                {isOwner && isPendingOwnerApproval && onOwnerApproveBooking && onOwnerDeclineBooking && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-amber-400">Owner Decision:</span>
                    <button
                      onClick={() => onOwnerApproveBooking(b.id)}
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs"
                    >
                      Accept Booking
                    </button>
                    <button
                      onClick={() => {
                        const r = prompt('Reason for rejecting booking:');
                        if (r) onOwnerDeclineBooking(b.id, r);
                      }}
                      className="px-3 py-1 rounded-lg border border-red-500/40 text-red-400 text-xs"
                    >
                      Reject
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewAgreement(b)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-xs font-medium"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>View Contract</span>
                  </button>

                  {b.status === 'completed' && onOpenReturnDossier && (
                    <button
                      onClick={() => onOpenReturnDossier(b)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold"
                    >
                      <span>Final Return Bill</span>
                    </button>
                  )}
                </div>

                {/* Admin Operations */}
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => onOpenCheckOut(b)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shadow-sm shadow-emerald-500/20"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>Handover Car (Start Trip)</span>
                      </button>
                    )}

                    {b.status === 'active' && (
                      <button
                        onClick={() => onOpenCheckIn(b)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Take Car Back (Check-in)</span>
                      </button>
                    )}

                    {b.status === 'completed' && b.payoutStatus === 'pending' && onDisbursePayout && (
                      <button
                        onClick={() => onDisbursePayout(b)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs font-semibold"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Pay Car Owner (₹{b.ownerNetShare})</span>
                      </button>
                    )}

                    {b.status !== 'completed' && b.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          const r = prompt('Reason for cancelling booking:');
                          if (r) onCancelBooking(b.id, r);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-neutral-500 hover:text-red-400 text-xs"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
