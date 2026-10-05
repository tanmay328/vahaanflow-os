import React, { useState } from 'react';
import { Vehicle, Booking } from '../../types/rental';
import { UserProfile } from '../../types/auth';
import { EmailService } from '../../services/emailService';
import { cleanImageUrl } from '../../utils/imageHelper';
import { 
  X, 
  Calendar,
  Car,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  MapPin
} from 'lucide-react';

interface NewBookingModalProps {
  vehicles: Vehicle[];
  initialVehicle?: Vehicle | null;
  currentUser?: UserProfile | null;
  onClose: () => void;
  onSubmitBooking: (booking: Booking) => void;
  theme?: 'dark' | 'light';
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  vehicles = [],
  initialVehicle,
  currentUser,
  onClose,
  onSubmitBooking,
  theme = 'dark',
}) => {
  // Selectable vehicles: approved and available, or all approved vehicles if none marked available
  const availableVehicles = vehicles.filter(v => v.approvalStatus === 'approved' && v.status === 'available');
  const fallbackList = availableVehicles.length > 0 ? availableVehicles : vehicles.filter(v => v.approvalStatus === 'approved');
  const allChoices = fallbackList.length > 0 ? fallbackList : vehicles;

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    initialVehicle?.id || (allChoices[0]?.id || '')
  );

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || allChoices[0];

  // Dates
  const [startDate, setStartDate] = useState<string>('2026-10-10');
  const [endDate, setEndDate] = useState<string>('2026-10-13');
  const [pickupTime, setPickupTime] = useState<string>('09:00 AM');
  const [returnTime, setReturnTime] = useState<string>('06:00 PM');

  // Customer KYC details - dynamically bound to logged-in user
  const [customerName, setCustomerName] = useState<string>(currentUser?.name || 'Customer');
  const [customerEmail, setCustomerEmail] = useState<string>(currentUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState<string>(currentUser?.phone || '+91 9315938846');
  const [drivingLicense, setDrivingLicense] = useState<string>(
    currentUser?.renterDetails?.drivingLicense || 'KA-0520190088192'
  );
  const [aadhaarMasked, setAadhaarMasked] = useState<string>(
    currentUser?.renterDetails?.aadhaarMasked || 'XXXX-XXXX-3319'
  );
  const [panNumber, setPanNumber] = useState<string>(currentUser?.renterDetails?.panNumber || '');

  // Locations
  const [pickupLocation, setPickupLocation] = useState<string>(
    selectedVehicle?.currentLocation?.hubName || 'Kempegowda Int\'l Airport (BLR) Hub'
  );
  const [dropoffLocation, setDropoffLocation] = useState<string>(
    selectedVehicle?.currentLocation?.hubName || 'Kempegowda Int\'l Airport (BLR) Hub'
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Day calculation
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
  const totalDays = isNaN(diffDays) ? 3 : diffDays;

  const dailyRate = selectedVehicle?.dailyRate || 3800;
  const depositAmount = selectedVehicle?.depositAmount || 10000;
  const totalRental = dailyRate * totalDays;
  const platformCommissionRate = 0.15;
  const platformCommission = Math.round(totalRental * platformCommissionRate);
  const gstAmount = Math.round(totalRental * 0.18);
  const ownerNetShare = totalRental - platformCommission;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) {
      setErrorMessage('Please choose an available vehicle to book.');
      return;
    }

    if (!customerName.trim() || !customerEmail.trim()) {
      setErrorMessage('Please provide customer name and email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      bookingCode: `VLC-IN-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleId: selectedVehicle.id,
      vehicle: {
        make: selectedVehicle.make,
        model: selectedVehicle.model,
        licensePlate: selectedVehicle.licensePlate,
        category: selectedVehicle.category,
        image: selectedVehicle.image,
        dailyRate: selectedVehicle.dailyRate,
      },
      ownerId: selectedVehicle.ownerId,
      ownerName: selectedVehicle.ownerName,
      customerId: currentUser?.id || `cust-${Date.now()}`,
      customer: {
        name: customerName.trim(),
        email: customerEmail.trim().toLowerCase(),
        phone: customerPhone.trim(),
        kycStatus: 'verified',
        drivingLicense: drivingLicense.trim(),
        aadhaarMasked: aadhaarMasked.trim(),
        panNumber: panNumber.trim() || undefined,
      },
      status: 'confirmed',
      ownerApprovalStatus: 'pending',
      startDate,
      endDate,
      pickupTime,
      returnTime,
      totalDays,
      pickupLocation: pickupLocation || 'Bangalore Hub',
      dropoffLocation: dropoffLocation || 'Bangalore Hub',
      baseRate: dailyRate,
      totalRental,
      depositAmount,
      advancePaid: totalRental,
      platformCommissionRate,
      platformCommission,
      gstAmount,
      ownerNetShare,
      payoutStatus: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      onSubmitBooking(newBooking);
      
      // Dispatch Booking Confirmation Email via Nodemailer in background
      if (newBooking.customer?.email) {
        EmailService.sendBookingConfirmation({
          booking: newBooking,
          vehicle: selectedVehicle,
        }).catch(err => console.warn('Booking confirmation email error:', err));
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to confirm booking. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 ${
        theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900 text-neutral-100'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-6 py-4 transition-colors duration-300 ${
          theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>New Car Booking</h2>
              <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                Book a car, set pickup dates, and collect security deposit
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1 rounded-lg transition-colors cursor-pointer ${
            theme === 'light' ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className={`p-6 overflow-y-auto space-y-5 text-xs transition-colors duration-300 ${
          theme === 'light' ? 'text-slate-700 bg-white' : 'text-neutral-300 bg-neutral-900'
        }`}>
          
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Car Selection */}
          <div className={`rounded-xl border p-4 space-y-3 transition-colors duration-300 ${
            theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/60'
          }`}>
            <label className={`block text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
              Select Car
            </label>
            <select
              value={selectedVehicleId}
              onChange={e => setSelectedVehicleId(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none transition-colors ${
                theme === 'light'
                  ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                  : 'border-neutral-800 bg-neutral-900 text-white focus:border-emerald-500'
              }`}
            >
              {allChoices.map(v => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.licensePlate}) &middot; ₹{v.dailyRate}/day
                </option>
              ))}
            </select>

            {selectedVehicle && (
              <div className="flex items-center gap-3 pt-2">
                <img
                  src={cleanImageUrl(selectedVehicle.image)}
                  alt={selectedVehicle.model}
                  className={`h-12 w-20 rounded-lg object-cover border ${
                    theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
                  }`}
                />
                <div className={`text-[11px] space-y-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                  <div className={`font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})</div>
                  <div>Plate: <strong className={theme === 'light' ? 'text-slate-800' : 'text-neutral-300'}>{selectedVehicle.licensePlate}</strong> &middot; Category: {selectedVehicle.category.toUpperCase()}</div>
                  <div>Daily Rate: <strong className="text-emerald-600 font-bold">₹{selectedVehicle.dailyRate}/day</strong> &middot; Escrow Deposit: ₹{depositAmount.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>

          {/* Dates & Timings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`rounded-xl border p-3.5 space-y-2 transition-colors duration-300 ${
              theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/60'
            }`}>
              <label className={`font-medium ${theme === 'light' ? 'text-slate-700' : 'text-neutral-400'}`}>Pickup Date & Time</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                      : 'border-neutral-800 bg-neutral-900 text-white focus:border-emerald-500'
                  }`}
                />
                <input
                  type="text"
                  value={pickupTime}
                  onChange={e => setPickupTime(e.target.value)}
                  placeholder="09:00 AM"
                  className={`rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                      : 'border-neutral-800 bg-neutral-900 text-white focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            <div className={`rounded-xl border p-3.5 space-y-2 transition-colors duration-300 ${
              theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/60'
            }`}>
              <label className={`font-medium ${theme === 'light' ? 'text-slate-700' : 'text-neutral-400'}`}>Return Date & Time</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                      : 'border-neutral-800 bg-neutral-900 text-white focus:border-emerald-500'
                  }`}
                />
                <input
                  type="text"
                  value={returnTime}
                  onChange={e => setReturnTime(e.target.value)}
                  placeholder="06:00 PM"
                  className={`rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                      : 'border-neutral-800 bg-neutral-900 text-white focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Customer Details & Driving License */}
          <div className={`rounded-xl border p-4 space-y-3 transition-colors duration-300 ${
            theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/60'
          }`}>
            <div className="flex items-center justify-between">
              <label className={`block text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                Customer Details & Driving License
              </label>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                theme === 'light' ? 'text-emerald-800 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              }`}>
                <ShieldCheck className="h-3 w-3" />
                <span>ID Verified</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`text-[11px] mb-1 block ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Customer Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                      : 'border-neutral-800 bg-neutral-900 text-white focus:border-emerald-500'
                  }`}
                />
              </div>
              <div>
                <label className={`text-[11px] mb-1 block ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Email ID</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                      : 'border-neutral-800 bg-neutral-900 text-white focus:border-emerald-500'
                  }`}
                />
              </div>
              <div>
                <label className={`text-[11px] mb-1 block ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Phone Number</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                      : 'border-neutral-800 bg-neutral-900 text-white focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className={`text-[11px] mb-1 block ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Driving License (DL Number)</label>
                <input
                  type="text"
                  required
                  value={drivingLicense}
                  onChange={e => setDrivingLicense(e.target.value)}
                  placeholder="e.g. KA-0520190088192"
                  className={`w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                      : 'border-neutral-800 bg-neutral-900 text-white focus:border-emerald-500'
                  }`}
                />
              </div>
              <div>
                <label className={`text-[11px] mb-1 block ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Aadhaar Number (Last 4 digits visible)</label>
                <input
                  type="text"
                  required
                  value={aadhaarMasked}
                  onChange={e => setAadhaarMasked(e.target.value)}
                  placeholder="e.g. XXXX-XXXX-3319"
                  className={`w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none transition-colors ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-600'
                      : 'border-neutral-800 bg-neutral-900 text-white focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Price & Deposit Summary */}
          <div className={`rounded-xl border p-4 space-y-2 transition-colors duration-300 ${
            theme === 'light' ? 'border-emerald-100 bg-emerald-500/5' : 'border-emerald-500/20 bg-emerald-500/5'
          }`}>
            <div className={`flex items-center justify-between text-xs font-bold ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
              <span>Price & Deposit Summary ({totalDays} {totalDays === 1 ? 'day' : 'days'})</span>
              <span className={`text-sm font-mono font-bold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>Total: ₹{totalRental.toLocaleString()}</span>
            </div>

            <div className={`divide-y pt-1 text-[11px] ${theme === 'light' ? 'divide-slate-200/60' : 'divide-neutral-800/60'}`}>
              <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-300'}`}>
                <span>Rent ({totalDays} days &times; ₹{dailyRate}/day)</span>
                <span className="font-mono font-semibold">₹{totalRental.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-300'}`}>
                <span>Refundable Security Deposit</span>
                <span className="font-mono font-semibold">₹{depositAmount.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-400' : 'text-neutral-500'}`}>
                <span>Platform Fee (15%)</span>
                <span className="font-mono">₹{platformCommission.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>
                <span>Car Owner Share (85%)</span>
                <span className="font-mono font-bold">₹{ownerNetShare.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className={`flex items-center justify-end gap-3 pt-3 border-t ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                theme === 'light' ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold transition-colors shadow-lg flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isSubmitting ? 'Confirming...' : 'Confirm Booking'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
