import React, { useState } from 'react';
import { Booking, Vehicle, PenaltyItem } from '../../types/rental';
import { 
  X, 
  Camera, 
  Check, 
  Receipt, 
  Gauge, 
  Fuel, 
  ShieldAlert, 
  Plus
} from 'lucide-react';

interface CheckInModalProps {
  booking: Booking;
  vehicle?: Vehicle;
  onClose: () => void;
  onSubmitCheckIn: (bookingId: string, details: {
    endOdometer: number;
    endFuelPct: number;
    receivedBy: string;
    photos: {
      front?: string;
      rear?: string;
      left?: string;
      right?: string;
      interior?: string;
      odometer?: string;
      fuelGauge?: string;
    };
    excessKm: number;
    excessKmCharge: number;
    fuelDeficitPct: number;
    fuelPenaltyCharge: number;
    damageCharge: number;
    damageNotes?: string;
    manualTollExpenses: number;
    tollReceiptNotes?: string;
    penalties: PenaltyItem[];
    totalDeductions: number;
    netDepositRefund: number;
  }) => void;
  theme?: 'dark' | 'light';
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  booking,
  vehicle,
  onClose,
  onSubmitCheckIn,
  theme = 'dark',
}) => {
  const resolvedVehicle = vehicle || booking.vehicle || {
    make: 'Car',
    model: '',
    licensePlate: 'N/A',
  };
  const resolvedCustomer = booking.customer || {
    name: 'Customer',
  };

  const startOdo = booking.dispatchCheckOut?.startOdometer || vehicle?.odometer || 15000;
  const startFuel = booking.dispatchCheckOut?.startFuelPct || 90;

  // Reading state
  const [endOdometer, setEndOdometer] = useState<number>(startOdo + 380);
  const [endFuelPct, setEndFuelPct] = useState<number>(Math.max(10, startFuel - 10));
  const [receivedBy, setReceivedBy] = useState<string>('Staff / Admin');

  // Guided Photo Capture
  const [photos, setPhotos] = useState<{
    front: boolean;
    rear: boolean;
    left: boolean;
    right: boolean;
    interior: boolean;
    odometer: boolean;
    fuelGauge: boolean;
  }>({
    front: true,
    rear: true,
    left: true,
    right: true,
    interior: true,
    odometer: true,
    fuelGauge: true,
  });

  // Manual Toll Logging
  const [manualTollExpenses, setManualTollExpenses] = useState<number>(320);
  const [tollReceiptNotes, setTollReceiptNotes] = useState<string>('Highway toll slips given by customer.');

  // Damage checklist & notes
  const [damageCharge, setDamageCharge] = useState<number>(0);
  const [damageNotes, setDamageNotes] = useState<string>('');

  // Penalties (Always with mandatory reason!)
  const [penalties, setPenalties] = useState<PenaltyItem[]>([
    {
      id: 'pen-late-01',
      reason: 'Car interior cleaning fee for mud on carpets',
      amount: 400,
      appliedBy: 'Admin',
      appliedAt: new Date().toISOString(),
      waived: false,
      waiverReason: '',
    }
  ]);
  const [newPenaltyReason, setNewPenaltyReason] = useState<string>('');
  const [newPenaltyAmount, setNewPenaltyAmount] = useState<number>(500);

  // Calculations
  const kmAllowance = (vehicle?.kmAllowancePerDay || 300) * booking.totalDays;
  const kmDriven = Math.max(0, endOdometer - startOdo);
  const excessKm = Math.max(0, kmDriven - kmAllowance);
  const excessKmRate = vehicle?.excessKmRate || 15;
  const excessKmCharge = excessKm * excessKmRate;

  const fuelDeficitPct = Math.max(0, startFuel - endFuelPct);
  const fuelPenaltyCharge = fuelDeficitPct > 5 ? fuelDeficitPct * 40 : 0;

  const activePenaltiesTotal = penalties
    .filter(p => !p.waived)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalDeductions = excessKmCharge + fuelPenaltyCharge + damageCharge + manualTollExpenses + activePenaltiesTotal;
  const netDepositRefund = Math.max(0, booking.depositAmount - totalDeductions);

  const handleAddPenalty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPenaltyReason.trim()) {
      alert('Please write a reason for adding this fine or charge.');
      return;
    }
    const item: PenaltyItem = {
      id: `pen-${Date.now()}`,
      reason: newPenaltyReason.trim(),
      amount: Number(newPenaltyAmount),
      appliedBy: receivedBy,
      appliedAt: new Date().toISOString(),
      waived: false,
    };
    setPenalties([...penalties, item]);
    setNewPenaltyReason('');
    setNewPenaltyAmount(500);
  };

  const handleToggleWaive = (penaltyId: string) => {
    const target = penalties.find(p => p.id === penaltyId);
    if (!target) return;

    if (!target.waived) {
      const reason = prompt('Compulsory: Please enter the reason for waiving / removing this charge:');
      if (!reason || !reason.trim()) {
        alert('You cannot waive any charge without giving a clear reason.');
        return;
      }
      setPenalties(penalties.map(p => p.id === penaltyId ? {
        ...p,
        waived: true,
        waiverReason: reason.trim(),
        waivedBy: receivedBy,
      } : p));
    } else {
      setPenalties(penalties.map(p => p.id === penaltyId ? {
        ...p,
        waived: false,
        waiverReason: undefined,
      } : p));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (endOdometer < startOdo) {
      alert(`Return KM (${endOdometer}) cannot be less than starting KM (${startOdo}).`);
      return;
    }

    onSubmitCheckIn(booking.id, {
      endOdometer,
      endFuelPct,
      receivedBy,
      photos: {
        front: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        rear: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        left: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        right: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        interior: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        odometer: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80',
        fuelGauge: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80',
      },
      excessKm,
      excessKmCharge,
      fuelDeficitPct,
      fuelPenaltyCharge,
      damageCharge,
      damageNotes: damageNotes.trim(),
      manualTollExpenses,
      tollReceiptNotes: tollReceiptNotes.trim(),
      penalties,
      totalDeductions,
      netDepositRefund,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className={`relative w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
        theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900 text-neutral-100'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-6 py-4 ${
          theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/80'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Car Return & Final Bill</h2>
              <span className={`font-mono text-xs px-2 py-0.5 rounded border ${
                theme === 'light' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              }`}>
                {booking.bookingCode}
              </span>
            </div>
            <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
              {resolvedVehicle.make} {resolvedVehicle.model} ({resolvedVehicle.licensePlate}) &middot; Customer: {resolvedCustomer.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              theme === 'light' ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-200' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className={`p-6 overflow-y-auto space-y-6 text-xs ${
          theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
        }`}>
          
          {/* Section 1: 7-Point Photo Inspection */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <Camera className="h-4 w-4 text-emerald-400" />
                <span>Take 7 Car Photos on Return</span>
              </div>
              <span className="text-[10px] text-neutral-500">
                Tap to check off each photo
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'front', label: '1. Front' },
                { key: 'rear', label: '2. Back' },
                { key: 'left', label: '3. Left Side' },
                { key: 'right', label: '4. Right Side' },
                { key: 'interior', label: '5. Inside Car' },
                { key: 'odometer', label: '6. KM Meter' },
                { key: 'fuelGauge', label: '7. Fuel Meter' },
              ].map(item => (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setPhotos(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-colors ${
                    photos[item.key as keyof typeof photos]
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <span className="font-medium text-[11px]">{item.label}</span>
                  {photos[item.key as keyof typeof photos] ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Camera className="h-3.5 w-3.5 text-neutral-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Damage Notes */}
            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                Any New Scratches or Damage? Notes & Repair Cost (₹)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={damageNotes}
                  onChange={e => setDamageNotes(e.target.value)}
                  placeholder="e.g. Scuff on rear bumper corner during parking"
                  className="sm:col-span-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="number"
                  value={damageCharge}
                  onChange={e => setDamageCharge(Number(e.target.value))}
                  placeholder="Repair ₹"
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: KM and Fuel Verification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between text-white font-semibold">
                <span className="flex items-center gap-1.5">
                  <Gauge className="h-4 w-4 text-emerald-400" />
                  <span>Return KM Reading</span>
                </span>
                <span className="text-[11px] text-neutral-500 font-mono">
                  Started at: {startOdo.toLocaleString()} km
                </span>
              </div>

              <div>
                <input
                  type="number"
                  value={endOdometer}
                  onChange={e => setEndOdometer(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white text-base font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800">
                <span>Total KM Driven: <strong className="text-white">{kmDriven} km</strong></span>
                <span>Free Limit: <strong className="text-neutral-300">{kmAllowance} km</strong></span>
              </div>
              {excessKm > 0 && (
                <div className="text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                  Extra KM: {excessKm} km &times; ₹{excessKmRate}/km = <strong>₹{excessKmCharge}</strong>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between text-white font-semibold">
                <span className="flex items-center gap-1.5">
                  <Fuel className="h-4 w-4 text-emerald-400" />
                  <span>Return Fuel Level (%)</span>
                </span>
                <span className="text-[11px] text-neutral-500 font-mono">
                  Started at: {startFuel}%
                </span>
              </div>

              <div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={endFuelPct}
                  onChange={e => setEndFuelPct(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="text-right font-mono text-white text-sm mt-1">{endFuelPct}%</div>
              </div>

              {fuelPenaltyCharge > 0 && (
                <div className="text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                  Fuel Shortage: {fuelDeficitPct}% lower &rarr; Refuel charge: <strong>₹{fuelPenaltyCharge}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Highway Toll Charges */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <Receipt className="h-4 w-4 text-emerald-400" />
                <span>Highway Toll Charges & Receipts</span>
              </div>
              <span className="text-[10px] text-neutral-400">
                Enter toll receipts from trip
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] text-neutral-400 mb-1">Toll Amount Spent (₹)</label>
                <input
                  type="number"
                  value={manualTollExpenses}
                  onChange={e => setManualTollExpenses(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-neutral-400 mb-1">Toll Plaza Details / Notes</label>
                <input
                  type="text"
                  value={tollReceiptNotes}
                  onChange={e => setTollReceiptNotes(e.target.value)}
                  placeholder="e.g. Pune expressway toll receipts"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Fines & Extra Charges */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                <span>Fines & Extra Charges (Reason is compulsory)</span>
              </div>
              <span className="text-[10px] text-amber-400 font-mono">
                No fee or waiver without reason
              </span>
            </div>

            <div className="space-y-2">
              {penalties.map(p => (
                <div 
                  key={p.id}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                    p.waived 
                      ? 'border-neutral-800 bg-neutral-950/40 opacity-60' 
                      : 'border-neutral-800 bg-neutral-900'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${p.waived ? 'line-through text-neutral-500' : 'text-white'}`}>
                        ₹{p.amount}
                      </span>
                      <span className="text-neutral-300 font-medium">{p.reason}</span>
                    </div>
                    {p.waived && (
                      <div className="text-[10px] text-emerald-400 font-mono">
                        WAIVED: "{p.waiverReason}" (by {p.waivedBy || 'Staff'})
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleWaive(p.id)}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-colors ${
                        p.waived
                          ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                          : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      {p.waived ? 'Re-Apply Fee' : 'Waive Fee'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Fine Form */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-neutral-800">
              <input
                type="text"
                value={newPenaltyReason}
                onChange={e => setNewPenaltyReason(e.target.value)}
                placeholder="Reason (Compulsory, e.g. delay / interior stains)"
                className="flex-1 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="number"
                value={newPenaltyAmount}
                onChange={e => setNewPenaltyAmount(Number(e.target.value))}
                placeholder="Amount ₹"
                className="w-24 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddPenalty}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Charge</span>
              </button>
            </div>
          </div>

          {/* Section 5: Deposit Refund Summary */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between text-white font-bold text-sm">
              <span>Deposit Refund Summary</span>
              <span className="font-mono text-emerald-400">Deposit Taken: ₹{booking.depositAmount.toLocaleString()}</span>
            </div>

            <div className="space-y-1.5 text-[11px] divide-y divide-neutral-800/60">
              <div className="flex justify-between py-1 text-neutral-400">
                <span>Extra KM Charges ({excessKm} km)</span>
                <span className="font-mono text-white">₹{excessKmCharge}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-400">
                <span>Fuel Shortage Penalty</span>
                <span className="font-mono text-white">₹{fuelPenaltyCharge}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-400">
                <span>Damage / Repair Deductions</span>
                <span className="font-mono text-white">₹{damageCharge}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-400">
                <span>Highway Toll Expenses</span>
                <span className="font-mono text-white">₹{manualTollExpenses}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-400">
                <span>Other Fines & Charges</span>
                <span className="font-mono text-white">₹{activePenaltiesTotal}</span>
              </div>
              <div className="flex justify-between py-2 text-xs font-bold text-white pt-2">
                <span>Total Deductions</span>
                <span className="font-mono text-red-400">-₹{totalDeductions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-extrabold text-emerald-400">
                <span>Amount to Refund to Customer UPI</span>
                <span className="font-mono text-lg">₹{netDepositRefund.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Receiving Agent */}
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Person Receiving Car (Staff / Admin)</label>
            <input
              type="text"
              value={receivedBy}
              onChange={e => setReceivedBy(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Form Actions */}
          <div className={`flex items-center justify-end gap-3 pt-3 border-t ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                theme === 'light' ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20"
            >
              Confirm Return & Refund Deposit
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
