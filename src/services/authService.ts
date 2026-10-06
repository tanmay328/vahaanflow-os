import { EmailService } from './emailService';
import { UserProfile, UserRole } from '../types/auth';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut, 
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  collection, 
  getDocs,
  onSnapshot 
} from 'firebase/firestore';

const STORAGE_KEYS = {
  USERS: 'vahaanflow_users_v3',
  CURRENT_USER: 'vahaanflow_current_user_v3',
};

// Initial Seed Users: 1 Platform Admin (Tanmay Rajaura), 2 Vehicle Owners
export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-admin-tanmay',
    name: 'Tanmay Rajaura (Platform Admin)',
    email: 'tanmayrajaura28@gmail.com',
    password: 'admin123',
    phone: '+91 98200 11223',
    role: 'admin',
    activeViewMode: 'admin',
    createdAt: '2026-08-01T00:00:00.000Z',
    renterDetails: {
      drivingLicense: 'DL-0120240088192',
      aadhaarMasked: 'XXXX-XXXX-2828',
      kycStatus: 'verified',
    },
  },
  {
    id: 'usr-owner-01',
    name: 'Suresh Patel (Fleet Owner)',
    email: 'suresh.patel@fleet.in',
    password: 'owner123',
    phone: '+91 98201 44820',
    role: 'vehicle_owner',
    activeViewMode: 'vehicle_owner',
    ownerDetails: {
      upiId: 'suresh.patel@okaxis',
      bankAccount: 'HDFC0001298401928',
      bankIfsc: 'HDFC0000240',
      approvalStatus: 'approved',
      payoutBalance: 42500,
      totalEarned: 184000,
      joinedDate: '2026-08-15',
    },
    renterDetails: {
      drivingLicense: 'GJ-0120180049210',
      aadhaarMasked: 'XXXX-XXXX-7721',
      kycStatus: 'verified',
    },
    createdAt: '2026-08-15T10:00:00.000Z',
  },
  {
    id: 'usr-owner-02',
    name: 'Anita Roy (EV Fleet Owner)',
    email: 'anita.roy@evwheels.in',
    password: 'owner123',
    phone: '+91 98450 11928',
    role: 'vehicle_owner',
    activeViewMode: 'vehicle_owner',
    ownerDetails: {
      upiId: 'anita.roy@icici',
      bankAccount: 'ICIC000491820192',
      bankIfsc: 'ICIC0000104',
      approvalStatus: 'approved',
      payoutBalance: 29800,
      totalEarned: 122000,
      joinedDate: '2026-09-01',
    },
    renterDetails: {
      drivingLicense: 'KA-0520190088192',
      aadhaarMasked: 'XXXX-XXXX-3319',
      kycStatus: 'verified',
    },
    createdAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'usr-owner-03',
    name: 'Rajesh Singhania (Luxury Motors)',
    email: 'rajesh.singhania@luxmotors.in',
    password: 'owner123',
    phone: '+91 98110 33490',
    role: 'vehicle_owner',
    activeViewMode: 'vehicle_owner',
    ownerDetails: {
      upiId: 'rajesh.singhania@icici',
      bankAccount: 'ICIC000992100481',
      bankIfsc: 'ICIC0000011',
      approvalStatus: 'approved',
      payoutBalance: 58000,
      totalEarned: 240000,
      joinedDate: '2026-09-05',
    },
    renterDetails: {
      drivingLicense: 'KA-0120190044192',
      aadhaarMasked: 'XXXX-XXXX-8812',
      kycStatus: 'verified',
    },
    createdAt: '2026-09-05T10:00:00.000Z',
  },
  {
    id: 'usr-owner-04',
    name: 'Kavita Reddy (Deccan EV Fleet)',
    email: 'kavita.reddy@deccanwheels.in',
    password: 'owner123',
    phone: '+91 97000 88210',
    role: 'vehicle_owner',
    activeViewMode: 'vehicle_owner',
    ownerDetails: {
      upiId: 'kavita.reddy@ybl',
      bankAccount: 'HDFC000448100912',
      bankIfsc: 'HDFC0000045',
      approvalStatus: 'approved',
      payoutBalance: 31000,
      totalEarned: 115000,
      joinedDate: '2026-09-12',
    },
    renterDetails: {
      drivingLicense: 'TS-0720200099120',
      aadhaarMasked: 'XXXX-XXXX-5510',
      kycStatus: 'verified',
    },
    createdAt: '2026-09-12T11:30:00.000Z',
  },
  {
    id: 'usr-owner-05',
    name: 'Vikramaditya Chauhan (Rajputana Fleet)',
    email: 'vikramaditya@rajputanafleet.in',
    password: 'owner123',
    phone: '+91 98290 55100',
    role: 'vehicle_owner',
    activeViewMode: 'vehicle_owner',
    ownerDetails: {
      upiId: 'vikramaditya@paytm',
      bankAccount: 'SBIN000110099881',
      bankIfsc: 'SBIN0000312',
      approvalStatus: 'approved',
      payoutBalance: 46000,
      totalEarned: 195000,
      joinedDate: '2026-09-18',
    },
    renterDetails: {
      drivingLicense: 'RJ-1420180022391',
      aadhaarMasked: 'XXXX-XXXX-9901',
      kycStatus: 'verified',
    },
    createdAt: '2026-09-18T09:00:00.000Z',
  },
  {
    id: 'usr-renter-01',
    name: 'Rahul Sharma (Customer)',
    email: 'rahul.sharma@gmail.com',
    password: 'customer123',
    phone: '+91 99887 76655',
    role: 'renter',
    activeViewMode: 'renter',
    renterDetails: {
      drivingLicense: 'DL-0420200055123',
      aadhaarMasked: 'XXXX-XXXX-9921',
      kycStatus: 'verified',
    },
    createdAt: '2026-09-10T10:00:00.000Z',
  },
];

export class AuthService {
  // Sync users in real-time from Cloud Firestore and automatically deduplicate identical emails
  static initFirestoreUsersSync(onUsersUpdate?: (users: UserProfile[]) => void): () => void {
    try {
      const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        if (!snapshot.empty) {
          const seenEmails = new Set<string>();
          const remoteUsers: UserProfile[] = [];

          snapshot.forEach((d) => {
            const userData = d.data() as UserProfile;
            const normalizedEmail = (userData.email || '').trim().toLowerCase();

            if (normalizedEmail === 'admin@vahaanflow.in') {
              // Delete old admin account
              deleteDoc(doc(db, 'users', d.id)).catch(console.warn);
              return;
            }

            if (normalizedEmail === 'tanmayrajaura28@gmail.com') {
              userData.role = 'admin';
              userData.name = 'Tanmay Rajaura (Platform Admin)';
              userData.activeViewMode = 'admin';
            }

            if (normalizedEmail && seenEmails.has(normalizedEmail)) {
              // Found duplicate account/customer with identical email - delete duplicate document from Firestore
              deleteDoc(doc(db, 'users', d.id)).catch(console.warn);
            } else {
              if (normalizedEmail) {
                seenEmails.add(normalizedEmail);
              }
              remoteUsers.push(userData);
            }
          });

          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(remoteUsers));
          if (onUsersUpdate) onUsersUpdate(remoteUsers);
        } else {
          // Seed initial Admin and Owners into Firestore
          INITIAL_USERS.forEach((u) => {
            setDoc(doc(db, 'users', u.id), u).catch(console.warn);
          });
        }
      }, (err) => {
        console.warn('Firestore users collection snapshot listener:', err);
      });
      return unsub;
    } catch (e) {
      console.warn('Failed initializing users snapshot:', e);
      return () => {};
    }
  }

  static getUsers(): UserProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      let parsed: UserProfile[] = data ? JSON.parse(data) : [...INITIAL_USERS];

      // Remove old admin Vikram Shinde (admin@vahaanflow.in)
      parsed = parsed.filter(u => u.email.toLowerCase() !== 'admin@vahaanflow.in');

      let tanmayAdmin = parsed.find(u => u.email.toLowerCase() === 'tanmayrajaura28@gmail.com');
      if (tanmayAdmin) {
        tanmayAdmin.role = 'admin';
        tanmayAdmin.name = 'Tanmay Rajaura (Platform Admin)';
        tanmayAdmin.activeViewMode = 'admin';
      } else {
        parsed.unshift({
          id: 'usr-admin-tanmay',
          name: 'Tanmay Rajaura (Platform Admin)',
          email: 'tanmayrajaura28@gmail.com',
          password: 'admin123',
          phone: '+91 98200 11223',
          role: 'admin',
          activeViewMode: 'admin',
          createdAt: '2026-08-01T00:00:00.000Z',
          renterDetails: {
            drivingLicense: 'DL-0120240088192',
            aadhaarMasked: 'XXXX-XXXX-2828',
            kycStatus: 'verified',
          },
        });
      }

      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(parsed));
      return parsed;
    } catch {
      return INITIAL_USERS;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    const users = this.getUsers().filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    const cur = this.getCurrentUser();
    if (cur?.id === userId) {
      this.setCurrentUser(null);
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.warn('Firestore delete user error:', err);
    }
  }

  static getCurrentUser(): UserProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  static setCurrentUser(user: UserProfile | null): void {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  static saveUserToLocal(user: UserProfile): void {
    const list = this.getUsers();
    const idx = list.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
  }

  static async syncUserProfileToFirestore(user: UserProfile): Promise<void> {
    try {
      await setDoc(doc(db, 'users', user.id), user, { merge: true });
    } catch (err) {
      console.warn('Could not sync user profile to Firestore:', err);
    }
  }

  // Login: Links Firebase Auth with Firestore users/{uid}
  static async login(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check local / seeded users
    const allUsers = this.getUsers();
    let userDoc = allUsers.find(u => u.email.toLowerCase() === cleanEmail);

    // 2. Query Firestore collection 'users' if not found locally
    if (!userDoc) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        snap.forEach((d) => {
          const u = d.data() as UserProfile;
          if (u.email && u.email.toLowerCase() === cleanEmail) {
            userDoc = u;
          }
        });
      } catch (err) {
        console.warn('Firestore user lookup error:', err);
      }
    }

    if (!userDoc) {
      return { 
        success: false, 
        error: 'Email does not exist. Please create an account.' 
      };
    }

    // CRITICAL: Block suspended users immediately BEFORE Firebase Auth sign-in or password check
    const isSuspended = userDoc.approvalStatus === 'suspended' || userDoc.ownerDetails?.approvalStatus === 'suspended';
    if (isSuspended) {
      const reason = userDoc.suspensionReason || 'Account suspended by platform administrator.';
      return {
        success: false,
        error: `Your account has been suspended by the admin. Reason: ${reason}. Please contact support to restore access.`
      };
    }

    if (userDoc.password && userDoc.password !== password) {
      return { 
        success: false, 
        error: 'Incorrect password. Click "Forgot Password?" to reset your credentials.' 
      };
    }

    // 3. Attempt Firebase Authentication (keeps Firebase Auth as authoritative source)
    let fbUser: FirebaseUser | null = null;
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      fbUser = cred.user;
    } catch (fbErr: any) {
      // If user not in Firebase Auth yet, try creating it
      if (userDoc && (userDoc.password === password || !userDoc.password)) {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          fbUser = newCred.user;
        } catch {
          // Dev / offline fallback nominal
        }
      }
    }

    // Keep auth.uid linked
    if (fbUser && userDoc.id !== fbUser.uid) {
      userDoc.id = fbUser.uid;
    }

    this.setCurrentUser(userDoc);
    await this.syncUserProfileToFirestore(userDoc);
    return { success: true, user: userDoc };
  }

  // Register: Links Firebase Auth and creates users/{uid}
  static async register(data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: 'vehicle_owner' | 'renter';
    upiId?: string;
    bankAccount?: string;
    drivingLicense?: string;
    aadhaarMasked?: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = data.email.trim().toLowerCase();
    const users = this.getUsers();

    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Email already exists. Please login.' };
    }

    // Check if user already exists in Firestore users collection
    try {
      const snap = await getDocs(collection(db, 'users'));
      let emailExists = false;
      snap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (u.email && u.email.toLowerCase() === cleanEmail) {
          emailExists = true;
        }
      });
      if (emailExists) {
        return { success: false, error: 'Email already exists. Please login.' };
      }
    } catch (e) {
      // Nominal
    }

    let uid = `usr-${Date.now()}`;

    // Link with Firebase Auth
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
      uid = cred.user.uid;
    } catch (fbErr: any) {
      if (fbErr.code === 'auth/email-already-in-use') {
        return { success: false, error: 'Email already exists. Please login.' };
      }
      console.info('Firebase Auth sign-up notice:', fbErr.message);
    }

    // Public self-registration supports: 'vehicle_owner' or 'renter' (Admin is closed to public signup)
    const assignedRole: UserRole = data.role === 'renter' ? 'renter' : 'vehicle_owner';

    const newUser: UserProfile = {
      id: uid,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password,
      phone: data.phone.trim(),
      role: assignedRole,
      activeViewMode: assignedRole,
      createdAt: new Date().toISOString(),
      ownerDetails: assignedRole === 'vehicle_owner' ? {
        upiId: data.upiId || `${cleanEmail.split('@')[0]}@okaxis`,
        bankAccount: data.bankAccount || '',
        approvalStatus: 'approved',
        payoutBalance: 0,
        totalEarned: 0,
        joinedDate: new Date().toISOString().split('T')[0],
      } : undefined,
      renterDetails: {
        drivingLicense: data.drivingLicense?.trim() || `DL-${Math.floor(100000000000000 + Math.random() * 900000000000000)}`,
        aadhaarMasked: data.aadhaarMasked?.trim() || `XXXX-XXXX-${Math.floor(1000 + Math.random() * 9000)}`,
        kycStatus: 'verified',
      },
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.setCurrentUser(newUser);

    // Save directly to Firestore users collection linked by uid
    await this.syncUserProfileToFirestore(newUser);

    // Send Welcome Email via Nodemailer (from vahaanflowos)
    EmailService.sendWelcomeEmail({
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phone: newUser.phone,
      upiId: newUser.ownerDetails?.upiId,
      drivingLicense: newUser.renterDetails?.drivingLicense,
    }).catch(err => console.warn('Welcome email dispatch error:', err));

    return { success: true, user: newUser };
  }

  // 1. Send Password Reset Link to Email (User must reset via link only)
  static async requestPasswordResetLink(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    let userExists = !!users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!userExists) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        snap.forEach((d) => {
          const u = d.data() as UserProfile;
          if (u.email && u.email.toLowerCase() === cleanEmail) {
            userExists = true;
          }
        });
      } catch (err) {
        console.warn('User lookup check:', err);
      }
    }

    if (!userExists) {
      return {
        success: false,
        message: `No registered account found with email "${cleanEmail}". Please verify your email or create a new account.`,
      };
    }

    // Send secure reset link via Nodemailer (vahaanflowos)
    const result = await EmailService.sendPasswordResetLink(cleanEmail);
    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Could not send reset email. Please try again.',
      };
    }

    return {
      success: true,
      message: `Password reset link has been dispatched to ${cleanEmail}. Please check your inbox (and spam folder) and open the secure link to set your new customized password.`,
    };
  }

  // 2. Complete Password Reset using Secure Token from Email Link
  static async completePasswordResetFromLink(
    token: string, 
    email: string, 
    newCustomPassword: string
  ): Promise<{ success: boolean; message: string; user?: UserProfile }> {
    const cleanEmail = email.trim().toLowerCase();

    // Verify token with backend
    const verification = await EmailService.verifyResetToken(token, cleanEmail);
    if (!verification.valid) {
      return {
        success: false,
        message: verification.error || 'Invalid or expired password reset link. Please request a new link.',
      };
    }

    // Update password in Firestore & local cache
    const users = this.getUsers();
    let target = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!target) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        snap.forEach((d) => {
          const u = d.data() as UserProfile;
          if (u.email && u.email.toLowerCase() === cleanEmail) {
            target = u;
          }
        });
      } catch (err) {
        console.warn('Firestore user lookup error:', err);
      }
    }

    if (!target) {
      return {
        success: false,
        message: `Account not found for ${cleanEmail}.`,
      };
    }

    // Update password
    target.password = newCustomPassword;
    const existingIndex = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (existingIndex >= 0) {
      users[existingIndex] = target;
    } else {
      users.push(target);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    await this.syncUserProfileToFirestore(target);

    // Invalidate token so it cannot be reused
    await EmailService.invalidateResetToken(token);

    // Send confirmation email
    await EmailService.sendPasswordUpdatedConfirmation(cleanEmail, target.name).catch(console.warn);

    return {
      success: true,
      message: `Your password has been successfully updated with your new customized password!`,
      user: target,
    };
  }

  // Toggle View Mode: Admin or Owner can use the app as a normal customer / renter
  static toggleViewMode(current: UserProfile, targetMode: 'admin' | 'vehicle_owner' | 'renter'): UserProfile {
    const updated: UserProfile = {
      ...current,
      activeViewMode: targetMode,
    };
    this.setCurrentUser(updated);
    this.syncUserProfileToFirestore(updated).catch(console.warn);
    return updated;
  }

  static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch {}
    this.setCurrentUser(null);
  }

  static switchUser(userId: string): UserProfile | null {
    const users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (target) {
      this.setCurrentUser(target);
      return target;
    }
    return null;
  }
}
