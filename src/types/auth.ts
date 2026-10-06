export type UserRole = 'admin' | 'vehicle_owner' | 'renter';

export interface UserProfile {
  id: string; // Linked to Firebase Auth uid
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: 'admin' | 'vehicle_owner' | 'renter';
  activeViewMode?: 'admin' | 'vehicle_owner' | 'renter'; // Can use app as customer
  
  approvalStatus?: 'approved' | 'pending' | 'suspended';
  suspensionReason?: string;
  suspendedAt?: string;
  
  // Owner specific properties (if role === 'vehicle_owner')
  ownerDetails?: {
    upiId?: string;
    bankAccount?: string;
    bankIfsc?: string;
    approvalStatus: 'approved' | 'pending' | 'suspended';
    payoutBalance: number;
    totalEarned: number;
    joinedDate: string;
  };

  // Renter KYC details (when using as customer / booking vehicles)
  renterDetails?: {
    drivingLicense: string;
    aadhaarMasked: string;
    panNumber?: string;
    kycStatus: 'verified' | 'pending' | 'rejected' | 'blacklisted';
    kycRejectionReason?: string;
    blacklistReason?: string;
  };

  createdAt: string;
}

export interface AuthState {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
}
