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
  theme?: 'dark' | 'light';
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  booking,
  vehicle,
  onClose,
  onSubmitCheckOut,
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

  const [startOdometer, setStartOdometer] = useState<number>(vehicle?.odometer || 18000);
  const [startFuelPct, setStartFuelPct] = useState<number>(vehicle?.fuelOrBatteryPct || 90);
  const [dispatchedBy, setDispatchedBy] = useState<string>('Staff / Admin');
  const [customerSignature, setCustomerSignature] = useState<string>(resolvedCustomer.name);
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
      <div className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
        theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900 text-neutral-100'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-6 py-4 ${
          theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/80'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Car Handover (Start Trip)</h2>
              <span className={`font-mono text-xs px-2 py-0.5 rounded border ${
                theme === 'light' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              }`}>
                {booking.bookingCode}
              </span>
            </div>
            <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
              {resolvedVehicle.make} {resolvedVehicle.model} ({resolvedVehicle.licensePlate}) &middot; Giving to {resolvedCustomer.name}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className={`p-6 overflow-y-auto space-y-5 text-xs ${
          theme === 'light' ? 'text-slate-700' : 'text-neutral-300'
        }`}>
          
          {/* Section 1: 7-Point Photo Inspection */}
          <div className={`rounded-xl border p-4 space-y-3 ${
            theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/60'
          }`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 font-bold text-xs ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <Camera className="h-4 w-4 text-emerald-500" />
                <span>Take 7 Car Photos before Giving Keys</span>
              </div>
              <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>
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
                      ? (theme === 'light' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300')
                      : (theme === 'light' ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100' : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800')
                  }`}
                >
                  <span className="font-medium text-[11px]">{item.label}</span>
                  {photos[item.key as keyof typeof photos] ? (
                    <Check className={`h-3.5 w-3.5 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  ) : (
                    <Camera className="h-3.5 w-3.5 text-neutral-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: KM and Fuel Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`rounded-xl border p-4 space-y-2 ${
              theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/60'
            }`}>
              <label className={`flex items-center justify-between font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <span className="flex items-center gap-1.5">
                  <Gauge className="h-4 w-4 text-emerald-500" />
                  <span>Starting KM Reading</span>
                </span>
              </label>
              <input
                type="number"
                value={startOdometer}
                onChange={e => setStartOdometer(Number(e.target.value))}
                className={`w-full rounded-lg border px-3 py-2 font-mono text-base focus:border-emerald-500 focus:outline-none ${
                  theme === 'light' ? 'border-slate-300 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900 text-white'
                }`}
              />
              <span className={`text-[10px] block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>
                Free Allowance: {(vehicle?.kmAllowancePerDay || 300) * booking.totalDays} km ({vehicle?.kmAllowancePerDay || 300} km/day)
              </span>
            </div>

            <div className={`rounded-xl border p-4 space-y-2 ${
              theme === 'light' ? 'border-slate-200 bg-slate-50' : 'border-neutral-800 bg-neutral-950/60'
            }`}>
              <label className={`flex items-center justify-between font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <span className="flex items-center gap-1.5">
                  <Fuel className="h-4 w-4 text-emerald-500" />
                  <span>Starting Fuel Level</span>
                </span>
                <span className={`font-mono ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>{startFuelPct}%</span>
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={startFuelPct}
                onChange={e => setStartFuelPct(Number(e.target.value))}
                className="w-full accent-emerald-500 mt-2"
              />
              <span className={`text-[10px] block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>
                Customer should return car with at least {startFuelPct}% fuel or pay fuel charge.
              </span>
            </div>
          </div>

          {/* Section 3: Notes & Customer Signature */}
          <div className="space-y-3">
            <div>
              <label className={`block text-[11px] mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Car Condition Notes</label>
              <textarea
                value={inspectionNotes}
                onChange={e => setInspectionNotes(e.target.value)}
                rows={2}
                placeholder="Mention any existing scratch or notes"
                className={`w-full rounded-lg border px-3 py-2 focus:border-emerald-500 focus:outline-none ${
                  theme === 'light' ? 'border-slate-300 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900 text-white'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Person Giving Keys (Staff / Admin)</label>
                <input
                  type="text"
                  value={dispatchedBy}
                  onChange={e => setDispatchedBy(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 focus:border-emerald-500 focus:outline-none ${
                    theme === 'light' ? 'border-slate-300 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Customer Name / Signature</label>
                <input
                  type="text"
                  value={customerSignature}
                  onChange={e => setCustomerSignature(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 font-serif italic text-sm focus:border-emerald-500 focus:outline-none ${
                    theme === 'light' ? 'border-slate-300 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900 text-white'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
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
              Confirm & Hand Over Keys
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
