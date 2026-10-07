import { EmailService } from './emailService';
import { UserProfile, UserRole } from '../types/auth';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  collection, 
  onSnapshot 
} from 'firebase/firestore';

function cleanForFirestore<T>(obj: T): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanForFirestore(item));
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        cleaned[k] = cleanForFirestore(v);
      }
    }
    return cleaned;
  }
  return obj;
}

export class AuthService {
  // Listen to Firebase Auth state & user profile in real-time
  static initAuthListener(onAuthUpdate: (user: UserProfile | null, suspensionError?: string) => void): () => void {
    let profileUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, async (fbUser) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (!fbUser) {
        onAuthUpdate(null);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        
        // Listen to profile updates (e.g. real-time suspension by admin)
        profileUnsub = onSnapshot(userDocRef, (snap) => {
          if (!snap.exists()) {
            onAuthUpdate(null);
            return;
          }

          const profile = snap.data() as UserProfile;
          profile.id = snap.id;

          // Check if suspended
          const isSuspended = profile.approvalStatus === 'suspended' || profile.ownerDetails?.approvalStatus === 'suspended';
          if (isSuspended) {
            const reason = profile.suspensionReason || 'Account suspended by platform administrator.';
            signOut(auth).catch(() => {});
            onAuthUpdate(null, `Your account has been suspended by the admin. Reason: ${reason}. Please contact support to restore access.`);
            return;
          }

          onAuthUpdate(profile);
        }, (err) => {
          console.warn('Profile listener error:', err);
        });

      } catch (err) {
        console.warn('Auth listener error:', err);
        onAuthUpdate(null);
      }
    });

    return () => {
      if (profileUnsub) profileUnsub();
      authUnsub();
    };
  }

  // Admin-only: Subscribe to all user profiles
  static initAdminUsersSync(onUsersUpdate: (users: UserProfile[]) => void): () => void {
    try {
      const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        const remoteUsers: UserProfile[] = [];
        snapshot.forEach((d) => {
          const u = d.data() as UserProfile;
          u.id = d.id;
          remoteUsers.push(u);
        });
        onUsersUpdate(remoteUsers);
      }, (err) => {
        console.warn('Admin users snapshot listener notice:', err);
      });
      return unsub;
    } catch (e) {
      console.warn('Failed initializing admin users snapshot:', e);
      return () => {};
    }
  }

  // Login: Uses Firebase Auth only
  static async login(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const userSnap = await getDoc(doc(db, 'users', cred.user.uid));

      if (!userSnap.exists()) {
        return {
          success: false,
          error: 'User profile document not found. Please contact support.',
        };
      }

      const userProfile = userSnap.data() as UserProfile;
      userProfile.id = userSnap.id;

      // Check suspension immediately
      const isSuspended = userProfile.approvalStatus === 'suspended' || userProfile.ownerDetails?.approvalStatus === 'suspended';
      if (isSuspended) {
        await signOut(auth);
        const reason = userProfile.suspensionReason || 'Account suspended by platform administrator.';
        return {
          success: false,
          error: `Your account has been suspended by the admin. Reason: ${reason}. Please contact support to restore access.`,
        };
      }

      // Dispatch sign-in alert email
      EmailService.sendLoginNotification({
        userName: userProfile.name,
        role: userProfile.role,
      }).catch(err => console.warn('Login notification email dispatch notice:', err));

      return { success: true, user: userProfile };
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        return {
          success: false,
          error: 'Invalid email or password. If you do not have a Firebase password yet, please use "Forgot Password?" below to set one.',
        };
      }
      if (code === 'auth/too-many-requests') {
        return {
          success: false,
          error: 'Access temporarily disabled due to multiple failed login attempts. Please try again later or reset your password.',
        };
      }
      if (code === 'auth/api-key-not-valid' || err.message?.includes('api-key-not-valid')) {
        return {
          success: false,
          error: 'Firebase Web API Key is missing or invalid. Please update "firebase-applet-config.json" with your Firebase project API Key from Firebase Console (Project Settings > Web App).',
        };
      }
      return {
        success: false,
        error: err.message || 'Login failed. Please check your credentials.',
      };
    }
  }

  // Google Sign-In & Sign-Up via Firebase Auth
  static async loginWithGoogle(
    targetRole: 'vehicle_owner' | 'renter' = 'renter',
    extraData?: {
      phone?: string;
      upiId?: string;
      drivingLicense?: string;
    }
  ): Promise<{ success: boolean; user?: UserProfile; isNewUser?: boolean; error?: string }> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const fbUser = cred.user;
      const uid = fbUser.uid;
      const email = (fbUser.email || '').trim().toLowerCase();
      const name = fbUser.displayName?.trim() || email.split('@')[0] || 'Google User';
      const phone = extraData?.phone && extraData.phone.trim() !== '+91' ? extraData.phone.trim() : (fbUser.phoneNumber || '+91 ');

      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userProfile = userSnap.data() as UserProfile;
        userProfile.id = userSnap.id;

        // Check suspension immediately
        const isSuspended = userProfile.approvalStatus === 'suspended' || userProfile.ownerDetails?.approvalStatus === 'suspended';
        if (isSuspended) {
          await signOut(auth);
          const reason = userProfile.suspensionReason || 'Account suspended by platform administrator.';
          return {
            success: false,
            error: `Your account has been suspended by the admin. Reason: ${reason}. Please contact support to restore access.`,
          };
        }

        // Dispatch sign-in alert email for existing user
        EmailService.sendLoginNotification({
          userName: userProfile.name,
          role: userProfile.role,
        }).catch(err => console.warn('Google login notification email dispatch notice:', err));

        return { success: true, user: userProfile, isNewUser: false };
      }

      // Brand New User: Create User Profile in Firestore
      const isAdminEmail = email.toLowerCase() === 'tanmayrajaura28@gmail.com';
      const assignedRole: UserRole = isAdminEmail ? 'admin' : (targetRole === 'vehicle_owner' ? 'vehicle_owner' : 'renter');
      const newUser: UserProfile = {
        id: uid,
        name: isAdminEmail ? 'Tanmay Rajaura (Platform Admin)' : name,
        email,
        phone,
        role: assignedRole,
        activeViewMode: assignedRole,
        approvalStatus: 'approved',
        createdAt: new Date().toISOString(),
        ownerDetails: assignedRole === 'vehicle_owner' ? {
          upiId: extraData?.upiId || `${email.split('@')[0]}@okaxis`,
          bankAccount: '',
          bankIfsc: '',
          approvalStatus: 'approved',
          payoutBalance: 0,
          totalEarned: 0,
          joinedDate: new Date().toISOString().split('T')[0],
        } : undefined,
        renterDetails: {
          drivingLicense: extraData?.drivingLicense?.trim() || `DL-${Math.floor(100000000000000 + Math.random() * 900000000000000)}`,
          aadhaarMasked: `XXXX-XXXX-${Math.floor(1000 + Math.random() * 9000)}`,
          kycStatus: 'verified',
        },
      };

      await setDoc(userDocRef, cleanForFirestore(newUser));

      // Dispatch Welcome Email
      EmailService.sendWelcomeEmail({
        name: newUser.name,
        role: newUser.role,
        phone: newUser.phone,
        upiId: newUser.ownerDetails?.upiId,
        drivingLicense: newUser.renterDetails?.drivingLicense,
      }).catch(err => console.warn('Welcome email dispatch notice:', err));

      return { success: true, user: newUser, isNewUser: true };
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Google sign-in popup was closed before completing.' };
      }
      if (err.code === 'auth/cancelled-popup-request') {
        return { success: false, error: 'Sign-in request was cancelled.' };
      }
      if (err.code === 'auth/popup-blocked') {
        return { success: false, error: 'The Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.' };
      }
      if (err.code === 'auth/api-key-not-valid' || err.message?.includes('api-key-not-valid')) {
        return {
          success: false,
          error: 'Firebase Web API Key is missing or invalid. Please update "firebase-applet-config.json" with your Firebase project API Key from Firebase Console (Project Settings > Web App).',
        };
      }
      return {
        success: false,
        error: err.message || 'Google sign-in failed. Please try again.',
      };
    }
  }

  // Register: Creates Firebase Auth user and users/{uid} document
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

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
      const uid = cred.user.uid;

      // Public self-registration only allows 'vehicle_owner' or 'renter' (never 'admin')
      const assignedRole: UserRole = data.role === 'vehicle_owner' ? 'vehicle_owner' : 'renter';

      const newUser: UserProfile = {
        id: uid,
        name: data.name.trim(),
        email: cleanEmail,
        phone: data.phone.trim(),
        role: assignedRole,
        activeViewMode: assignedRole,
        approvalStatus: 'approved',
        createdAt: new Date().toISOString(),
        ownerDetails: assignedRole === 'vehicle_owner' ? {
          upiId: data.upiId || `${cleanEmail.split('@')[0]}@okaxis`,
          bankAccount: data.bankAccount || '',
          bankIfsc: '',
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

      await setDoc(doc(db, 'users', uid), cleanForFirestore(newUser));

      // Send Welcome Email
      EmailService.sendWelcomeEmail({
        name: newUser.name,
        role: newUser.role,
        phone: newUser.phone,
        upiId: newUser.ownerDetails?.upiId,
        drivingLicense: newUser.renterDetails?.drivingLicense,
      }).catch(err => console.warn('Welcome email dispatch notice:', err));

      return { success: true, user: newUser };
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        return { success: false, error: 'An account with this email already exists. Please sign in.' };
      }
      if (err.code === 'auth/weak-password') {
        return { success: false, error: 'Password should be at least 6 characters.' };
      }
      if (err.code === 'auth/api-key-not-valid' || err.message?.includes('api-key-not-valid')) {
        return {
          success: false,
          error: 'Firebase Web API Key is missing or invalid. Please update "firebase-applet-config.json" with your Firebase project API Key from Firebase Console (Project Settings > Web App).',
        };
      }
      return { success: false, error: err.message || 'Could not create account.' };
    }
  }

  // Request Password Reset via Firebase Auth
  static async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return {
        success: true,
        message: `A password reset link from Firebase has been dispatched to ${cleanEmail}. Please check your inbox (and spam folder) to set your password.`,
      };
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        return {
          success: false,
          message: `No registered account found with email "${cleanEmail}".`,
        };
      }
      return {
        success: false,
        message: err.message || 'Failed to send password reset email. Please try again.',
      };
    }
  }

  static async syncUserProfileToFirestore(user: UserProfile): Promise<void> {
    try {
      await setDoc(doc(db, 'users', user.id), cleanForFirestore(user), { merge: true });
    } catch (err) {
      console.warn('Could not sync user profile to Firestore:', err);
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      console.warn('Firestore delete user error:', err);
    }
  }

  static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  }
}
