import { jsPDF } from 'jspdf';
import { Booking } from '../types/rental';

/**
 * Generates and triggers direct download of the official Tax Invoice & Rental Contract PDF
 */
export function downloadRentalAgreementPdf(booking: Booking): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth() || 210;
  let y = 18;

  // Background header band
  doc.setFillColor(15, 23, 42); // dark slate #0f172a
  doc.roundedRect(12, y - 6, pageWidth - 24, 28, 3, 3, 'F');

  // Brand Name & Tagline
  doc.setTextColor(52, 211, 153); // emerald 400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('VAHAANFLOW MOBILITY PLATFORM', 18, y + 4);

  doc.setTextColor(203, 213, 225); // slate 300
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('GSTIN: 29AABCV1290K1Z5  |  CIN: U63090KA2024PTC189201', 18, y + 10);
  doc.text('Bengaluru Headquarters  |  support@vahaanflow.in', 18, y + 15);

  // Booking reference on top right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`BOOKING: ${booking.bookingCode}`, pageWidth - 18, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const dateStr = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  doc.text(`Date: ${dateStr}`, pageWidth - 18, y + 10, { align: 'right' });

  doc.setTextColor(52, 211, 153);
  doc.setFont('helvetica', 'bold');
  doc.text(`STATUS: ${booking.status.toUpperCase()}`, pageWidth - 18, y + 15, { align: 'right' });

  y += 34;

  // 2-Column Info Box (Renter Details & Vehicle Assignment)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, pageWidth - 24, 38, 2, 2, 'FD');

  // Left Col: Renter Details
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('RENTER DETAILS', 18, y + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(booking.customer?.name || 'Customer', 18, y + 13);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Phone: ${booking.customer?.phone || 'N/A'}`, 18, y + 19);
  doc.text(`Email: ${booking.customer?.email || 'N/A'}`, 18, y + 25);
  doc.text(`Driving License: ${booking.customer?.drivingLicense || 'Verified on file'}`, 18, y + 31);

  // Vertical Separator
  doc.setDrawColor(226, 232, 240);
  doc.line(pageWidth / 2, y + 4, pageWidth / 2, y + 34);

  // Right Col: Vehicle & Owner Assignment
  const rightX = pageWidth / 2 + 6;
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('VEHICLE & OWNER ASSIGNMENT', rightX, y + 7);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${booking.vehicle?.make || 'Car'} ${booking.vehicle?.model || ''}`, rightX, y + 13);

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Registration Plate: ${booking.vehicle?.licensePlate || 'N/A'}`, rightX, y + 19);
  doc.text(`Owner Partner: ${booking.ownerName || 'Verified Fleet Owner'}`, rightX, y + 25);
  doc.text(`Trip Dates: ${booking.startDate} to ${booking.endDate} (${booking.totalDays || 3} Days)`, rightX, y + 31);

  y += 46;

  // TAX INVOICE LEDGER
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TAX INVOICE & RENTAL LEDGER', 12, y);

  y += 4;

  const totalRental = booking.totalRental || (booking.baseRate || 3800) * (booking.totalDays || 3);
  const cgst = Math.round(totalRental * 0.09);
  const sgst = Math.round(totalRental * 0.09);
  const deposit = booking.depositAmount || 10000;
  const grandTotal = totalRental + deposit;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(12, y, pageWidth - 24, 7, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Description', 16, y + 5);
  doc.text('Amount (INR)', pageWidth - 16, y + 5, { align: 'right' });

  y += 7;

  // Ledger items
  const ledgerItems = [
    [`Vehicle Base Rental (${booking.totalDays || 3} days @ ₹${(booking.baseRate || Math.round(totalRental / (booking.totalDays || 3))).toLocaleString()}/day)`, `₹${totalRental.toLocaleString()}`],
    ['Central GST (CGST 9%)', `₹${cgst.toLocaleString()}`],
    ['State GST (SGST 9%)', `₹${sgst.toLocaleString()}`],
    ['Refundable Security Escrow Deposit Hold', `₹${deposit.toLocaleString()}`],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  ledgerItems.forEach((row, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y, pageWidth - 24, 7, 'F');
    }
    doc.text(row[0], 16, y + 5);
    doc.text(row[1], pageWidth - 16, y + 5, { align: 'right' });
    y += 7;
  });

  // Total Row
  doc.setFillColor(220, 252, 231); // emerald 100
  doc.rect(12, y, pageWidth - 24, 8, 'F');
  doc.setTextColor(6, 78, 59); // emerald 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Total Amount Charged (Rental + Refundable Deposit)', 16, y + 5.5);
  doc.text(`₹${grandTotal.toLocaleString()}`, pageWidth - 16, y + 5.5, { align: 'right' });

  y += 16;

  // TERMS & POLICIES
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TERMS & RENTAL CONDITIONS', 12, y);

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  const terms = [
    '1. Daily mileage allowance is bundled as agreed; excess kilometers are charged per standard platform rates.',
    '2. Fuel or battery charge must match dispatch level upon return to avoid refueling charges.',
    '3. All electronic highway tolls (FASTag) incurred during trip will be reconciled upon return settlement.',
    '4. Vehicle must not be driven by unauthorized drivers or used for commercial sub-leasing or off-road stunts.',
    '5. The security deposit is held in escrow and refunded within 24 hours of successful check-in inspection.',
  ];

  terms.forEach(t => {
    doc.text(t, 12, y);
    y += 4.5;
  });

  y += 12;

  // Signature Block
  doc.setDrawColor(203, 213, 225);
  doc.line(16, y, 75, y);
  doc.line(pageWidth - 75, y, pageWidth - 16, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(booking.customer?.name || 'Customer Signature', 16, y + 5);
  doc.text('Authorized Fleet Desk', pageWidth - 16, y + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Customer / Primary Driver', 16, y + 9);
  doc.text('VahaanFlow Platform Officer', pageWidth - 16, y + 9, { align: 'right' });

  // Trigger Instant PDF Download
  doc.save(`Rental_Agreement_${booking.bookingCode}.pdf`);
}

/**
 * Generates and triggers direct download of the official Return Bill & Settlement PDF
 */
export function downloadReturnDossierPdf(booking: Booking): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth() || 210;
  let y = 18;

  // Background header band
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(12, y - 6, pageWidth - 24, 28, 3, 3, 'F');

  doc.setTextColor(52, 211, 153);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('VAHAANFLOW CAR RENTALS', 18, y + 4);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Car Return Receipt & Deposit Refund Settlement Slip', 18, y + 10);
  doc.text('support@vahaanflow.in  |  24x7 Roadside Helpline', 18, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`BOOKING: ${booking.bookingCode}`, pageWidth - 18, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Completed: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 18, y + 10, { align: 'right' });

  doc.setTextColor(52, 211, 153);
  doc.setFont('helvetica', 'bold');
  doc.text('STATUS: RETURNED & SETTLED', pageWidth - 18, y + 15, { align: 'right' });

  y += 34;

  // Renter & Vehicle Summary
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, pageWidth - 24, 30, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CUSTOMER / RENTER', 18, y + 6);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(booking.customer?.name || 'Customer', 18, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${booking.customer?.phone || 'N/A'}`, 18, y + 18);
  doc.text(`DL: ${booking.customer?.drivingLicense || 'Verified on file'}`, 18, y + 24);

  doc.setDrawColor(226, 232, 240);
  doc.line(pageWidth / 2, y + 4, pageWidth / 2, y + 26);

  const rightX = pageWidth / 2 + 6;
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('VEHICLE RETURNED', rightX, y + 6);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${booking.vehicle?.make || 'Car'} ${booking.vehicle?.model || ''}`, rightX, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Plate: ${booking.vehicle?.licensePlate || 'N/A'}`, rightX, y + 18);
  doc.text(`Return Hub: ${booking.dropoffLocation || 'Bangalore Hub'}`, rightX, y + 24);

  y += 38;

  // SETTLEMENT LEDGER
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SECURITY DEPOSIT SETTLEMENT LEDGER', 12, y);

  y += 4;

  const depositHeld = booking.depositAmount || 10000;
  const netRefund = booking.returnCheckIn?.netDepositRefund !== undefined ? booking.returnCheckIn.netDepositRefund : depositHeld;

  doc.setFillColor(241, 245, 249);
  doc.rect(12, y, pageWidth - 24, 7, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Settlement Component', 16, y + 5);
  doc.text('Amount (INR)', pageWidth - 16, y + 5, { align: 'right' });

  y += 7;

  const returnItems = [
    ['Original Escrow Deposit Held', `₹${depositHeld.toLocaleString()}`],
    ['Fastag Highway Tolls Reconciled', '₹0 (Cleared)'],
    ['Fuel / Charge Discrepancy Surcharge', '₹0 (Full Level)'],
    ['Damage / Penalty Deductions', '₹0 (Clean Return)'],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  returnItems.forEach((row, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y, pageWidth - 24, 7, 'F');
    }
    doc.text(row[0], 16, y + 5);
    doc.text(row[1], pageWidth - 16, y + 5, { align: 'right' });
    y += 7;
  });

  // Net Refund Highlight
  doc.setFillColor(220, 252, 231);
  doc.rect(12, y, pageWidth - 24, 8, 'F');
  doc.setTextColor(6, 78, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Net Security Deposit Refunded (to source bank/UPI)', 16, y + 5.5);
  doc.text(`₹${netRefund.toLocaleString()}`, pageWidth - 16, y + 5.5, { align: 'right' });

  y += 18;

  // Signature Block
  doc.setDrawColor(203, 213, 225);
  doc.line(16, y, 75, y);
  doc.line(pageWidth - 75, y, pageWidth - 16, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(booking.customer?.name || 'Customer Signature', 16, y + 5);
  doc.text('Authorized Return Inspector', pageWidth - 16, y + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Customer Acknowledgment', 16, y + 9);
  doc.text('VahaanFlow Check-in Officer', pageWidth - 16, y + 9, { align: 'right' });

  doc.save(`Return_Settlement_${booking.bookingCode}.pdf`);
}
