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
    [`Vehicle Base Rental (${booking.totalDays || 3} days @ Rs. ${(booking.baseRate || Math.round(totalRental / (booking.totalDays || 3))).toLocaleString()}/day)`, `Rs. ${totalRental.toLocaleString()}`],
    ['Central GST (CGST 9%)', `Rs. ${cgst.toLocaleString()}`],
    ['State GST (SGST 9%)', `Rs. ${sgst.toLocaleString()}`],
    ['Refundable Security Escrow Deposit Hold', `Rs. ${deposit.toLocaleString()}`],
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
  doc.text(`Rs. ${grandTotal.toLocaleString()}`, pageWidth - 16, y + 5.5, { align: 'right' });

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
 * with complete itemized subtractions of extra KM, fuel deficit, damage, tolls, and penalties.
 */
export function downloadReturnDossierPdf(booking: Booking): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth() || 210;
  let y = 18;

  // Extract check out and check in telemetry
  const checkOut = booking.dispatchCheckOut;
  const checkIn = booking.returnCheckIn;

  const odoStart = checkOut?.startOdometer || 0;
  const odoEnd = checkIn?.endOdometer || 0;
  const kmDriven = Math.max(0, odoEnd - odoStart);

  const startFuel = checkOut?.startFuelPct ?? 95;
  const endFuel = checkIn?.endFuelPct ?? 92;
  const fuelDeficit = checkIn?.fuelDeficitPct ?? 0;

  // Deposit and deductions
  const depositHeld = booking.depositAmount || 10000;
  const excessKm = checkIn?.excessKm || 0;
  const excessKmCharge = checkIn?.excessKmCharge || 0;
  const fuelPenaltyCharge = checkIn?.fuelPenaltyCharge || 0;
  const damageCharge = checkIn?.damageCharge || 0;
  const tollExpenses = checkIn?.manualTollExpenses || 0;
  const penalties = checkIn?.penalties || [];

  // Calculate total deductions
  const penaltiesTotal = penalties.filter(p => !p.waived).reduce((sum, p) => sum + p.amount, 0);
  const calculatedTotalDeductions = excessKmCharge + fuelPenaltyCharge + damageCharge + tollExpenses + penaltiesTotal;
  const totalDeductions = checkIn?.totalDeductions !== undefined ? checkIn.totalDeductions : calculatedTotalDeductions;
  const netRefund = checkIn?.netDepositRefund !== undefined ? checkIn.netDepositRefund : Math.max(0, depositHeld - totalDeductions);

  // Background header band
  doc.setFillColor(15, 23, 42); // slate 900
  doc.roundedRect(12, y - 6, pageWidth - 24, 28, 3, 3, 'F');

  doc.setTextColor(52, 211, 153); // emerald 400
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
  const returnedDate = checkIn?.returnedAt ? new Date(checkIn.returnedAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  doc.text(`Date: ${returnedDate}`, pageWidth - 18, y + 10, { align: 'right' });

  doc.setTextColor(52, 211, 153);
  doc.setFont('helvetica', 'bold');
  doc.text('STATUS: RETURNED & SETTLED', pageWidth - 18, y + 15, { align: 'right' });

  y += 32;

  // Customer & Vehicle Details (2-Column Box)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, pageWidth - 24, 30, 2, 2, 'FD');

  // Left Col: Customer
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CUSTOMER', 18, y + 6);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(booking.customer?.name || 'Customer', 18, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`DL: ${booking.customer?.drivingLicense || 'Verified on file'}`, 18, y + 18);
  doc.text(`Phone: ${booking.customer?.phone || 'N/A'}`, 18, y + 24);

  // Vertical Separator
  doc.setDrawColor(226, 232, 240);
  doc.line(pageWidth / 2, y + 4, pageWidth / 2, y + 26);

  // Right Col: Car & Owner
  const rightX = pageWidth / 2 + 6;
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CAR & OWNER', rightX, y + 6);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`${booking.vehicle?.make || 'Car'} ${booking.vehicle?.model || ''}`, rightX, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Plate: ${booking.vehicle?.licensePlate || 'N/A'}`, rightX, y + 18);
  doc.text(`Car Owner: ${booking.ownerName || 'Verified Partner'}`, rightX, y + 24);

  y += 36;

  // KM & FUEL SUMMARY BOXES (2 side-by-side cards)
  const boxWidth = (pageWidth - 28) / 2;

  // KM Summary Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, y, boxWidth, 26, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('KM SUMMARY', 16, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Start KM:', 16, y + 10);
  doc.text(`${odoStart.toLocaleString()} km`, 12 + boxWidth - 4, y + 10, { align: 'right' });

  doc.text('End KM:', 16, y + 15);
  doc.text(`${odoEnd.toLocaleString()} km`, 12 + boxWidth - 4, y + 15, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Total Driven:', 16, y + 21);
  doc.text(`${kmDriven.toLocaleString()} km`, 12 + boxWidth - 4, y + 21, { align: 'right' });

  // Fuel Summary Card
  const fuelX = 12 + boxWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(fuelX, y, boxWidth, 26, 2, 2, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('FUEL LEVEL SUMMARY', fuelX + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Start Fuel:', fuelX + 4, y + 10);
  doc.text(`${startFuel}%`, fuelX + boxWidth - 4, y + 10, { align: 'right' });

  doc.text('Return Fuel:', fuelX + 4, y + 15);
  doc.text(`${endFuel}%`, fuelX + boxWidth - 4, y + 15, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Fuel Shortage:', fuelX + 4, y + 21);
  doc.text(`${fuelDeficit}%`, fuelX + boxWidth - 4, y + 21, { align: 'right' });

  y += 32;

  // SETTLEMENT & DEDUCTIONS ITEMIZATION TABLE
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('DEPOSIT & REFUND CALCULATION', 12, y);

  y += 4;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(12, y, pageWidth - 24, 6.5, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Settlement Component / Deduction Item', 16, y + 4.5);
  doc.text('Amount (INR)', pageWidth - 16, y + 4.5, { align: 'right' });

  y += 6.5;

  // Build real detailed line items
  const returnItems: [string, string, boolean][] = [];

  // 1. Initial Deposit
  returnItems.push(['Security Deposit Paid by Customer', `Rs. ${depositHeld.toLocaleString()}`, false]);

  // 2. Extra KM Charges
  if (excessKmCharge > 0 || excessKm > 0) {
    returnItems.push([`Extra KM Charges (${excessKm} km)`, `-Rs. ${excessKmCharge.toLocaleString()}`, true]);
  } else {
    returnItems.push(['Extra KM Charges (0 km)', 'Rs. 0 (Within Allowance)', false]);
  }

  // 3. Fuel Shortage Charge
  if (fuelPenaltyCharge > 0 || fuelDeficit > 0) {
    returnItems.push([`Fuel Shortage Charge (${fuelDeficit}% deficit)`, `-Rs. ${fuelPenaltyCharge.toLocaleString()}`, true]);
  } else {
    returnItems.push(['Fuel Shortage Charge', 'Rs. 0 (Full Level)', false]);
  }

  // 4. Car Damage
  if (damageCharge > 0) {
    returnItems.push(['Car Damage / Scratch Repair Cost', `-Rs. ${damageCharge.toLocaleString()}`, true]);
  } else {
    returnItems.push(['Car Damage / Scratch Repair Cost', 'Rs. 0 (Clean Return)', false]);
  }

  // 5. Tolls
  if (tollExpenses > 0) {
    returnItems.push(['Highway Toll Charges (FASTag)', `-Rs. ${tollExpenses.toLocaleString()}`, true]);
  } else {
    returnItems.push(['Highway Toll Charges', 'Rs. 0 (Cleared)', false]);
  }

  // 6. Additional Penalty adjustments
  penalties.forEach(p => {
    if (p.waived) {
      returnItems.push([`Charge: ${p.reason} (WAIVED)`, 'Rs. 0 (Waived)', false]);
    } else {
      returnItems.push([`Charge: ${p.reason}`, `-Rs. ${p.amount.toLocaleString()}`, true]);
    }
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  returnItems.forEach((row, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y, pageWidth - 24, 6, 'F');
    }

    if (row[2]) {
      // Deduction item styling
      doc.setTextColor(185, 28, 28); // red 700
      doc.text(row[0], 16, y + 4.2);
      doc.setFont('helvetica', 'bold');
      doc.text(row[1], pageWidth - 16, y + 4.2, { align: 'right' });
      doc.setFont('helvetica', 'normal');
    } else {
      // Normal item styling
      doc.setTextColor(30, 41, 59);
      doc.text(row[0], 16, y + 4.2);
      doc.setFont('helvetica', row[0].includes('Security Deposit Paid') ? 'bold' : 'normal');
      doc.text(row[1], pageWidth - 16, y + 4.2, { align: 'right' });
      doc.setFont('helvetica', 'normal');
    }
    y += 6;
  });

  // Total Deductions Summary Row
  doc.setFillColor(254, 242, 242); // red 50
  doc.rect(12, y, pageWidth - 24, 6.5, 'F');
  doc.setTextColor(185, 28, 28); // red 700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Total Deductions', 16, y + 4.5);
  doc.text(`-Rs. ${totalDeductions.toLocaleString()}`, pageWidth - 16, y + 4.5, { align: 'right' });

  y += 6.5;

  // Net Refund Highlight Row
  doc.setFillColor(220, 252, 231); // emerald 100
  doc.rect(12, y, pageWidth - 24, 8, 'F');
  doc.setTextColor(6, 78, 59); // emerald 900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Refund Paid to Customer UPI', 16, y + 5.5);
  doc.text(`Rs. ${netRefund.toLocaleString()}`, pageWidth - 16, y + 5.5, { align: 'right' });

  y += 16;

  // Signature Block
  doc.setDrawColor(203, 213, 225);
  doc.line(16, y, 75, y);
  doc.line(pageWidth - 75, y, pageWidth - 16, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(checkIn?.receivedBy || 'Staff / Admin', 16, y + 5);
  doc.text(booking.customer?.name || 'Customer Signature', pageWidth - 16, y + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Staff / Admin Signature', 16, y + 9);
  doc.text('Customer Signature', pageWidth - 16, y + 9, { align: 'right' });

  // Trigger Instant PDF Download
  doc.save(`Return_Settlement_${booking.bookingCode}.pdf`);
}
