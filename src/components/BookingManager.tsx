import React, { useState, useMemo } from 'react';
import { Booking } from '../types/rental';
import { UserProfile } from '../types/auth';
import { 
  Calendar, 
  Search, 
  FileText, 
  KeyRound, 
  CheckCircle2, 
  CreditCard, 
  Car, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  QrCode, 
  Fuel, 
  Info, 
  ChevronRight, 
  Phone, 
  AlertTriangle,
  User
} from 'lucide-react';
import { cleanImageUrl } from '../utils/imageHelper';

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
  theme?: 'dark' | 'light';
}

export const BookingManager: React.FC<BookingManagerProps> = ({
  bookings = [],
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
  theme = 'dark',
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isOwner = currentUser?.role === 'vehicle_owner' && currentUser?.activeViewMode !== 'renter';
  const isCustomer = currentUser?.role === 'renter' || currentUser?.activeViewMode === 'renter';

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Double-Confirmation State for Cancellation
  const [cancelingBooking, setCancelingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Change of travel plans');
  const [customReason, setCustomReason] = useState<string>('');
  const [cancelAcknowledged, setCancelAcknowledged] = useState<boolean>(false);

  // Scoped Bookings based on role
  const scopedBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    
    if (isOwner) {
      return bookings.filter(b => b && b.ownerId === currentUser?.id);
    }
    
    if (isCustomer) {
      const userEmail = (currentUser?.email || '').toLowerCase().trim();
      const userName = (currentUser?.name || '').toLowerCase().trim();
      const userId = currentUser?.id || '';
      return bookings.filter(b => {
        if (!b) return false;
        const custEmail = (b.customer?.email || '').toLowerCase().trim();
        const custName = (b.customer?.name || '').toLowerCase().trim();
        const custId = (b.customer as any)?.id || (b as any).customerId || '';
        return (userEmail && custEmail === userEmail) || 
               (userId && custId === userId) ||
               (userName && custName && custName === userName);
      });
    }

    return bookings.filter(Boolean);
  }, [bookings, isOwner, isCustomer, currentUser?.id, currentUser?.email]);

  const filteredBookings = useMemo(() => {
    return scopedBookings.filter(b => {
      if (!b) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = (b.bookingCode || '').toLowerCase().includes(q);
        const matchCust = (b.customer?.name || '').toLowerCase().includes(q);
        const matchVeh = (b.vehicle?.make || '').toLowerCase().includes(q) || 
                         (b.vehicle?.model || '').toLowerCase().includes(q) || 
                         (b.vehicle?.licensePlate || '').toLowerCase().includes(q);
        return matchCode || matchCust || matchVeh;
      }
      return true;
    });
  }, [scopedBookings, statusFilter, searchQuery]);

  // Selected Booking for Side Details Panel
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(() => {
    return filteredBookings[0]?.id || null;
  });

  // Keep selected booking in sync if list changes
  const activeBooking = useMemo(() => {
    if (selectedBookingId) {
      const found = filteredBookings.find(b => b.id === selectedBookingId);
      if (found) return found;
    }
    return filteredBookings[0] || null;
  }, [filteredBookings, selectedBookingId]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-xl font-extrabold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {isOwner ? 'Bookings for My Cars' : (isCustomer ? 'My Trips & Bookings' : 'All Fleet Bookings')}
            </h2>
            <span className={`font-mono text-xs px-2 py-0.5 rounded border ${
              theme === 'light' ? 'text-slate-700 bg-slate-100 border-slate-200' : 'text-neutral-400 bg-neutral-900 border-neutral-800'
            }`}>
              {filteredBookings.length} {filteredBookings.length === 1 ? 'trip' : 'trips'}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
            {isCustomer && 'Select any trip to view complete vehicle details, pickup pass, security deposit escrow, and live trip status.'}
            {isOwner && 'Bookings for your vehicles only. Select a booking to review vehicle schedule & earnings breakdown.'}
            {isAdmin && 'Platform booking desk: Dispatch cars, manage returns, check IDs, and disburse payouts.'}
          </p>
        </div>

        {!isOwner && (
          <button
            onClick={onOpenNewBooking}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm whitespace-nowrap self-start sm:self-auto"
          >
            <Car className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>{isCustomer ? 'Book a Car' : 'New Booking'}</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-2.5 h-4 w-4 ${theme === 'light' ? 'text-slate-400' : 'text-neutral-500'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search booking ID, car model, plate number..."
            className={`w-full rounded-lg border pl-9 pr-3 py-2 text-xs transition-colors focus:outline-none ${
              theme === 'light'
                ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                : 'bg-neutral-900/80 border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500'
            }`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={`rounded-lg border px-3 py-2 text-xs focus:outline-none ${
            theme === 'light'
              ? 'bg-white border-slate-300 text-slate-900 shadow-sm focus:border-emerald-600'
              : 'bg-neutral-900 border-neutral-800 text-white focus:border-emerald-500'
          }`}
        >
          <option value="all">All Trips & Bookings</option>
          <option value="confirmed">Confirmed (Upcoming)</option>
          <option value="active">Active (On Trip)</option>
          <option value="completed">Completed & Settled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Empty State */}
      {filteredBookings.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center space-y-4 ${
          theme === 'light' ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-neutral-900/40 border-neutral-800 text-neutral-100'
        }`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <Calendar className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className={`text-base font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {isCustomer ? 'No Trips Found' : 'No Bookings Found'}
            </h3>
            <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
              {isCustomer 
                ? 'You do not have any active or past car rentals yet. Book a self-drive car for your next trip!'
                : (isOwner 
                    ? 'No bookings have been made for your cars yet.' 
                    : 'No bookings match your selected filter criteria.')}
            </p>
          </div>
          {isCustomer && (
            <button
              onClick={onOpenNewBooking}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              <Car className="h-4 w-4" />
              <span>Explore Available Cars & Book</span>
            </button>
          )}
        </div>
      ) : (
        /* Side-by-Side 2-Column Master-Detail Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Trips List */}
          <div className="lg:col-span-6 space-y-3">
            <div className={`text-xs font-bold uppercase tracking-wider px-1 ${
              theme === 'light' ? 'text-slate-500' : 'text-neutral-400'
            }`}>
              {isCustomer ? 'Your Trips' : 'Bookings List'} ({filteredBookings.length})
            </div>

            <div className="space-y-3">
              {filteredBookings.map(b => {
                const isSelected = activeBooking?.id === b.id;
                const bookingCode = b.bookingCode || 'VF-TRIP';
                const vehicleMake = b.vehicle?.make || 'Car';
                const vehicleModel = b.vehicle?.model || '';
                const licensePlate = b.vehicle?.licensePlate || 'TN-01-XX-0000';
                const customerName = b.customer?.name || 'Customer';
                const totalRental = b.totalRental ?? 0;
                const startDateDisplay = b.startDate && b.startDate !== '0' ? b.startDate : '';
                const endDateDisplay = b.endDate && b.endDate !== '0' ? b.endDate : '';

                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBookingId(b.id)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                      isSelected 
                        ? (theme === 'light'
                            ? 'border-emerald-600 bg-white shadow-md ring-1 ring-emerald-500/20'
                            : 'border-emerald-500/60 bg-neutral-900 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30')
                        : (theme === 'light'
                            ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                            : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900/80')
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl border flex items-center justify-center font-bold font-mono text-sm shrink-0 ${
                          theme === 'light' ? 'bg-slate-100 border-slate-200 text-emerald-700' : 'bg-neutral-950 border-neutral-800 text-emerald-400'
                        }`}>
                          {bookingCode.slice(-4)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-mono text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{bookingCode}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              b.status === 'confirmed' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                              b.status === 'active' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                              b.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                              'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            }`}>
                              {b.status === 'confirmed' ? 'Confirmed' :
                               b.status === 'active' ? 'On Trip' :
                               b.status === 'completed' ? 'Completed' : 'Cancelled'}
                            </span>
                          </div>
                          
                          {/* Car Details */}
                          <div className={`text-xs font-semibold mt-0.5 ${theme === 'light' ? 'text-slate-800' : 'text-neutral-200'}`}>
                            {vehicleMake} {vehicleModel} &middot; <span className={`font-mono ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>{licensePlate}</span>
                          </div>

                          {/* Renter Details Display */}
                          <div className={`text-[11px] flex items-center gap-1.5 mt-1 font-medium ${
                            theme === 'light' ? 'text-slate-600' : 'text-neutral-300'
                          }`}>
                            <User className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span>Renter: <strong className={theme === 'light' ? 'text-slate-900' : 'text-emerald-400'}>{customerName}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[10px] block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>Total</span>
                        <span className={`text-xs font-bold font-mono ${theme === 'light' ? 'text-emerald-700' : 'text-white'}`}>₹{(totalRental || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${
                      theme === 'light' ? 'border-slate-100 text-slate-600' : 'border-neutral-800/80 text-neutral-400'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-emerald-600" />
                        <span>
                          {startDateDisplay ? `${startDateDisplay}${b.pickupTime ? ` (${b.pickupTime})` : ''}` : 'Scheduled'} 
                          {endDateDisplay ? ` → ${endDateDisplay}` : ''}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {b.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBookingId(b.id);
                              setCancelingBooking(b);
                              setCancelReason('Change of travel plans');
                              setCustomReason('');
                              setCancelAcknowledged(false);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                              theme === 'light'
                                ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                            }`}
                          >
                            Cancel
                          </button>
                        )}
                        <div className="flex items-center gap-1 text-emerald-600 font-medium">
                          <span>Details</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Relevant Details Section Beside "My Trips" */}
          <div className="lg:col-span-6 sticky top-20">
            {activeBooking ? (
              <div className={`rounded-2xl border p-5 space-y-5 shadow-xl backdrop-blur-xl ${
                theme === 'light'
                  ? 'bg-white border-slate-200/90 text-slate-900'
                  : 'bg-neutral-900/90 border-neutral-800 text-neutral-100'
              }`}>
                
                {/* Header & Status Banner */}
                <div className={`flex items-start justify-between gap-3 border-b pb-4 ${
                  theme === 'light' ? 'border-slate-100' : 'border-neutral-800'
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>BOOKING REFERENCE</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {activeBooking.bookingCode}
                      </span>
                    </div>
                    <h3 className={`text-lg font-extrabold mt-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      {activeBooking.vehicle?.make || 'Car'} {activeBooking.vehicle?.model || ''}
                    </h3>
                    <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                      Plate: <strong className={`font-mono ${theme === 'light' ? 'text-slate-800' : 'text-neutral-200'}`}>{activeBooking.vehicle?.licensePlate || 'N/A'}</strong> &middot; Category: {(activeBooking.vehicle?.category || 'Standard').toUpperCase()}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 ${
                    activeBooking.status === 'confirmed' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                    activeBooking.status === 'active' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                    activeBooking.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                    'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                  }`}>
                    {activeBooking.status === 'confirmed' ? 'Confirmed (Ready)' :
                     activeBooking.status === 'active' ? 'Live On Trip' :
                     activeBooking.status === 'completed' ? 'Trip Completed' : 'Cancelled'}
                  </span>
                </div>

                {/* Cancelled Alert Banner */}
                {activeBooking.status === 'cancelled' && (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    theme === 'light'
                      ? 'border-rose-200 bg-rose-50/80 text-rose-950'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                  }`}>
                    <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <div className="font-bold flex items-center gap-2">
                        <span>Reservation Cancelled</span>
                        {activeBooking.cancelledAt && (
                          <span className="font-mono text-[10px] opacity-75">
                            ({new Date(activeBooking.cancelledAt).toLocaleString()})
                          </span>
                        )}
                      </div>
                      <p className="leading-relaxed">
                        Reason: <em>"{activeBooking.cancellationReason || 'Change of travel plans / User requested'}"</em>
                      </p>
                      <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                        ✓ Security Deposit Escrow (₹{(activeBooking.depositAmount || 10000).toLocaleString()}) released & unblocked.
                      </p>
                    </div>
                  </div>
                )}

                {/* Car Photo Banner */}
                {activeBooking.vehicle?.image && (
                  <div className="relative h-40 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950">
                    <img
                      src={cleanImageUrl(activeBooking.vehicle.image)}
                      alt={activeBooking.vehicle.model}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <span className="bg-neutral-950/80 px-2.5 py-1 rounded-lg border border-neutral-800 font-mono text-[11px]">
                        ₹{activeBooking.baseRate || activeBooking.vehicle.dailyRate}/day
                      </span>
                      <span className="bg-emerald-500 text-neutral-950 font-bold px-2.5 py-1 rounded-lg text-[11px]">
                        Fastag Enabled
                      </span>
                    </div>
                  </div>
                )}

                {/* Live Trip Lifecycle Steps */}
                <div className={`rounded-xl border p-4 space-y-3 ${
                  theme === 'light' ? 'border-slate-200 bg-slate-50/80 text-slate-800' : 'border-neutral-800 bg-neutral-950/60 text-neutral-300'
                }`}>
                  <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    theme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}>
                    <Clock className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Trip Progression</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                    <div className="space-y-1">
                      <div className="h-2 rounded-full bg-emerald-500" />
                      <span className={`font-bold block ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>1. Booked</span>
                    </div>
                    <div className="space-y-1">
                      <div className={`h-2 rounded-full ${
                        activeBooking.status === 'active' || activeBooking.status === 'completed' 
                          ? 'bg-emerald-500' 
                          : (theme === 'light' ? 'bg-slate-200' : 'bg-neutral-800')
                      }`} />
                      <span className={
                        activeBooking.status === 'active' || activeBooking.status === 'completed' 
                          ? (theme === 'light' ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold') 
                          : (theme === 'light' ? 'text-slate-400' : 'text-neutral-500')
                      }>
                        2. Handover
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className={`h-2 rounded-full ${
                        activeBooking.status === 'active' || activeBooking.status === 'completed' 
                          ? 'bg-emerald-500' 
                          : (theme === 'light' ? 'bg-slate-200' : 'bg-neutral-800')
                      }`} />
                      <span className={
                        activeBooking.status === 'active' || activeBooking.status === 'completed' 
                          ? (theme === 'light' ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold') 
                          : (theme === 'light' ? 'text-slate-400' : 'text-neutral-500')
                      }>
                        3. Driving
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className={`h-2 rounded-full ${
                        activeBooking.status === 'completed' 
                          ? 'bg-emerald-500' 
                          : (theme === 'light' ? 'bg-slate-200' : 'bg-neutral-800')
                      }`} />
                      <span className={
                        activeBooking.status === 'completed' 
                          ? (theme === 'light' ? 'text-emerald-700 font-bold' : 'text-emerald-400 font-bold') 
                          : (theme === 'light' ? 'text-slate-400' : 'text-neutral-500')
                      }>
                        4. Settled
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pickup & Return Timings & Locations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className={`rounded-xl border p-3 space-y-1 ${
                    theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-neutral-800 bg-neutral-950/40 text-neutral-300'
                  }`}>
                    <div className={`text-[10px] font-mono uppercase flex items-center gap-1 ${
                      theme === 'light' ? 'text-slate-500' : 'text-neutral-500'
                    }`}>
                      <MapPin className="h-3 w-3 text-emerald-500" />
                      <span>Pickup Hub & Date</span>
                    </div>
                    <div className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      {activeBooking.startDate} &middot; {activeBooking.pickupTime || '09:00 AM'}
                    </div>
                    <div className={`text-[11px] truncate ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                      {activeBooking.pickupLocation || 'Bangalore City Hub'}
                    </div>
                  </div>

                  <div className={`rounded-xl border p-3 space-y-1 ${
                    theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-neutral-800 bg-neutral-950/40 text-neutral-300'
                  }`}>
                    <div className={`text-[10px] font-mono uppercase flex items-center gap-1 ${
                      theme === 'light' ? 'text-slate-500' : 'text-neutral-500'
                    }`}>
                      <MapPin className="h-3 w-3 text-teal-500" />
                      <span>Return Hub & Date</span>
                    </div>
                    <div className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      {activeBooking.endDate} &middot; {activeBooking.returnTime || '06:00 PM'}
                    </div>
                    <div className={`text-[11px] truncate ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                      {activeBooking.dropoffLocation || 'Bangalore City Hub'}
                    </div>
                  </div>
                </div>

                {/* Driver / Customer KYC Details */}
                <div className={`rounded-xl border p-3.5 space-y-2 text-xs ${
                  theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-neutral-800 bg-neutral-950/40 text-neutral-300'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono uppercase ${
                      theme === 'light' ? 'text-slate-500' : 'text-neutral-500'
                    }`}>DRIVER / RENTER DETAILS</span>
                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Verified ID</span>
                    </span>
                  </div>
                  <div className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{activeBooking.customer?.name}</div>
                  <div className={`text-[11px] flex flex-wrap gap-x-4 gap-y-1 font-mono ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                    <span>Email: <strong className={theme === 'light' ? 'text-slate-900' : 'text-neutral-300'}>{activeBooking.customer?.email}</strong></span>
                    <span>Phone: <strong className={theme === 'light' ? 'text-slate-900' : 'text-neutral-300'}>{activeBooking.customer?.phone}</strong></span>
                  </div>
                  <div className={`text-[11px] pt-1 border-t font-mono ${
                    theme === 'light' ? 'border-slate-200 text-slate-600' : 'border-neutral-800/60 text-neutral-400'
                  }`}>
                    DL: <strong className={theme === 'light' ? 'text-slate-800' : 'text-neutral-300'}>{activeBooking.customer?.drivingLicense || 'KA-0520190088192'}</strong> &middot; Aadhaar: <strong className={theme === 'light' ? 'text-slate-800' : 'text-neutral-300'}>{activeBooking.customer?.aadhaarMasked || 'XXXX-XXXX-3319'}</strong>
                  </div>
                </div>

                {/* Complete Financial & Security Deposit Escrow Breakdown */}
                <div className={`rounded-xl border p-4 space-y-2.5 text-xs ${
                  theme === 'light' ? 'border-emerald-200 bg-emerald-50/50' : 'border-emerald-500/20 bg-emerald-500/5'
                }`}>
                  <div className={`flex items-center justify-between font-bold ${
                    theme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}>
                    <span>Payment & Deposit Breakdown</span>
                    <span className={`font-mono text-sm ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      Total: ₹{(activeBooking.totalRental || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className={`divide-y text-[11px] ${
                    theme === 'light' ? 'divide-emerald-200/60' : 'divide-neutral-800/60'
                  }`}>
                    <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                      <span>Rental Fee ({activeBooking.totalDays || 3} days)</span>
                      <span className="font-mono">₹{(activeBooking.totalRental || 0).toLocaleString()}</span>
                    </div>
                    <div className={`flex justify-between py-1 font-semibold ${theme === 'light' ? 'text-emerald-800' : 'text-emerald-300'}`}>
                      <span>Refundable Security Deposit (Escrow)</span>
                      <span className="font-mono">₹{(activeBooking.depositAmount || 10000).toLocaleString()}</span>
                    </div>
                    <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                      <span>GST (18% included)</span>
                      <span className="font-mono">₹{(activeBooking.gstAmount || Math.round((activeBooking.totalRental || 0) * 0.18)).toLocaleString()}</span>
                    </div>

                    {/* Owner Earnings */}
                    {isOwner && (
                      <div className={`flex justify-between py-1.5 font-bold border-t ${
                        theme === 'light' ? 'text-emerald-700 border-emerald-200' : 'text-emerald-400 border-neutral-800'
                      }`}>
                        <span>Your Payout (85%)</span>
                        <span className="font-mono">₹{(activeBooking.ownerNetShare || 0).toLocaleString()}</span>
                      </div>
                    )}

                    {/* Admin Commission */}
                    {isAdmin && (
                      <div className={`flex justify-between py-1.5 font-medium border-t ${
                        theme === 'light' ? 'text-slate-700 border-emerald-200' : 'text-neutral-300 border-neutral-800'
                      }`}>
                        <span>Platform Commission (15%)</span>
                        <span className={`font-mono font-bold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>
                          ₹{(activeBooking.platformCommission || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 ${
                  theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
                }`}>
                  <button
                    onClick={() => onViewAgreement(activeBooking)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      theme === 'light' 
                        ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50' 
                        : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />
                    <span>View Rental Agreement</span>
                  </button>

                  {activeBooking.status === 'completed' && onOpenReturnDossier && (
                    <button
                      onClick={() => onOpenReturnDossier(activeBooking)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                        theme === 'light'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>View Final Invoice</span>
                    </button>
                  )}

                  {/* Admin Ops */}
                  {isAdmin && activeBooking.status === 'confirmed' && (
                    <button
                      onClick={() => onOpenCheckOut(activeBooking)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Dispatch Car</span>
                    </button>
                  )}

                  {isAdmin && activeBooking.status === 'active' && (
                    <button
                      onClick={() => onOpenCheckIn(activeBooking)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Take Return</span>
                    </button>
                  )}

                  {/* Cancel Booking (Available for Confirmed / On-Hold Bookings) */}
                  {activeBooking.status !== 'cancelled' && activeBooking.status !== 'completed' && (
                    <button
                      onClick={() => {
                        setCancelingBooking(activeBooking);
                        setCancelReason('Change of travel plans');
                        setCustomReason('');
                        setCancelAcknowledged(false);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        theme === 'light'
                          ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                      }`}
                      title="Cancel this reservation"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                      <span>Cancel Booking</span>
                    </button>
                  )}
                </div>

              </div>
            ) : (
              <div className={`rounded-2xl border p-8 text-center text-xs ${
                theme === 'light' ? 'border-slate-200 bg-white text-slate-500' : 'border-neutral-800 bg-neutral-900/40 text-neutral-500'
              }`}>
                Select any booking on the left to view relevant details.
              </div>
            )}
          </div>

        </div>
      )}

      {/* DOUBLE-CONFIRMATION CANCELLATION MODAL */}
      {cancelingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-5 transition-all duration-300 ${
            theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900 text-neutral-100'
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <h3 className={`text-base font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  Confirm Booking Cancellation
                </h3>
                <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                  Booking Ref: <strong className="font-mono text-emerald-600">{cancelingBooking.bookingCode}</strong>
                </p>
              </div>
            </div>

            {/* Warning Callout */}
            <div className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1 ${
              theme === 'light' 
                ? 'border-amber-200 bg-amber-50 text-amber-900' 
                : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                <span>Critical Action &middot; Double Confirmation Required</span>
              </div>
              <p>
                Cancelling this reservation will immediately release <strong>{cancelingBooking.vehicle?.make || 'the car'} {cancelingBooking.vehicle?.model || ''}</strong> back to available platform inventory and notify the fleet team.
              </p>
            </div>

            {/* Booking Highlights */}
            <div className={`p-3.5 rounded-xl border space-y-2 text-xs font-mono ${
              theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-neutral-800 bg-neutral-950/60 text-neutral-300'
            }`}>
              <div className="flex justify-between">
                <span className={theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}>Car:</span>
                <span className="font-bold">{cancelingBooking.vehicle?.make} {cancelingBooking.vehicle?.model}</span>
              </div>
              <div className="flex justify-between">
                <span className={theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}>Trip Dates:</span>
                <span>{cancelingBooking.startDate} &rarr; {cancelingBooking.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className={theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}>Refundable Security Deposit:</span>
                <span className="text-emerald-600 font-bold">₹{(cancelingBooking.depositAmount || 10000).toLocaleString()}</span>
              </div>
            </div>

            {/* Cancellation Reason Selector */}
            <div className="space-y-2">
              <label className={`block text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <select
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none transition-colors ${
                  theme === 'light'
                    ? 'border-slate-300 bg-white text-slate-900 focus:border-rose-500'
                    : 'border-neutral-800 bg-neutral-950 text-white focus:border-rose-500'
                }`}
              >
                <option value="Change of travel plans">Change of travel plans</option>
                <option value="Booked wrong dates or time">Booked wrong dates or time</option>
                <option value="Vehicle no longer required">Vehicle no longer required</option>
                <option value="Found alternative transportation">Found alternative transportation</option>
                <option value="Personal emergency">Personal emergency</option>
                <option value="Other">Other reason</option>
              </select>

              {cancelReason === 'Other' && (
                <input
                  type="text"
                  required
                  placeholder="Please specify your reason..."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none transition-colors mt-2 ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-rose-500'
                      : 'border-neutral-800 bg-neutral-950 text-white focus:border-rose-500'
                  }`}
                />
              )}
            </div>

            {/* Explicit Double-Confirm Checkbox */}
            <div className="space-y-1.5">
              <label className={`flex items-start gap-2.5 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                cancelAcknowledged
                  ? (theme === 'light' ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-400/20' : 'border-rose-500/50 bg-rose-500/15 ring-2 ring-rose-500/20')
                  : (theme === 'light' ? 'border-slate-200 bg-slate-50 hover:bg-slate-100' : 'border-neutral-800 bg-neutral-950/40 hover:bg-neutral-900')
              }`}>
                <input
                  type="checkbox"
                  checked={cancelAcknowledged}
                  onChange={e => setCancelAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                />
                <span className={`text-xs ${theme === 'light' ? 'text-slate-800' : 'text-neutral-200'}`}>
                  <strong>I confirm that I want to cancel this booking.</strong> I understand this cancellation is final and releases the car back to platform inventory.
                </span>
              </label>

              {!cancelAcknowledged && (
                <p className="text-[11px] text-amber-500 font-medium px-1 flex items-center gap-1">
                  <span>ℹ️</span> Please check the confirmation box above to enable the cancel button.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className={`flex items-center justify-end gap-3 pt-3 border-t ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
              <button
                type="button"
                onClick={() => setCancelingBooking(null)}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                  theme === 'light'
                    ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                Keep Reservation
              </button>
              
              <button
                type="button"
                disabled={!cancelAcknowledged || (cancelReason === 'Other' && !customReason.trim())}
                onClick={() => {
                  const finalReason = cancelReason === 'Other' ? customReason.trim() : cancelReason;
                  onCancelBooking(cancelingBooking.id, finalReason);
                  setCancelingBooking(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Yes, Cancel Booking</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
