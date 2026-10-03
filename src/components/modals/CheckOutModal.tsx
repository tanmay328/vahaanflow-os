import React, { useState } from 'react';
import { Booking, Vehicle } from '../../types/rental';
import { 
  X, 
  Camera, 
  Check, 
  Gauge, 
  Fuel 
} from 'lucide-react';

interface CheckOutModalProps {
  booking: Booking;
  vehicle?: Vehicle;
  onClose: () => void;
  onSubmitCheckOut: (bookingId: string, details: {
    startOdometer: number;
    startFuelPct: number;
    dispatchedBy: string;
    photos: {
      front?: string;
      rear?: string;
      left?: string;
      right?: string;
      interior?: string;
      odometer?: string;
      fuelGauge?: string;
    };
    inspectionNotes?: string;
    customerSignature?: string;
  }) => void;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  booking,
  vehicle,
  onClose,
  onSubmitCheckOut,
}) => {
  const [startOdometer, setStartOdometer] = useState<number>(vehicle?.odometer || 18000);
  const [startFuelPct, setStartFuelPct] = useState<number>(vehicle?.fuelOrBatteryPct || 90);
  const [dispatchedBy, setDispatchedBy] = useState<string>('Staff / Admin');
  const [customerSignature, setCustomerSignature] = useState<string>(booking.customer.name);
  const [inspectionNotes, setInspectionNotes] = useState<string>(
    'Car is neat and clean. Tool kit, spare wheel, and RC copy present in car.'
  );

  // 7 Car Photos
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitCheckOut(booking.id, {
      startOdometer,
      startFuelPct,
      dispatchedBy,
      photos: {
        front: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        rear: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        left: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        right: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        interior: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
        odometer: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80',
        fuelGauge: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80',
      },
      inspectionNotes,
      customerSignature,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-950/80">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Car Handover (Start Trip)</h2>
              <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {booking.bookingCode}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              {booking.vehicle.make} {booking.vehicle.model} ({booking.vehicle.licensePlate}) &middot; Giving to {booking.customer.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-neutral-300">
          
          {/* Section 1: 7-Point Photo Inspection */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white text-xs">
                <Camera className="h-4 w-4 text-emerald-400" />
                <span>Take 7 Car Photos before Giving Keys</span>
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
          </div>

          {/* Section 2: KM and Fuel Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-2">
              <label className="flex items-center justify-between text-white font-semibold">
                <span className="flex items-center gap-1.5">
                  <Gauge className="h-4 w-4 text-emerald-400" />
                  <span>Starting KM Reading</span>
                </span>
              </label>
              <input
                type="number"
                value={startOdometer}
                onChange={e => setStartOdometer(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono text-base focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-neutral-500 block">
                Free Allowance: {(vehicle?.kmAllowancePerDay || 300) * booking.totalDays} km ({vehicle?.kmAllowancePerDay || 300} km/day)
              </span>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-2">
              <label className="flex items-center justify-between text-white font-semibold">
                <span className="flex items-center gap-1.5">
                  <Fuel className="h-4 w-4 text-emerald-400" />
                  <span>Starting Fuel Level</span>
                </span>
                <span className="font-mono text-emerald-400">{startFuelPct}%</span>
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={startFuelPct}
                onChange={e => setStartFuelPct(Number(e.target.value))}
                className="w-full accent-emerald-500 mt-2"
              />
              <span className="text-[10px] text-neutral-500 block">
                Customer should return car with at least {startFuelPct}% fuel or pay fuel charge.
              </span>
            </div>
          </div>

          {/* Section 3: Notes & Customer Signature */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">Car Condition Notes</label>
              <textarea
                value={inspectionNotes}
                onChange={e => setInspectionNotes(e.target.value)}
                rows={2}
                placeholder="Mention any existing scratch or notes"
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Person Giving Keys (Staff / Admin)</label>
                <input
                  type="text"
                  value={dispatchedBy}
                  onChange={e => setDispatchedBy(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Customer Name / Signature</label>
                <input
                  type="text"
                  value={customerSignature}
                  onChange={e => setCustomerSignature(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-serif italic text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
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
              Confirm & Hand Over Keys
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
