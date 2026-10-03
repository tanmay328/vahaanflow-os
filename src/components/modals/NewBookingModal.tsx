import React, { useState } from 'react';
import { Vehicle, Booking } from '../../types/rental';
import { UserProfile } from '../../types/auth';
import { 
  X, 
  Calendar 
} from 'lucide-react';

interface NewBookingModalProps {
  vehicles: Vehicle[];
  initialVehicle?: Vehicle | null;
  currentUser?: UserProfile | null;
  onClose: () => void;
  onSubmitBooking: (booking: Booking) => void;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  vehicles,
  initialVehicle,
  currentUser,
  onClose,
  onSubmitBooking,
}) => {
  const availableVehicles = vehicles.filter(v => v.approvalStatus === 'approved' && v.status === 'available');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    initialVehicle?.id || (availableVehicles[0]?.id || '')
  );

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || availableVehicles[0];

  // Dates
  const [startDate, setStartDate] = useState<string>('2026-10-10');
  const [endDate, setEndDate] = useState<string>('2026-10-13');
  const [pickupTime, setPickupTime] = useState<string>('09:00');
  const [returnTime, setReturnTime] = useState<string>('18:00');

  // Customer KYC details
  const [customerName, setCustomerName] = useState<string>(currentUser?.name || 'Dr. Ananya Murthy');
  const [customerEmail, setCustomerEmail] = useState<string>(currentUser?.email || 'ananya.m@manipal.org');
  const [customerPhone, setCustomerPhone] = useState<string>(currentUser?.phone || '+91 98450 11928');
  const [drivingLicense, setDrivingLicense] = useState<string>(
    currentUser?.renterDetails?.drivingLicense || 'KA-0520190088192'
  );
  const [aadhaarMasked, setAadhaarMasked] = useState<string>(
    currentUser?.renterDetails?.aadhaarMasked || 'XXXX-XXXX-3319'
  );
  const [panNumber, setPanNumber] = useState<string>(currentUser?.renterDetails?.panNumber || '');

  // Locations
  const [pickupLocation, setPickupLocation] = useState<string>(
    selectedVehicle?.currentLocation.hubName || 'Kempegowda Int\'l Airport (BLR) Hub'
  );
  const [dropoffLocation, setDropoffLocation] = useState<string>(
    selectedVehicle?.currentLocation.hubName || 'Kempegowda Int\'l Airport (BLR) Hub'
  );

  // Day calculation
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
  const totalDays = diffDays || 1;

  const dailyRate = selectedVehicle?.dailyRate || 3200;
  const depositAmount = selectedVehicle?.depositAmount || 10000;
  const totalRental = dailyRate * totalDays;
  const platformCommissionRate = 0.15;
  const platformCommission = Math.round(totalRental * platformCommissionRate);
  const gstAmount = Math.round(totalRental * 0.18);
  const ownerNetShare = totalRental - platformCommission;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) {
      alert('Please select a car.');
      return;
    }

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
      pickupLocation,
      dropoffLocation,
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

    onSubmitBooking(newBooking);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">New Car Booking</h2>
              <p className="text-xs text-neutral-400">
                Book a car, set pickup dates, and collect security deposit
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-neutral-300">
          
          {/* Car Selection */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <label className="block text-xs font-bold text-white uppercase tracking-wider">
              Select Car
            </label>
            <select
              value={selectedVehicleId}
              onChange={e => setSelectedVehicleId(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white text-xs focus:border-emerald-500 focus:outline-none"
            >
              {availableVehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.licensePlate}) &middot; ₹{v.dailyRate}/day &middot; Owner: {v.ownerName}
                </option>
              ))}
            </select>

            {selectedVehicle && (
              <div className="flex items-center gap-3 pt-2 text-neutral-400">
                <img
                  src={selectedVehicle.image}
                  alt={selectedVehicle.model}
                  className="h-12 w-20 object-cover rounded-lg border border-neutral-800"
                />
                <div>
                  <div className="font-semibold text-white">
                    {selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {selectedVehicle.category} &middot; {selectedVehicle.transmission} &middot; {selectedVehicle.fuelType}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                    Car Owner: {selectedVehicle.ownerName}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 mb-1">Pickup Date & Time</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="time"
                  value={pickupTime}
                  onChange={e => setPickupTime(e.target.value)}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Return Date & Time</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="time"
                  value={returnTime}
                  onChange={e => setReturnTime(e.target.value)}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Customer Details & Driving License
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                ID Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Email ID</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Driving License (DL Number)</label>
                <input
                  type="text"
                  required
                  value={drivingLicense}
                  onChange={e => setDrivingLicense(e.target.value)}
                  placeholder="e.g. MH-0220180049210"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Aadhaar Number (Last 4 digits visible)</label>
                <input
                  type="text"
                  required
                  value={aadhaarMasked}
                  onChange={e => setAadhaarMasked(e.target.value)}
                  placeholder="XXXX-XXXX-7721"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Deposit Summary */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center text-white font-bold">
              <span>Price & Deposit Summary ({totalDays} {totalDays === 1 ? 'day' : 'days'})</span>
              <span className="font-mono text-emerald-400 text-sm">Total: ₹{totalRental.toLocaleString()}</span>
            </div>

            <div className="divide-y divide-neutral-800/80 text-[11px] text-neutral-400 space-y-1 pt-1">
              <div className="flex justify-between py-1">
                <span>Rent ({totalDays} days &times; ₹{dailyRate}/day)</span>
                <span className="font-mono text-white">₹{totalRental.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Refundable Security Deposit</span>
                <span className="font-mono text-white">₹{depositAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-500">
                <span>Platform Fee (15%)</span>
                <span className="font-mono">₹{platformCommission.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-400">
                <span>Car Owner Share (85%)</span>
                <span className="font-mono font-bold">₹{ownerNetShare.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold transition-colors shadow-lg shadow-emerald-500/20"
            >
              Confirm Booking
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
