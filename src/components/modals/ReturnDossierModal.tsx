import React, { useState } from 'react';
import { Booking, Vehicle } from '../../types/rental';
import { Download, X, Check } from 'lucide-react';
import { downloadReturnDossierPdf } from '../../utils/pdfGenerator';

interface ReturnDossierModalProps {
  booking: Booking;
  vehicle?: Vehicle;
  onClose: () => void;
  onPrintAgreement?: () => void;
}

export const ReturnDossierModal: React.FC<ReturnDossierModalProps> = ({
  booking,
  vehicle,
  onClose,
  onPrintAgreement,
}) => {
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const checkOut = booking.dispatchCheckOut;
  const checkIn = booking.returnCheckIn;

  const handleDownloadPdf = () => {
    try {
      downloadReturnDossierPdf(booking);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (e) {
      console.warn('PDF download error:', e);
    }
  };

  const odoStart = checkOut?.startOdometer || 0;
  const odoEnd = checkIn?.endOdometer || 0;
  const kmDriven = Math.max(0, odoEnd - odoStart);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-5">
        
        {/* Top Action Bar */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
              CAR RETURN BILL & DEPOSIT REFUND
            </span>
            <span className="font-mono text-xs text-neutral-400">
              {booking.bookingCode}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors shadow-sm"
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
              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs font-mono">
          <div className="flex justify-between border-b border-neutral-750 pb-3">
            <div>
              <div className="text-base font-bold text-white print:text-black">VAHAANFLOW CAR RENTALS</div>
              <div className="text-neutral-400 print:text-neutral-600">Car Return Receipt & Deposit Refund Slip</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-white print:text-black">BOOKING: {booking.bookingCode}</div>
              <div className="text-neutral-400 print:text-neutral-600">
                Date: {checkIn?.returnedAt ? new Date(checkIn.returnedAt).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>

          {/* Car and Customer summary */}
          <div className="grid grid-cols-2 gap-4 border-b border-neutral-750 pb-3 font-sans">
            <div>
              <div className="text-[11px] text-neutral-400 font-bold uppercase">Customer</div>
              <div className="text-white print:text-black font-semibold mt-1">{booking.customer.name}</div>
              <div className="text-neutral-400 text-xs">DL: {booking.customer.drivingLicense || 'Verified'}</div>
              <div className="text-neutral-400 text-xs">Phone: {booking.customer.phone}</div>
            </div>
            <div>
              <div className="text-[11px] text-neutral-400 font-bold uppercase">Car & Owner</div>
              <div className="text-white print:text-black font-semibold mt-1">{booking.vehicle.make} {booking.vehicle.model}</div>
              <div className="text-neutral-400 text-xs">Plate: {booking.vehicle.licensePlate}</div>
              <div className="text-neutral-400 text-xs">Car Owner: {booking.ownerName}</div>
            </div>
          </div>

          {/* KM & Fuel Summary */}
          <div className="grid grid-cols-2 gap-4 border-b border-neutral-750 pb-3">
            <div className="p-3 rounded bg-neutral-950/60 border border-neutral-800 print:bg-white print:border-neutral-300">
              <div className="text-neutral-400 text-[10px] uppercase font-bold font-sans">KM Summary</div>
              <div className="flex justify-between mt-1">
                <span>Start KM:</span>
                <span>{odoStart.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between">
                <span>End KM:</span>
                <span>{odoEnd.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between font-bold text-white print:text-black border-t border-neutral-800 pt-1 mt-1">
                <span>Total Driven:</span>
                <span>{kmDriven.toLocaleString()} km</span>
              </div>
            </div>

            <div className="p-3 rounded bg-neutral-950/60 border border-neutral-800 print:bg-white print:border-neutral-300">
              <div className="text-neutral-400 text-[10px] uppercase font-bold font-sans">Fuel Level Summary</div>
              <div className="flex justify-between mt-1">
                <span>Start Fuel:</span>
                <span>{checkOut?.startFuelPct || 90}%</span>
              </div>
              <div className="flex justify-between">
                <span>Return Fuel:</span>
                <span>{checkIn?.endFuelPct || 90}%</span>
              </div>
              <div className="flex justify-between font-bold text-white print:text-black border-t border-neutral-800 pt-1 mt-1">
                <span>Fuel Shortage:</span>
                <span>{checkIn?.fuelDeficitPct || 0}%</span>
              </div>
            </div>
          </div>

          {/* Deductions & Net Refund Settlement */}
          <div className="space-y-1">
            <div className="font-bold text-neutral-300 print:text-neutral-700 text-[11px] uppercase font-sans">
              Deposit & Refund Calculation
            </div>
            <div className="divide-y divide-neutral-800 border border-neutral-800 rounded p-2.5 bg-neutral-950/40 print:bg-white print:border-neutral-300">
              <div className="flex justify-between py-1">
                <span>Security Deposit Paid by Customer</span>
                <span className="font-bold text-white print:text-black">₹{booking.depositAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-400">
                <span>Extra KM Charges ({checkIn?.excessKm || 0} km)</span>
                <span>-₹{checkIn?.excessKmCharge || 0}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-400">
                <span>Fuel Shortage Charge</span>
                <span>-₹{checkIn?.fuelPenaltyCharge || 0}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-400">
                <span>Car Damage / Scratch Repair Cost</span>
                <span>-₹{checkIn?.damageCharge || 0}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-400">
                <span>Highway Toll Charges</span>
                <span>-₹{checkIn?.manualTollExpenses || 0}</span>
              </div>
              
              {/* Penalty list with reasons */}
              {checkIn?.penalties && checkIn.penalties.map(p => (
                <div key={p.id} className="flex justify-between py-1 text-neutral-400">
                  <span className="truncate pr-2">Charge: {p.reason} {p.waived && '(WAIVED)'}</span>
                  <span className={p.waived ? 'line-through text-neutral-600' : ''}>
                    {p.waived ? '₹0' : `-₹${p.amount}`}
                  </span>
                </div>
              ))}

              <div className="flex justify-between py-1.5 font-bold text-red-400 border-t border-neutral-800">
                <span>Total Deductions</span>
                <span>-₹{checkIn?.totalDeductions || 0}</span>
              </div>

              <div className="flex justify-between py-2 text-sm font-extrabold text-emerald-400 print:text-emerald-700 border-t border-neutral-750">
                <span>Refund Paid to Customer UPI</span>
                <span>₹{(checkIn?.netDepositRefund ?? booking.depositAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Inspector Acknowledgement */}
          <div className="grid grid-cols-2 gap-8 pt-4 font-sans">
            <div className="border-t border-neutral-700 pt-2 text-center text-[11px] text-neutral-400">
              <div className="font-serif italic text-white print:text-black mb-1">
                {checkIn?.receivedBy || 'Staff / Admin'}
              </div>
              <div>Staff / Admin Signature</div>
            </div>
            <div className="border-t border-neutral-700 pt-2 text-center text-[11px] text-neutral-400">
              <div className="font-serif italic text-white print:text-black mb-1">
                {booking.customer.name}
              </div>
              <div>Customer Signature</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
