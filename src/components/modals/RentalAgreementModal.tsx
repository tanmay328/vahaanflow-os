import React, { useState } from 'react';
import { Booking, Vehicle } from '../../types/rental';
import { Download, X, Check } from 'lucide-react';
import { downloadRentalAgreementPdf } from '../../utils/pdfGenerator';

interface RentalAgreementModalProps {
  booking: Booking;
  vehicle?: Vehicle;
  onClose: () => void;
}

export const RentalAgreementModal: React.FC<RentalAgreementModalProps> = ({
  booking,
  vehicle,
  onClose,
}) => {
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);

  const handleDownloadPdf = () => {
    try {
      downloadRentalAgreementPdf(booking);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (e) {
      console.warn('PDF download error:', e);
    }
  };

  const cgst = Math.round(booking.gstAmount / 2);
  const sgst = Math.round(booking.gstAmount / 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-5">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
              TAX INVOICE & RENTAL CONTRACT
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

        {/* Printable Document Body */}
        <div className="space-y-4 text-xs font-mono">
          <div className="flex justify-between border-b border-neutral-750 pb-3">
            <div>
              <div className="text-base font-bold text-white print:text-black">VAHAANFLOW MOBILITY PLATFORM</div>
              <div className="text-neutral-400 print:text-neutral-600">GSTIN: 29AABCV1290K1Z5 &middot; CIN: U63090KA2024PTC189201</div>
              <div className="text-neutral-400 print:text-neutral-600">Bengaluru Headquarters &middot; support@vahaanflow.in</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-white print:text-black">BOOKING: {booking.bookingCode}</div>
              <div className="text-neutral-400 print:text-neutral-600">Date: {new Date(booking.createdAt).toLocaleDateString()}</div>
              <div className="text-emerald-400 print:text-emerald-700 font-bold">STATUS: {booking.status.toUpperCase()}</div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4 border-b border-neutral-750 pb-3 font-sans">
            <div>
              <div className="font-bold text-neutral-300 print:text-neutral-700 text-[11px] uppercase">Renter Details</div>
              <div className="text-white print:text-black font-semibold mt-1">{booking.customer.name}</div>
              <div className="text-neutral-400 print:text-neutral-600 text-xs">Phone: {booking.customer.phone}</div>
              <div className="text-neutral-400 print:text-neutral-600 text-xs">Email: {booking.customer.email}</div>
              <div className="text-neutral-400 print:text-neutral-600 text-xs">DL: {booking.customer.drivingLicense || 'Verified on file'}</div>
            </div>
            <div>
              <div className="font-bold text-neutral-300 print:text-neutral-700 text-[11px] uppercase">Vehicle & Owner Assignment</div>
              <div className="text-white print:text-black font-semibold mt-1">{booking.vehicle.make} {booking.vehicle.model}</div>
              <div className="text-neutral-400 print:text-neutral-600 text-xs">Registration: {booking.vehicle.licensePlate}</div>
              <div className="text-neutral-400 print:text-neutral-600 text-xs">Owner Partner: {booking.ownerName}</div>
              <div className="text-neutral-400 print:text-neutral-600 text-xs">Trip: {booking.startDate} &rarr; {booking.endDate} ({booking.totalDays} Days)</div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="space-y-1">
            <div className="font-bold text-neutral-300 print:text-neutral-700 text-[11px] uppercase font-sans">Tax Invoice Ledger</div>
            <div className="divide-y divide-neutral-800 border border-neutral-800 rounded p-2 bg-neutral-950/40 print:bg-white print:border-neutral-300">
              <div className="flex justify-between py-1">
                <span>Vehicle Base Rental ({booking.totalDays} days @ ₹{booking.baseRate}/day)</span>
                <span>₹{booking.totalRental.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-400">
                <span>Central GST (CGST 9%)</span>
                <span>₹{cgst.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-400">
                <span>State GST (SGST 9%)</span>
                <span>₹{sgst.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 text-neutral-400">
                <span>Refundable Security Escrow Deposit Hold</span>
                <span>₹{booking.depositAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-white print:text-black border-t border-neutral-750">
                <span>Total Amount Charged</span>
                <span>₹{(booking.totalRental + booking.depositAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Standard Terms */}
          <div className="text-[10px] text-neutral-400 print:text-neutral-600 space-y-1 font-sans border-t border-neutral-800 pt-3">
            <div>1. Daily mileage allowance is bundled as agreed; excess kilometers charged per agreement rates.</div>
            <div>2. Fuel or battery charge must match dispatch level upon return to avoid refueling surcharge.</div>
            <div>3. All highway tolls incurred during trip are payable by renter upon return settlement.</div>
            <div>4. Vehicle must not be driven by unauthorized persons or used for off-road stunts / illegal cargo.</div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 font-sans">
            <div className="border-t border-neutral-700 pt-2 text-center text-[11px] text-neutral-400">
              <div className="font-serif italic text-white print:text-black mb-1">
                {booking.dispatchCheckOut?.customerSignature || booking.customer.name}
              </div>
              <div>Customer Signature</div>
            </div>
            <div className="border-t border-neutral-700 pt-2 text-center text-[11px] text-neutral-400">
              <div className="font-serif italic text-white print:text-black mb-1">
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
