import { 
  Vehicle, 
  Booking, 
  AuditRecord, 
  MaintenanceLog, 
  PayoutRecord, 
  DisputeRecord, 
  PlatformSettings
} from '../types/rental';
import { DEFAULT_PLATFORM_SETTINGS } from '../data/mockData';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  getDocs
} from 'firebase/firestore';

const STORAGE_KEYS = {
  VEHICLES: 'vahaanflow_vehicles_v3',
  BOOKINGS: 'vahaanflow_bookings_v3',
  AUDIT: 'vahaanflow_audit_v3',
  MAINTENANCE: 'vahaanflow_maint_v3',
  PAYOUTS: 'vahaanflow_payouts_v3',
  DISPUTES: 'vahaanflow_disputes_v3',
  SETTINGS: 'vahaanflow_settings_v3',
};

// Strips undefined fields which cause Firestore setDoc to throw errors
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

export class RentalStorageService {
  // Sync platform settings in real-time
  static initSettingsSync(onSettingsUpdate: (settings: PlatformSettings) => void): () => void {
    try {
      const docRef = doc(db, 'settings', 'platform_config');
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as PlatformSettings;
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
          onSettingsUpdate(data);
        } else {
          onSettingsUpdate(DEFAULT_PLATFORM_SETTINGS);
        }
      }, (err) => {
        console.warn('Settings snapshot notice:', err);
      });
      return unsub;
    } catch (e) {
      console.warn('Settings sync error:', e);
      return () => {};
    }
  }

  // Role-aware sync matching Firestore Security Rules
  static initFirestoreSync(
    role: 'admin' | 'vehicle_owner' | 'renter',
    uid: string,
    callbacks: {
      onVehicles: (v: Vehicle[]) => void;
      onBookings: (b: Booking[]) => void;
      onAuditLogs?: (a: AuditRecord[]) => void;
      onMaintenance?: (m: MaintenanceLog[]) => void;
      onPayouts?: (p: PayoutRecord[]) => void;
      onDisputes?: (d: DisputeRecord[]) => void;
    }
  ): () => void {
    const unsubs: (() => void)[] = [];

    try {
      // 1. Vehicles
      let vehQuery;
      if (role === 'admin') {
        vehQuery = collection(db, 'vehicles');
      } else if (role === 'vehicle_owner') {
        vehQuery = query(collection(db, 'vehicles'), where('ownerId', '==', uid));
      } else {
        vehQuery = query(collection(db, 'vehicles'), where('approvalStatus', '==', 'approved'));
      }

      unsubs.push(
        onSnapshot(vehQuery, (snap) => {
          const list: Vehicle[] = [];
          snap.forEach((d) => {
            const v = d.data() as Vehicle;
            v.id = d.id;
            if (!v.status) v.status = 'available';
            if (!v.approvalStatus) v.approvalStatus = 'approved';
            if (v.image && v.image.startsWith('/src/assets/images/')) {
              v.image = v.image.replace('/src/assets/images/', '/images/');
            }
            list.push(v);
          });
          localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(list));
          callbacks.onVehicles(list);
        }, err => console.warn('Vehicles snapshot notice:', err))
      );

      // 2. Bookings
      let bookingsQuery;
      if (role === 'admin') {
        bookingsQuery = collection(db, 'bookings');
      } else if (role === 'vehicle_owner') {
        bookingsQuery = query(collection(db, 'bookings'), where('ownerId', '==', uid));
      } else {
        bookingsQuery = query(collection(db, 'bookings'), where('customerId', '==', uid));
      }

      unsubs.push(
        onSnapshot(bookingsQuery, (snap) => {
          const list: Booking[] = [];
          snap.forEach((d) => {
            const b = d.data() as Booking;
            b.id = d.id;
            list.push(b);
          });
          localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));
          callbacks.onBookings(list);
        }, err => console.warn('Bookings snapshot notice:', err))
      );

      // 3. Audit Logs (Admin only)
      if (role === 'admin' && callbacks.onAuditLogs) {
        unsubs.push(
          onSnapshot(collection(db, 'auditLogs'), (snap) => {
            const list: AuditRecord[] = [];
            snap.forEach((d) => {
              const a = d.data() as AuditRecord;
              a.id = d.id;
              list.push(a);
            });
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(list));
            callbacks.onAuditLogs?.(list);
          }, err => console.warn('Audit snapshot notice:', err))
        );
      }

      // 4. Maintenance (Admin only)
      if (role === 'admin' && callbacks.onMaintenance) {
        unsubs.push(
          onSnapshot(collection(db, 'maintenance'), (snap) => {
            const list: MaintenanceLog[] = [];
            snap.forEach((d) => {
              const m = d.data() as MaintenanceLog;
              m.id = d.id;
              list.push(m);
            });
            localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(list));
            callbacks.onMaintenance?.(list);
          }, err => console.warn('Maintenance snapshot notice:', err))
        );
      }

      // 5. Payouts (Admin reads all, Owner reads own)
      if (callbacks.onPayouts) {
        let payoutsQuery = null;
        if (role === 'admin') {
          payoutsQuery = collection(db, 'payouts');
        } else if (role === 'vehicle_owner') {
          payoutsQuery = query(collection(db, 'payouts'), where('ownerId', '==', uid));
        }

        if (payoutsQuery) {
          unsubs.push(
            onSnapshot(payoutsQuery, (snap) => {
              const list: PayoutRecord[] = [];
              snap.forEach((d) => {
                const p = d.data() as PayoutRecord;
                p.id = d.id;
                list.push(p);
              });
              localStorage.setItem(STORAGE_KEYS.PAYOUTS, JSON.stringify(list));
              callbacks.onPayouts?.(list);
            }, err => console.warn('Payouts snapshot notice:', err))
          );
        }
      }

      // 6. Disputes (Admin reads all, others read own)
      if (callbacks.onDisputes) {
        let disputesQuery;
        if (role === 'admin') {
          disputesQuery = collection(db, 'disputes');
        } else {
          disputesQuery = query(collection(db, 'disputes'), where('reporterId', '==', uid));
        }

        unsubs.push(
          onSnapshot(disputesQuery, (snap) => {
            const list: DisputeRecord[] = [];
            snap.forEach((d) => {
              const disp = d.data() as DisputeRecord;
              disp.id = d.id;
              list.push(disp);
            });
            localStorage.setItem(STORAGE_KEYS.DISPUTES, JSON.stringify(list));
            callbacks.onDisputes?.(list);
          }, err => console.warn('Disputes snapshot notice:', err))
        );
      }

    } catch (e) {
      console.warn('Firestore subscription initialization error:', e);
    }

    return () => {
      unsubs.forEach(u => u());
    };
  }

  // --- VEHICLES ---
  static getVehicles(): Vehicle[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VEHICLES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveVehicle(vehicle: Vehicle): Promise<void> {
    const list = this.getVehicles();
    const idx = list.findIndex(v => v.id === vehicle.id);
    if (idx >= 0) {
      list[idx] = vehicle;
    } else {
      list.push(vehicle);
    }
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(list));
    try {
      await setDoc(doc(db, 'vehicles', vehicle.id), cleanForFirestore(vehicle), { merge: true });
    } catch (e) {
      console.warn('Vehicle Firestore save error:', e);
      throw e;
    }
  }

  static async deleteVehicle(id: string): Promise<void> {
    const list = this.getVehicles().filter(v => v.id !== id);
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(list));
    try {
      await deleteDoc(doc(db, 'vehicles', id));
    } catch (e) {
      console.warn('Vehicle Firestore delete error:', e);
      throw e;
    }
  }

  // Admin action: update owner suspension state on vehicles
  static async setOwnerVehiclesSuspended(ownerId: string, suspended: boolean): Promise<void> {
    try {
      const q = query(collection(db, 'vehicles'), where('ownerId', '==', ownerId));
      const snap = await getDocs(q);
      const promises: Promise<void>[] = [];
      snap.forEach((d) => {
        promises.push(setDoc(doc(db, 'vehicles', d.id), { ownerSuspended: suspended }, { merge: true }));
      });
      await Promise.all(promises);
    } catch (err) {
      console.warn('Error updating ownerSuspended on vehicles:', err);
    }
  }

  // --- BOOKINGS ---
  static getBookings(): Booking[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveBooking(booking: Booking): Promise<void> {
    const list = this.getBookings();
    const idx = list.findIndex(b => b.id === booking.id);
    if (idx >= 0) {
      list[idx] = booking;
    } else {
      list.unshift(booking);
    }
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));
    try {
      await setDoc(doc(db, 'bookings', booking.id), cleanForFirestore(booking), { merge: true });
    } catch (e) {
      console.warn('Booking Firestore save error:', e);
      throw e;
    }
  }

  // --- AUDIT LOGS (Immutable, actorId = uid) ---
  static getAuditLogs(): AuditRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async logAudit(record: Omit<AuditRecord, 'id' | 'timestamp'>): Promise<AuditRecord> {
    const currentUid = auth.currentUser?.uid || record.actor.id;
    const newRecord: AuditRecord = {
      ...record,
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actor: {
        ...record.actor,
        id: currentUid,
      },
    };

    const list = this.getAuditLogs();
    list.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(list));

    try {
      await setDoc(doc(db, 'auditLogs', newRecord.id), cleanForFirestore(newRecord));
    } catch (e) {
      console.warn('Audit log write notice:', e);
    }
    return newRecord;
  }

  static async clearAuditLogsOlderThan(days: number): Promise<number> {
    const logs = this.getAuditLogs();
    const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
    const logsToKeep: AuditRecord[] = [];
    const logsToRemove: AuditRecord[] = [];

    logs.forEach(l => {
      const logTime = new Date(l.timestamp).getTime();
      if (!isNaN(logTime) && logTime < cutoffMs) {
        logsToRemove.push(l);
      } else {
        logsToKeep.push(l);
      }
    });

    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(logsToKeep));

    for (const l of logsToRemove) {
      try {
        await deleteDoc(doc(db, 'auditLogs', l.id));
      } catch (e) {
        console.warn(`Failed to delete audit log ${l.id} from Firestore:`, e);
      }
    }

    return logsToRemove.length;
  }

  static async clearAllAuditLogs(): Promise<number> {
    const logs = this.getAuditLogs();
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify([]));
    for (const l of logs) {
      try {
        await deleteDoc(doc(db, 'auditLogs', l.id));
      } catch (e) {
        console.warn(`Failed to delete audit log ${l.id} from Firestore:`, e);
      }
    }
    return logs.length;
  }

  // --- PAYOUTS ---
  static getPayouts(): PayoutRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAYOUTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async savePayout(payout: PayoutRecord): Promise<void> {
    const list = this.getPayouts();
    const idx = list.findIndex(p => p.id === payout.id);
    if (idx >= 0) {
      list[idx] = payout;
    } else {
      list.unshift(payout);
    }
    localStorage.setItem(STORAGE_KEYS.PAYOUTS, JSON.stringify(list));
    try {
      await setDoc(doc(db, 'payouts', payout.id), cleanForFirestore(payout), { merge: true });
    } catch (e) {
      console.warn('Payout Firestore save error:', e);
      throw e;
    }
  }

  // --- DISPUTES ---
  static getDisputes(): DisputeRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DISPUTES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveDispute(dispute: DisputeRecord): Promise<void> {
    const list = this.getDisputes();
    const idx = list.findIndex(d => d.id === dispute.id);
    if (idx >= 0) {
      list[idx] = dispute;
    } else {
      list.unshift(dispute);
    }
    localStorage.setItem(STORAGE_KEYS.DISPUTES, JSON.stringify(list));
    try {
      await setDoc(doc(db, 'disputes', dispute.id), cleanForFirestore(dispute), { merge: true });
    } catch (e) {
      console.warn('Dispute Firestore save error:', e);
      throw e;
    }
  }

  // --- MAINTENANCE ---
  static getMaintenanceLogs(): MaintenanceLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MAINTENANCE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveMaintenance(maint: MaintenanceLog): Promise<void> {
    const list = this.getMaintenanceLogs();
    const idx = list.findIndex(m => m.id === maint.id);
    if (idx >= 0) {
      list[idx] = maint;
    } else {
      list.unshift(maint);
    }
    localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(list));
    try {
      await setDoc(doc(db, 'maintenance', maint.id), cleanForFirestore(maint), { merge: true });
    } catch (e) {
      console.warn('Maintenance Firestore save error:', e);
      throw e;
    }
  }

  // --- PLATFORM SETTINGS ---
  static getSettings(): PlatformSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_PLATFORM_SETTINGS;
    } catch {
      return DEFAULT_PLATFORM_SETTINGS;
    }
  }

  static async saveSettings(settings: PlatformSettings): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    try {
      await setDoc(doc(db, 'settings', 'platform_config'), cleanForFirestore(settings), { merge: true });
    } catch (e) {
      console.warn('Settings Firestore save error:', e);
      throw e;
    }
  }
}
