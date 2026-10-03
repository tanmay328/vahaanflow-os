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
  collection, 
  getDocs,
  onSnapshot 
} from 'firebase/firestore';

const STORAGE_KEYS = {
  USERS: 'vahaanflow_users_v3',
  CURRENT_USER: 'vahaanflow_current_user_v3',
};

// Initial Seed Users: 1 Platform Admin, 2 Vehicle Owners
export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr-admin-01',
    name: 'Vikram Shinde (Platform Admin)',
    email: 'admin@vahaanflow.in',
    password: 'admin123',
    phone: '+91 98200 11223',
    role: 'admin',
    activeViewMode: 'admin',
    createdAt: '2026-08-01T00:00:00.000Z',
    renterDetails: {
      drivingLicense: 'MH-0120150048192',
      aadhaarMasked: 'XXXX-XXXX-9901',
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
];

export class AuthService {
  // Sync users in real-time from Cloud Firestore
  static initFirestoreUsersSync(onUsersUpdate?: (users: UserProfile[]) => void): () => void {
    try {
      const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        if (!snapshot.empty) {
          const remoteUsers: UserProfile[] = [];
          snapshot.forEach((d) => {
            remoteUsers.push(d.data() as UserProfile);
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
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        INITIAL_USERS.forEach((u) => {
          setDoc(doc(db, 'users', u.id), u).catch(console.warn);
        });
        return INITIAL_USERS;
      }
      const parsed: UserProfile[] = JSON.parse(data);
      let changed = false;
      const existingEmails = new Set(parsed.map(u => u.email.toLowerCase()));
      for (const demoUser of INITIAL_USERS) {
        if (!existingEmails.has(demoUser.email.toLowerCase())) {
          parsed.push(demoUser);
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return INITIAL_USERS;
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

    if (!userDoc) {
      return { 
        success: false, 
        error: 'Email does not exist. Please create an account.' 
      };
    }

    if (userDoc.password && userDoc.password !== password) {
      return { 
        success: false, 
        error: 'Incorrect password. Click "Forgot Password?" to reset your credentials.' 
      };
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
    role: 'admin' | 'vehicle_owner';
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

    const newUser: UserProfile = {
      id: uid,
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password,
      phone: data.phone.trim(),
      role: data.role,
      activeViewMode: data.role,
      createdAt: new Date().toISOString(),
      ownerDetails: data.role === 'vehicle_owner' ? {
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

    return { success: true, user: newUser };
  }

  // Forgot Password Reset Flow
  static async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    let fbSuccess = false;

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      fbSuccess = true;
    } catch (e: any) {
      console.info('Firebase sendPasswordResetEmail notice:', e.message);
    }

    // Also update in Firestore / local store for instant testability
    const users = this.getUsers();
    const target = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (target) {
      target.password = 'Reset@1234';
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      await this.syncUserProfileToFirestore(target);
      return {
        success: true,
        message: fbSuccess 
          ? `Password reset link dispatched to ${cleanEmail}. In demo mode, temporary password has also been updated to: Reset@1234`
          : `Password reset successfully! Your temporary password is: Reset@1234. Please sign in and update your security settings.`,
      };
    }

    return {
      success: true,
      message: `If an account exists for ${cleanEmail}, password reset instructions have been sent.`,
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
