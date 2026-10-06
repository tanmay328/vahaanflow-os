import React, { useState } from 'react';
import { Booking, Vehicle } from '../../types/rental';
import { Download, X, Check } from 'lucide-react';
import { downloadReturnDossierPdf } from '../../utils/pdfGenerator';

interface ReturnDossierModalProps {
  booking: Booking;
  vehicle?: Vehicle;
  onClose: () => void;
  onPrintAgreement?: () => void;
  theme?: 'dark' | 'light';
}

export const ReturnDossierModal: React.FC<ReturnDossierModalProps> = ({
  booking,
  vehicle,
  onClose,
  onPrintAgreement,
  theme = 'dark',
}) => {
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const checkOut = booking.dispatchCheckOut;
  const checkIn = booking.returnCheckIn;

  const resolvedVehicle = vehicle || booking.vehicle || {
    make: 'Car',
    model: '',
    licensePlate: 'N/A',
    category: 'Standard',
    image: '',
    dailyRate: booking.baseRate || 0,
  };

  const resolvedCustomer = booking.customer || {
    name: 'Customer',
    phone: 'N/A',
    email: 'N/A',
    drivingLicense: 'Verified',
    kycStatus: 'verified' as const,
  };

  const handleDownloadPdf = () => {
    try {
      const enrichedBooking: Booking = {
        ...booking,
        vehicle: resolvedVehicle,
        customer: resolvedCustomer,
      };
      downloadReturnDossierPdf(enrichedBooking);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (e) {
      console.warn('PDF download error:', e);
    }
  };

  const odoStart = checkOut?.startOdometer || 0;
  const odoEnd = checkIn?.endOdometer || 0;
  const kmDriven = Math.max(0, odoEnd - odoStart);
  const depositAmount = booking.depositAmount ?? 10000;
  const excessKmCharge = checkIn?.excessKmCharge || 0;
  const fuelPenaltyCharge = checkIn?.fuelPenaltyCharge || 0;
  const damageCharge = checkIn?.damageCharge || 0;
  const tollExpenses = checkIn?.manualTollExpenses || 0;
  const totalDeductions = checkIn?.totalDeductions || (excessKmCharge + fuelPenaltyCharge + damageCharge + tollExpenses);
  const netRefund = checkIn?.netDepositRefund !== undefined ? checkIn.netDepositRefund : Math.max(0, depositAmount - totalDeductions);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className={`my-8 w-full max-w-2xl rounded-xl border p-6 shadow-2xl space-y-5 ${
        theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-neutral-800 bg-neutral-900 text-neutral-100'
      }`}>
        
        {/* Top Action Bar */}
        <div className={`flex items-center justify-between border-b pb-3 ${
          theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-xs px-2 py-0.5 rounded border ${
              theme === 'light' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}>
              CAR RETURN BILL & DEPOSIT REFUND
            </span>
            <span className={`font-mono text-xs ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
              {booking.bookingCode}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm cursor-pointer"
              title="Download official PDF document"
            >
              {isDownloaded ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className={`p-1 rounded transition-colors cursor-pointer ${
                theme === 'light' ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs font-mono">
          <div className={`flex justify-between border-b pb-3 ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
            <div>
              <div className={`text-base font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>GODRIVE CAR RENTALS</div>
              <div className={`${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'} print:text-neutral-600`}>Car Return Receipt & Deposit Refund Slip</div>
            </div>
            <div className="text-right">
              <div className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>BOOKING: {booking.bookingCode}</div>
              <div className={`${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'} print:text-neutral-600`}>
                Date: {checkIn?.returnedAt ? new Date(checkIn.returnedAt).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>

          {/* Car and Customer summary */}
          <div className={`grid grid-cols-2 gap-4 border-b pb-3 font-sans ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
            <div>
              <div className={`text-[11px] font-bold uppercase ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>Customer</div>
              <div className={`font-semibold mt-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>{resolvedCustomer.name}</div>
              <div className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>DL: {resolvedCustomer.drivingLicense || 'Verified'}</div>
              <div className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Phone: {resolvedCustomer.phone}</div>
            </div>
            <div>
              <div className={`text-[11px] font-bold uppercase ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>Car & Owner</div>
              <div className={`font-semibold mt-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>{resolvedVehicle.make} {resolvedVehicle.model}</div>
              <div className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Plate: {resolvedVehicle.licensePlate}</div>
              <div className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Car Owner: {booking.ownerName || 'Verified Partner'}</div>
            </div>
          </div>

          {/* KM & Fuel Summary */}
          <div className="grid grid-cols-2 gap-4 border-b pb-3 font-sans">
            <div className={`p-3 rounded border print:bg-white print:border-neutral-300 ${
              theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
            }`}>
              <div className={`text-[10px] uppercase font-bold font-sans ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>KM Summary</div>
              <div className="flex justify-between mt-1">
                <span className={theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}>Start KM:</span>
                <span className="font-mono">{(odoStart || 0).toLocaleString()} km</span>
              </div>
              <div className="flex justify-between">
                <span className={theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}>End KM:</span>
                <span className="font-mono">{(odoEnd || 0).toLocaleString()} km</span>
              </div>
              <div className={`flex justify-between font-bold border-t pt-1 mt-1 print:text-black ${
                theme === 'light' ? 'border-slate-200 text-slate-900' : 'border-neutral-800 text-white'
              }`}>
                <span>Total Driven:</span>
                <span className="font-mono">{(kmDriven || 0).toLocaleString()} km</span>
              </div>
            </div>

            <div className={`p-3 rounded border print:bg-white print:border-neutral-300 ${
              theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
            }`}>
              <div className={`text-[10px] uppercase font-bold font-sans ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>Fuel Level Summary</div>
              <div className="flex justify-between mt-1">
                <span className={theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}>Start Fuel:</span>
                <span className="font-mono">{checkOut?.startFuelPct || 90}%</span>
              </div>
              <div className="flex justify-between">
                <span className={theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}>Return Fuel:</span>
                <span className="font-mono">{checkIn?.endFuelPct || 90}%</span>
              </div>
              <div className={`flex justify-between font-bold border-t pt-1 mt-1 print:text-black ${
                theme === 'light' ? 'border-slate-200 text-slate-900' : 'border-neutral-800 text-white'
              }`}>
                <span>Fuel Shortage:</span>
                <span className="font-mono">{checkIn?.fuelDeficitPct || 0}%</span>
              </div>
            </div>
          </div>

          {/* Deductions & Net Refund Settlement */}
          <div className="space-y-1">
            <div className={`font-bold text-[11px] uppercase font-sans ${theme === 'light' ? 'text-slate-500' : 'text-neutral-300'} print:text-neutral-700`}>
              Deposit & Refund Calculation
            </div>
            <div className={`divide-y border rounded p-2.5 print:bg-white print:border-neutral-300 ${
              theme === 'light' ? 'divide-slate-200 border-slate-200 bg-slate-50' : 'divide-neutral-800 border-neutral-800 bg-neutral-950/40'
            }`}>
              <div className="flex justify-between py-1">
                <span>Security Deposit Paid by Customer</span>
                <span className={`font-bold font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>₹{(depositAmount || 0).toLocaleString()}</span>
              </div>
              <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                <span>Extra KM Charges ({checkIn?.excessKm || 0} km)</span>
                <span className="font-mono">-₹{(excessKmCharge || 0).toLocaleString()}</span>
              </div>
              <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                <span>Fuel Shortage Charge</span>
                <span className="font-mono">-₹{(fuelPenaltyCharge || 0).toLocaleString()}</span>
              </div>
              <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                <span>Car Damage / Scratch Repair Cost</span>
                <span className="font-mono">-₹{(damageCharge || 0).toLocaleString()}</span>
              </div>
              <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                <span>Highway Toll Charges</span>
                <span className="font-mono">-₹{(tollExpenses || 0).toLocaleString()}</span>
              </div>
              
              {/* Penalty list with reasons */}
              {checkIn?.penalties && checkIn.penalties.map(p => (
                <div key={p.id} className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                  <span className="truncate pr-2">Charge: {p.reason} {p.waived && '(WAIVED)'}</span>
                  <span className={`font-mono ${p.waived ? (theme === 'light' ? 'line-through text-slate-400' : 'line-through text-neutral-600') : ''}`}>
                    {p.waived ? '₹0' : `-₹${(p.amount || 0).toLocaleString()}`}
                  </span>
                </div>
              ))}

              <div className={`flex justify-between py-1.5 font-bold border-t ${
                theme === 'light' ? 'text-rose-600 border-slate-200' : 'text-red-400 border-neutral-800'
              }`}>
                <span>Total Deductions</span>
                <span className="font-mono">-₹{(totalDeductions || 0).toLocaleString()}</span>
              </div>

              <div className={`flex justify-between py-2 text-sm font-extrabold border-t ${
                theme === 'light' ? 'text-emerald-700 border-slate-200' : 'text-emerald-400 border-neutral-750'
              } print:text-emerald-700`}>
                <span>Refund Paid to Customer UPI</span>
                <span className="font-mono text-base">₹{(netRefund || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Inspector Acknowledgement */}
          <div className="grid grid-cols-2 gap-8 pt-4 font-sans">
            <div className={`border-t pt-2 text-center text-[11px] ${
              theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-neutral-700 text-neutral-400'
            }`}>
              <div className={`font-serif italic mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>
                {checkIn?.receivedBy || 'Staff / Admin'}
              </div>
              <div>Staff / Admin Signature</div>
            </div>
            <div className={`border-t pt-2 text-center text-[11px] ${
              theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-neutral-700 text-neutral-400'
            }`}>
              <div className={`font-serif italic mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>
                {resolvedCustomer.name}
              </div>
              <div>Customer Signature</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
