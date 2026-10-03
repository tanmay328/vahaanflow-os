import { 
  Vehicle, 
  Booking, 
  AuditRecord, 
  MaintenanceLog, 
  PayoutRecord, 
  DisputeRecord, 
  PlatformSettings,
  PenaltyItem
} from '../types/rental';
import { 
  INITIAL_VEHICLES, 
  INITIAL_BOOKINGS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_MAINTENANCE,
  INITIAL_PAYOUTS,
  INITIAL_DISPUTES,
  DEFAULT_PLATFORM_SETTINGS
} from '../data/mockData';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot
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

export class RentalStorageService {
  // Sync all collections from Firestore in real-time
  static initFirestoreSync(callbacks: {
    onVehicles: (v: Vehicle[]) => void;
    onBookings: (b: Booking[]) => void;
    onAuditLogs: (a: AuditRecord[]) => void;
    onMaintenance: (m: MaintenanceLog[]) => void;
    onPayouts?: (p: PayoutRecord[]) => void;
    onDisputes?: (d: DisputeRecord[]) => void;
  }): () => void {
    const unsubs: (() => void)[] = [];

    try {
      // 1. Vehicles
      unsubs.push(
        onSnapshot(collection(db, 'vehicles'), (snap) => {
          if (!snap.empty) {
            const list: Vehicle[] = [];
            snap.forEach((d) => list.push(d.data() as Vehicle));
            localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(list));
            callbacks.onVehicles(list);
          } else {
            // Seed initial
            INITIAL_VEHICLES.forEach(v => setDoc(doc(db, 'vehicles', v.id), v).catch(console.warn));
          }
        }, err => console.warn('Vehicles snapshot error:', err))
      );

      // 2. Bookings
      unsubs.push(
        onSnapshot(collection(db, 'bookings'), (snap) => {
          if (!snap.empty) {
            const list: Booking[] = [];
            snap.forEach((d) => list.push(d.data() as Booking));
            localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));
            callbacks.onBookings(list);
          } else {
            INITIAL_BOOKINGS.forEach(b => setDoc(doc(db, 'bookings', b.id), b).catch(console.warn));
          }
        }, err => console.warn('Bookings snapshot error:', err))
      );

      // 3. Audit Logs (Immutable)
      unsubs.push(
        onSnapshot(collection(db, 'auditLogs'), (snap) => {
          if (!snap.empty) {
            const list: AuditRecord[] = [];
            snap.forEach((d) => list.push(d.data() as AuditRecord));
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(list));
            callbacks.onAuditLogs(list);
          } else {
            INITIAL_AUDIT_LOGS.forEach(a => setDoc(doc(db, 'auditLogs', a.id), a).catch(console.warn));
          }
        }, err => console.warn('Audit snapshot error:', err))
      );

      // 4. Maintenance
      unsubs.push(
        onSnapshot(collection(db, 'maintenance'), (snap) => {
          if (!snap.empty) {
            const list: MaintenanceLog[] = [];
            snap.forEach((d) => list.push(d.data() as MaintenanceLog));
            localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(list));
            callbacks.onMaintenance(list);
          } else {
            INITIAL_MAINTENANCE.forEach(m => setDoc(doc(db, 'maintenance', m.id), m).catch(console.warn));
          }
        }, err => console.warn('Maintenance snapshot error:', err))
      );

      // 5. Payouts
      if (callbacks.onPayouts) {
        unsubs.push(
          onSnapshot(collection(db, 'payouts'), (snap) => {
            if (!snap.empty) {
              const list: PayoutRecord[] = [];
              snap.forEach((d) => list.push(d.data() as PayoutRecord));
              localStorage.setItem(STORAGE_KEYS.PAYOUTS, JSON.stringify(list));
              callbacks.onPayouts?.(list);
            } else {
              INITIAL_PAYOUTS.forEach(p => setDoc(doc(db, 'payouts', p.id), p).catch(console.warn));
            }
          }, err => console.warn('Payouts snapshot error:', err))
        );
      }

      // 6. Disputes
      if (callbacks.onDisputes) {
        unsubs.push(
          onSnapshot(collection(db, 'disputes'), (snap) => {
            if (!snap.empty) {
              const list: DisputeRecord[] = [];
              snap.forEach((d) => list.push(d.data() as DisputeRecord));
              localStorage.setItem(STORAGE_KEYS.DISPUTES, JSON.stringify(list));
              callbacks.onDisputes?.(list);
            } else {
              INITIAL_DISPUTES.forEach(disp => setDoc(doc(db, 'disputes', disp.id), disp).catch(console.warn));
            }
          }, err => console.warn('Disputes snapshot error:', err))
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
      return data ? JSON.parse(data) : INITIAL_VEHICLES;
    } catch {
      return INITIAL_VEHICLES;
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
    await setDoc(doc(db, 'vehicles', vehicle.id), vehicle, { merge: true });
  }

  static async deleteVehicle(id: string): Promise<void> {
    const list = this.getVehicles().filter(v => v.id !== id);
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(list));
    await deleteDoc(doc(db, 'vehicles', id));
  }

  // --- BOOKINGS ---
  static getBookings(): Booking[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      return data ? JSON.parse(data) : INITIAL_BOOKINGS;
    } catch {
      return INITIAL_BOOKINGS;
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
    await setDoc(doc(db, 'bookings', booking.id), booking, { merge: true });
  }

  // --- AUDIT LOGS (Strictly Immutable, append-only) ---
  static getAuditLogs(): AuditRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT);
      return data ? JSON.parse(data) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  static async logAudit(record: Omit<AuditRecord, 'id' | 'timestamp'>): Promise<AuditRecord> {
    const newRecord: AuditRecord = {
      ...record,
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };

    const list = this.getAuditLogs();
    list.unshift(newRecord);
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(list));

    // Append to Firestore (immutable per security rules)
    try {
      await setDoc(doc(db, 'auditLogs', newRecord.id), newRecord);
    } catch (e) {
      console.warn('Audit log write error:', e);
    }
    return newRecord;
  }

  // --- PAYOUTS ---
  static getPayouts(): PayoutRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAYOUTS);
      return data ? JSON.parse(data) : INITIAL_PAYOUTS;
    } catch {
      return INITIAL_PAYOUTS;
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
    await setDoc(doc(db, 'payouts', payout.id), payout, { merge: true });
  }

  // --- DISPUTES ---
  static getDisputes(): DisputeRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DISPUTES);
      return data ? JSON.parse(data) : INITIAL_DISPUTES;
    } catch {
      return INITIAL_DISPUTES;
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
    await setDoc(doc(db, 'disputes', dispute.id), dispute, { merge: true });
  }

  // --- MAINTENANCE ---
  static getMaintenanceLogs(): MaintenanceLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MAINTENANCE);
      return data ? JSON.parse(data) : INITIAL_MAINTENANCE;
    } catch {
      return INITIAL_MAINTENANCE;
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
    await setDoc(doc(db, 'maintenance', maint.id), maint, { merge: true });
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
    await setDoc(doc(db, 'settings', 'platform_config'), settings, { merge: true });
  }
}
