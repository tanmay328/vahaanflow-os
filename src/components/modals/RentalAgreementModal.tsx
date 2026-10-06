import React, { useState } from 'react';
import { Booking, Vehicle } from '../../types/rental';
import { Download, X, Check } from 'lucide-react';
import { downloadRentalAgreementPdf } from '../../utils/pdfGenerator';

interface RentalAgreementModalProps {
  booking: Booking;
  vehicle?: Vehicle;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const RentalAgreementModal: React.FC<RentalAgreementModalProps> = ({
  booking,
  vehicle,
  onClose,
  theme = 'dark',
}) => {
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);

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
    drivingLicense: 'Verified on file',
    kycStatus: 'verified' as const,
  };

  const handleDownloadPdf = () => {
    try {
      const enrichedBooking: Booking = {
        ...booking,
        vehicle: resolvedVehicle,
        customer: resolvedCustomer,
      };
      downloadRentalAgreementPdf(enrichedBooking);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (e) {
      console.warn('PDF download error:', e);
    }
  };

  const totalRental = booking.totalRental ?? ((booking.baseRate || 3800) * (booking.totalDays || 1));
  const gstAmount = booking.gstAmount ?? Math.round(totalRental * 0.18);
  const cgst = Math.round(gstAmount / 2);
  const sgst = Math.round(gstAmount / 2);
  const depositAmount = booking.depositAmount ?? 10000;
  const grandTotal = totalRental + depositAmount;

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
              TAX INVOICE & RENTAL CONTRACT
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

        {/* Printable Document Body */}
        <div className="space-y-4 text-xs font-mono">
          <div className={`flex justify-between border-b pb-3 ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
            <div>
              <div className={`text-base font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>GODRIVE MOBILITY PLATFORM</div>
              <div className={`${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'} print:text-neutral-600`}>GSTIN: 29AABCV1290K1Z5 &middot; CIN: U63090KA2024PTC189201</div>
              <div className={`${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'} print:text-neutral-600`}>Bengaluru Headquarters &middot; support@godrive.in</div>
            </div>
            <div className="text-right">
              <div className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>BOOKING: {booking.bookingCode}</div>
              <div className={`${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'} print:text-neutral-600`}>Date: {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : '—'}</div>
              <div className={`${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'} print:text-emerald-700 font-bold`}>STATUS: {(booking.status || 'ACTIVE').toUpperCase()}</div>
            </div>
          </div>

          {/* Parties */}
          <div className={`grid grid-cols-2 gap-4 border-b pb-3 font-sans ${theme === 'light' ? 'border-slate-200' : 'border-neutral-800'}`}>
            <div>
              <div className={`font-bold text-[11px] uppercase ${theme === 'light' ? 'text-slate-500' : 'text-neutral-300'} print:text-neutral-700`}>Renter Details</div>
              <div className={`font-semibold mt-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>{resolvedCustomer.name}</div>
              <div className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'} print:text-neutral-600`}>Phone: {resolvedCustomer.phone}</div>
              <div className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'} print:text-neutral-600`}>Email: {resolvedCustomer.email}</div>
              <div className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'} print:text-neutral-600`}>DL: {resolvedCustomer.drivingLicense || 'Verified on file'}</div>
            </div>
            <div>
              <div className={`font-bold text-[11px] uppercase ${theme === 'light' ? 'text-slate-500' : 'text-neutral-300'} print:text-neutral-700`}>Vehicle & Owner Assignment</div>
              <div className={`font-semibold mt-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>{resolvedVehicle.make} {resolvedVehicle.model}</div>
              <div className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'} print:text-neutral-600`}>Registration: {resolvedVehicle.licensePlate}</div>
              <div className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'} print:text-neutral-600`}>Owner Partner: {booking.ownerName || 'Verified Fleet Owner'}</div>
              <div className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'} print:text-neutral-600`}>Trip: {booking.startDate} &rarr; {booking.endDate} ({booking.totalDays || 1} Days)</div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1">
            <div className={`font-bold text-[11px] uppercase font-sans ${theme === 'light' ? 'text-slate-500' : 'text-neutral-300'} print:text-neutral-700`}>Tax Invoice Ledger</div>
            <div className={`divide-y border rounded p-2 print:bg-white print:border-neutral-300 ${
              theme === 'light' ? 'divide-slate-200 border-slate-200 bg-slate-50' : 'divide-neutral-800 border-neutral-800 bg-neutral-950/40'
            }`}>
              <div className="flex justify-between py-1">
                <span>Vehicle Base Rental ({booking.totalDays || 1} days @ ₹{(booking.baseRate || Math.round(totalRental / (booking.totalDays || 1))).toLocaleString()}/day)</span>
                <span>₹{totalRental.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                <span>Central GST (CGST 9%)</span>
                <span>₹{cgst.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                <span>State GST (SGST 9%)</span>
                <span>₹{sgst.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between py-1 ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                <span>Refundable Security Escrow Deposit Hold</span>
                <span>₹{depositAmount.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between py-1 font-bold border-t print:text-black ${
                theme === 'light' ? 'text-slate-900 border-slate-200' : 'text-white border-neutral-750'
              }`}>
                <span>Total Amount Charged</span>
                <span>₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Standard Terms */}
          <div className={`text-[10px] space-y-1 font-sans border-t pt-3 ${
            theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-neutral-800 text-neutral-400'
          } print:text-neutral-600`}>
            <div>1. Daily mileage allowance is bundled as agreed; excess kilometers charged per agreement rates.</div>
            <div>2. Fuel or battery charge must match dispatch level upon return to avoid refueling surcharge.</div>
            <div>3. All highway tolls incurred during trip are payable by renter upon return settlement.</div>
            <div>4. Vehicle must not be driven by unauthorized persons or used for off-road stunts / illegal cargo.</div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 font-sans">
            <div className={`border-t pt-2 text-center text-[11px] ${
              theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-neutral-700 text-neutral-400'
            }`}>
              <div className={`font-serif italic mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>
                {booking.dispatchCheckOut?.customerSignature || resolvedCustomer.name}
              </div>
              <div>Customer Signature</div>
            </div>
            <div className={`border-t pt-2 text-center text-[11px] ${
              theme === 'light' ? 'border-slate-200 text-slate-500' : 'border-neutral-700 text-neutral-400'
            }`}>
              <div className={`font-serif italic mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'} print:text-black`}>
                {booking.dispatchCheckOut?.dispatchedBy || 'Authorized Fleet Desk'}
              </div>
              <div>Authorized Platform Officer</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
