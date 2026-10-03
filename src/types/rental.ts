export type VehicleStatus = 
  | 'available' 
  | 'booked' 
  | 'on_trip' 
  | 'maintenance' 
  | 'blocked';

export type VehicleCategory = 'SUV' | 'MPV' | 'Sedan' | 'Compact EV' | 'Off-Roader' | 'Luxury Van';

export type FuelType = 'Electric' | 'Diesel' | 'Petrol' | 'Strong Hybrid';

export interface VehicleDocuments {
  rcNumber?: string;
  rcExpiry?: string;
  insurancePolicy?: string;
  insuranceExpiry: string;
  pucExpiry: string;
  fitnessCertificateExpiry?: string;
  permitType?: 'All India Tourist Permit (AITP)' | 'Self-Drive Black Plate' | 'Commercial Yellow Plate' | 'Private White Plate';
  permitExpiry?: string;
  skipped?: boolean; // Owner skipped uploading for now
}

export interface Vehicle {
  id: string;
  ownerId: string; // The Vehicle Owner ID
  ownerName: string;
  ownerEmail: string;
  approvalStatus: 'approved' | 'pending_approval' | 'rejected';
  rejectionReason?: string;
  
  make: string;
  model: string;
  year: number;
  category: VehicleCategory;
  licensePlate: string; // Indian RTO format e.g. KA 05 MN 4921
  color: string;
  transmission: 'Automatic' | 'Manual';
  fuelType: FuelType;
  seatingCapacity: number;
  
  dailyRate: number; // in INR ₹ (Admin can set or override)
  suggestedDailyRate?: number; // Owner's suggested rate
  hourlyRate: number; // in INR ₹
  kmAllowancePerDay: number; // Bundled daily km (default 300 km)
  excessKmRate: number; // Rate per extra km (e.g. ₹15/km)
  depositAmount: number; // in INR ₹
  
  status: VehicleStatus;
  blockedDates?: string[]; // Dates blocked by owner for personal use (YYYY-MM-DD)
  
  documents: VehicleDocuments;
  
  currentLocation: {
    hubName: string;
    bay: string;
    city: string; // Bengaluru, Delhi NCR, Mumbai, Hyderabad, Goa, Pune
    lat: number;
    lng: number;
  };
  
  odometer: number; // in km
  fuelOrBatteryPct: number; // 0-100%
  image: string;
  
  inspectionPhotos?: {
    front?: string;
    rear?: string;
    left?: string;
    right?: string;
    interior?: string;
    odometer?: string;
    fuelGauge?: string;
  };

  notes?: string;
}

export type BookingStatus = 'confirmed' | 'active' | 'completed' | 'cancelled';

export interface PenaltyItem {
  id: string;
  reason: string; // Mandatory: Always with a reason!
  amount: number; // in INR ₹
  appliedBy: string;
  appliedAt: string;
  waived?: boolean;
  waiverReason?: string; // Mandatory if waived: Nobody can waive without a reason
  waivedBy?: string;
}

export interface Booking {
  id: string;
  bookingCode: string;
  vehicleId: string;
  vehicle: {
    make: string;
    model: string;
    licensePlate: string;
    category: string;
    image: string;
    dailyRate: number;
  };
  ownerId: string; // Used to isolate bookings to the vehicle owner
  ownerName: string;
  
  customerId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    kycStatus: 'verified' | 'pending' | 'rejected';
    // Admin sees full KYC; Owner sees name & verified status only!
    drivingLicense?: string;
    aadhaarMasked?: string;
    panNumber?: string;
  };

  status: BookingStatus;
  ownerApprovalStatus?: 'pending' | 'approved' | 'declined';
  ownerApprovalNotes?: string;
  
  startDate: string;
  endDate: string;
  pickupTime: string;
  returnTime: string;
  totalDays: number;
  
  pickupLocation: string;
  dropoffLocation: string;
  
  baseRate: number;
  totalRental: number;
  depositAmount: number;
  advancePaid: number;
  
  // Financial breakdown & Owner Payout
  platformCommissionRate: number; // e.g. 0.15 (15%)
  platformCommission: number; // in INR ₹
  gstAmount: number; // in INR ₹ (18% GST)
  ownerNetShare: number; // in INR ₹ (totalRental - platformCommission)
  payoutStatus: 'pending' | 'paid' | 'reconciled';
  payoutDate?: string;
  payoutRef?: string;
  
  createdAt: string;

  // Check-Out Handover Data
  dispatchCheckOut?: {
    dispatchedAt: string;
    dispatchedBy: string;
    startOdometer: number;
    startFuelPct: number;
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
  };

  // Check-In Return Data
  returnCheckIn?: {
    returnedAt: string;
    receivedBy: string;
    endOdometer: number;
    endFuelPct: number;
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
    
    // Manual Toll Logging (instead of simulated fastag)
    manualTollExpenses: number;
    tollReceiptNotes?: string;
    
    // Penalties (Always with reason, waiver strictly requires reason)
    penalties: PenaltyItem[];
    
    totalDeductions: number;
    netDepositRefund: number;
    depositSettled: boolean;
    settlementDate?: string;
    settlementAdjustmentNotes?: string;
  };
}

export interface PayoutRecord {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerUpiOrBank: string;
  bookingId: string;
  vehiclePlate: string;
  grossAmount: number;
  platformCommission: number;
  netPayout: number;
  status: 'pending' | 'paid';
  createdAt: string;
  paidAt?: string;
  transactionRef?: string;
}

export interface DisputeRecord {
  id: string;
  bookingId: string;
  raisedBy: 'owner' | 'renter' | 'admin';
  reporterId: string;
  reporterName: string;
  title: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved';
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

export interface PlatformSettings {
  commissionRate: number; // e.g. 15%
  gstRate: number; // e.g. 18%
  dailyKmAllowance: number; // e.g. 300 km
  excessKmRate: number; // e.g. ₹15/km
  cancellationFreeHours: number; // e.g. 24 hours
  cancellationPenaltyPct: number; // e.g. 20%
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  category: 'VEHICLE' | 'BOOKING' | 'CHECK_OUT' | 'CHECK_IN' | 'PENALTY' | 'PAYOUT' | 'KYC' | 'DISPUTE';
  action: string;
  summary: string;
  actor: {
    id: string;
    name: string;
    role: 'admin' | 'vehicle_owner' | 'renter' | 'system';
    ip?: string;
  };
  vehiclePlate?: string;
  bookingCode?: string;
  changes?: {
    field: string;
    before?: any;
    after?: any;
  }[];
  severity: 'info' | 'notice' | 'warning' | 'critical';
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  serviceType: string;
  workshopName: string;
  odometer: number;
  cost: number;
  startDate: string;
  completionDate?: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  notes: string;
  rtoFitnessVerified?: boolean;
}

export const INDIAN_LOCATIONS = [
  { city: 'Bengaluru', hubName: 'Kempegowda Int\'l Airport (BLR) Hub', lat: 13.1986, lng: 77.7066 },
  { city: 'Bengaluru', hubName: 'Koramangala 80ft Road Hub', lat: 12.9352, lng: 77.6245 },
  { city: 'Mumbai', hubName: 'Chhatrapati Shivaji Maharaj T2 Hub', lat: 19.0896, lng: 72.8656 },
  { city: 'Mumbai', hubName: 'Bandra-Kurla Complex (BKC) Terminal', lat: 19.0688, lng: 72.8703 },
  { city: 'Delhi NCR', hubName: 'Indira Gandhi Int\'l Airport T3 Hub', lat: 28.5562, lng: 77.1000 },
  { city: 'Delhi NCR', hubName: 'Cyber City DLF Phase 2 Hub, Gurugram', lat: 28.4908, lng: 77.0890 },
  { city: 'Hyderabad', hubName: 'Rajiv Gandhi Int\'l Airport Hub', lat: 17.2403, lng: 78.4294 },
  { city: 'Goa', hubName: 'Manohar Int\'l Airport (MOPA) North Goa', lat: 15.7483, lng: 73.8647 },
  { city: 'Pune', hubName: 'Koregaon Park / Pune Airport Hub', lat: 18.5362, lng: 73.8958 },
];
