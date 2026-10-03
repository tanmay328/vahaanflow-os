import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { INITIAL_USERS } from '../src/services/authService';
import { 
  INITIAL_VEHICLES, 
  INITIAL_BOOKINGS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_MAINTENANCE,
  INITIAL_PAYOUTS,
  INITIAL_DISPUTES,
  DEFAULT_PLATFORM_SETTINGS
} from '../src/data/mockData';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function seed() {
  console.log(`Starting Firestore Seeding into Database: "${firebaseConfig.firestoreDatabaseId}"...`);

  // 1. Users
  for (const user of INITIAL_USERS) {
    try {
      await setDoc(doc(db, 'users', user.id), user);
      console.log(`✓ Seeded user: ${user.name} (${user.email}) -> doc id: ${user.id}`);
    } catch (e: any) {
      console.error(`✗ User ${user.id} failed:`, e.message);
    }
  }

  // 2. Vehicles
  for (const v of INITIAL_VEHICLES) {
    try {
      await setDoc(doc(db, 'vehicles', v.id), v);
      console.log(`✓ Seeded vehicle: ${v.make} ${v.model} -> doc id: ${v.id}`);
    } catch (e: any) {
      console.error(`✗ Vehicle ${v.id} failed:`, e.message);
    }
  }

  // 3. Bookings
  for (const b of INITIAL_BOOKINGS) {
    try {
      await setDoc(doc(db, 'bookings', b.id), b);
      console.log(`✓ Seeded booking: ${b.bookingCode} -> doc id: ${b.id}`);
    } catch (e: any) {
      console.error(`✗ Booking ${b.id} failed:`, e.message);
    }
  }

  // 4. Audit Logs (Immutable)
  for (const a of INITIAL_AUDIT_LOGS) {
    try {
      await setDoc(doc(db, 'auditLogs', a.id), a);
      console.log(`✓ Seeded audit log: ${a.id} (${a.action})`);
    } catch (e: any) {
      console.error(`✗ Audit log ${a.id} failed:`, e.message);
    }
  }

  // 5. Maintenance
  for (const m of INITIAL_MAINTENANCE) {
    try {
      await setDoc(doc(db, 'maintenance', m.id), m);
      console.log(`✓ Seeded maintenance: ${m.id} (${m.serviceType})`);
    } catch (e: any) {
      console.error(`✗ Maintenance ${m.id} failed:`, e.message);
    }
  }

  // 6. Payouts
  for (const p of INITIAL_PAYOUTS) {
    try {
      await setDoc(doc(db, 'payouts', p.id), p);
      console.log(`✓ Seeded payout: ${p.id} (Owner: ${p.ownerName})`);
    } catch (e: any) {
      console.error(`✗ Payout ${p.id} failed:`, e.message);
    }
  }

  // 7. Disputes
  for (const d of INITIAL_DISPUTES) {
    try {
      await setDoc(doc(db, 'disputes', d.id), d);
      console.log(`✓ Seeded dispute: ${d.id} (${d.title})`);
    } catch (e: any) {
      console.error(`✗ Dispute ${d.id} failed:`, e.message);
    }
  }

  // 8. Settings
  try {
    await setDoc(doc(db, 'settings', 'platform_config'), DEFAULT_PLATFORM_SETTINGS);
    console.log('✓ Seeded platform settings (15% commission, 18% GST).');
  } catch (e: any) {
    console.error('✗ Settings failed:', e.message);
  }

  console.log('✅ ALL COLLECTIONS SEEDED SUCCESSFULLY INTO FIRESTORE!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
