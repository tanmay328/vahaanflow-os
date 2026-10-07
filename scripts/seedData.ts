import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!saKey) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY is missing');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(saKey)) });
const db = getFirestore();
const auth = getAuth();

async function runSeed() {
  console.log('🚀 Starting automatic seeding of Car Owners & Vehicles...');

  const ownersData = [
    {
      email: 'owner_demo@godrive.com',
      password: 'ownerPassword123',
      name: 'Ravi Kumar (Demo Owner)',
      phone: '+91 98765 43210',
      upiId: 'ravi@okaxis',
      bankAccount: '91827364554433',
      bankIfsc: 'HDFC0000123',
      payoutBalance: 12450,
      totalEarned: 35000,
      vehicles: [
        {
          id: 'scorpio_n_1008',
          make: 'Mahindra',
          model: 'Scorpio-N Z8L 4WD',
          year: 2024,
          category: 'SUV',
          licensePlate: 'HR 26 DQ 1008',
          color: 'Deep Forest Green',
          transmission: 'Automatic',
          fuelType: 'Diesel',
          seatingCapacity: 7,
          dailyRate: 3400,
          hourlyRate: 250,
          kmAllowancePerDay: 300,
          excessKmRate: 15,
          depositAmount: 8000,
          status: 'available',
          approvalStatus: 'approved',
          image: '/images/mahindra_scorpio_n_1791025607092.jpg',
          gallery: [
            '/images/mahindra_scorpio_n_1791025607092.jpg',
            '/images/suv_premium_black_1790847653822.jpg',
          ],
          currentLocation: {
            hubName: 'DLF Cyber City Hub',
            bay: 'Bay A-12',
            city: 'Delhi NCR',
            lat: 28.495,
            lng: 77.089,
          },
          odometer: 18450,
          fuelOrBatteryPct: 92,
          documents: {
            rcNumber: 'RC-HR26DQ1008',
            insuranceExpiry: '2026-11-15',
            pucExpiry: '2026-08-10',
            fitnessCertificateExpiry: '2028-05-20',
            permitType: 'All India Tourist Permit (AITP)',
          },
        },
        {
          id: 'nexon_ev_8820',
          make: 'Tata',
          model: 'Nexon EV Max',
          year: 2023,
          category: 'Compact EV',
          licensePlate: 'DL 01 EV 8820',
          color: 'Intensi Teal Blue',
          transmission: 'Automatic',
          fuelType: 'Electric',
          seatingCapacity: 5,
          dailyRate: 2600,
          hourlyRate: 200,
          kmAllowancePerDay: 300,
          excessKmRate: 12,
          depositAmount: 5000,
          status: 'available',
          approvalStatus: 'approved',
          image: '/images/tata_nexon_ev_1791025578720.jpg',
          gallery: [
            '/images/tata_nexon_ev_1791025578720.jpg',
            '/images/nexon_ev_blue_1790848422140.jpg',
          ],
          currentLocation: {
            hubName: 'Aerocity Metro Hub',
            bay: 'Bay EV-04',
            city: 'Delhi NCR',
            lat: 28.556,
            lng: 77.121,
          },
          odometer: 24100,
          fuelOrBatteryPct: 100,
          documents: {
            rcNumber: 'RC-DL01EV8820',
            insuranceExpiry: '2026-12-01',
            pucExpiry: '2026-09-30',
            fitnessCertificateExpiry: '2028-10-15',
            permitType: 'Self-Drive Black Plate',
          },
        },
      ],
    },
    {
      email: 'vikram.owner@godrive.com',
      password: 'OwnerPassword123!',
      name: 'Vikramaditya Singh (Apex Luxury Motors)',
      phone: '+91 98112 34567',
      upiId: 'vikram@okicici',
      bankAccount: '50100234567891',
      bankIfsc: 'HDFC0000240',
      payoutBalance: 24500,
      totalEarned: 89000,
      vehicles: [
        {
          id: 'bmw_z4_8899',
          make: 'BMW',
          model: 'Z4 M40i Roadster',
          year: 2024,
          category: 'Convertible',
          licensePlate: 'DL 01 CAB 8899',
          color: 'San Francisco Red',
          transmission: 'Automatic',
          fuelType: 'Petrol',
          seatingCapacity: 2,
          dailyRate: 8500,
          hourlyRate: 750,
          kmAllowancePerDay: 250,
          excessKmRate: 25,
          depositAmount: 15000,
          status: 'available',
          approvalStatus: 'approved',
          image: '/images/bmw_z4_red_1791026030834.jpg',
          gallery: [
            '/images/bmw_z4_red_1791026030834.jpg',
            '/images/sports_car_cabrio_1790847664522.jpg',
          ],
          currentLocation: {
            hubName: 'Delhi Aerocity Luxury Hub',
            bay: 'VIP Bay L-01',
            city: 'Delhi NCR',
            lat: 28.552,
            lng: 77.122,
          },
          odometer: 8200,
          fuelOrBatteryPct: 95,
          documents: {
            rcNumber: 'RC-DL01CAB8899',
            insuranceExpiry: '2027-01-15',
            pucExpiry: '2026-11-20',
            fitnessCertificateExpiry: '2029-01-10',
            permitType: 'All India Tourist Permit (AITP)',
          },
        },
        {
          id: 'mercedes_e_5522',
          make: 'Mercedes-Benz',
          model: 'E-Class E220d Exclusive',
          year: 2023,
          category: 'Sedan',
          licensePlate: 'DL 03 CL 5522',
          color: 'Obsidian Black',
          transmission: 'Automatic',
          fuelType: 'Diesel',
          seatingCapacity: 5,
          dailyRate: 7200,
          hourlyRate: 600,
          kmAllowancePerDay: 300,
          excessKmRate: 20,
          depositAmount: 12000,
          status: 'available',
          approvalStatus: 'approved',
          image: '/images/mercedes_e_class_1791025594533.jpg',
          gallery: [
            '/images/mercedes_e_class_1791025594533.jpg',
            '/images/luxury_sedan_black_1790848433946.jpg',
          ],
          currentLocation: {
            hubName: 'Gurgaon Golf Course Road',
            bay: 'Bay M-05',
            city: 'Gurgaon',
            lat: 28.459,
            lng: 77.026,
          },
          odometer: 16400,
          fuelOrBatteryPct: 88,
          documents: {
            rcNumber: 'RC-DL03CL5522',
            insuranceExpiry: '2026-10-30',
            pucExpiry: '2026-07-15',
            fitnessCertificateExpiry: '2028-08-12',
            permitType: 'All India Tourist Permit (AITP)',
          },
        },
      ],
    },
    {
      email: 'priya.ev@godrive.com',
      password: 'OwnerPassword123!',
      name: 'Priya Nair (Green Mobility Fleet)',
      phone: '+91 99401 23456',
      upiId: 'priya@ybl',
      bankAccount: '200987654321',
      bankIfsc: 'ICIC0000104',
      payoutBalance: 18200,
      totalEarned: 52000,
      vehicles: [
        {
          id: 'ioniq_5_1234',
          make: 'Hyundai',
          model: 'Ioniq 5 EV AWD',
          year: 2024,
          category: 'Compact EV',
          licensePlate: 'KA 05 EV 1234',
          color: 'Gravity Gold Matte',
          transmission: 'Automatic',
          fuelType: 'Electric',
          seatingCapacity: 5,
          dailyRate: 4800,
          hourlyRate: 400,
          kmAllowancePerDay: 300,
          excessKmRate: 15,
          depositAmount: 8000,
          status: 'available',
          approvalStatus: 'approved',
          image: '/images/hyundai_ioniq5_gold_1791026045021.jpg',
          gallery: [
            '/images/hyundai_ioniq5_gold_1791026045021.jpg',
            '/images/sedan_luxury_ev_1790847641852.jpg',
          ],
          currentLocation: {
            hubName: 'Indiranagar EV Charge Hub',
            bay: 'Charger Bay 02',
            city: 'Bengaluru',
            lat: 12.978,
            lng: 77.64,
          },
          odometer: 11200,
          fuelOrBatteryPct: 98,
          documents: {
            rcNumber: 'RC-KA05EV1234',
            insuranceExpiry: '2027-02-10',
            pucExpiry: '2026-12-05',
            fitnessCertificateExpiry: '2029-02-01',
            permitType: 'Self-Drive Black Plate',
          },
        },
      ],
    },
    {
      email: 'rajesh.fleet@godrive.com',
      password: 'OwnerPassword123!',
      name: 'Rajesh Sharma (Himalayan Offroaders)',
      phone: '+91 98711 00223',
      upiId: 'rajesh@paytm',
      bankAccount: '309876543210',
      bankIfsc: 'SBIN0001234',
      payoutBalance: 31000,
      totalEarned: 95000,
      vehicles: [
        {
          id: 'thar_4004',
          make: 'Mahindra',
          model: 'Thar LX Hard Top 4x4',
          year: 2024,
          category: 'Off-Roader',
          licensePlate: 'HP 01 TH 4004',
          color: 'Napoli Black',
          transmission: 'Automatic',
          fuelType: 'Diesel',
          seatingCapacity: 4,
          dailyRate: 3800,
          hourlyRate: 300,
          kmAllowancePerDay: 300,
          excessKmRate: 15,
          depositAmount: 10000,
          status: 'available',
          approvalStatus: 'approved',
          image: '/images/mahindra_thar_black_1791025566221.jpg',
          gallery: [
            '/images/mahindra_thar_black_1791025566221.jpg',
            '/images/thar_suv_black_1790848409695.jpg',
          ],
          currentLocation: {
            hubName: 'Chandigarh Highway Hub',
            bay: 'Bay 4X4-01',
            city: 'Chandigarh',
            lat: 30.733,
            lng: 76.779,
          },
          odometer: 14300,
          fuelOrBatteryPct: 90,
          documents: {
            rcNumber: 'RC-HP01TH4004',
            insuranceExpiry: '2026-11-01',
            pucExpiry: '2026-08-15',
            fitnessCertificateExpiry: '2028-11-01',
            permitType: 'All India Tourist Permit (AITP)',
          },
        },
        {
          id: 'jimny_7711',
          make: 'Maruti Suzuki',
          model: 'Jimny Alpha 4x4',
          year: 2023,
          category: 'Off-Roader',
          licensePlate: 'DL 08 C 7711',
          color: 'Kinetic Yellow',
          transmission: 'Automatic',
          fuelType: 'Petrol',
          seatingCapacity: 4,
          dailyRate: 2900,
          hourlyRate: 220,
          kmAllowancePerDay: 300,
          excessKmRate: 12,
          depositAmount: 6000,
          status: 'available',
          approvalStatus: 'approved',
          image: '/images/maruti_jimny_yellow_1791026067748.jpg',
          gallery: ['/images/maruti_jimny_yellow_1791026067748.jpg'],
          currentLocation: {
            hubName: 'Noida Sector 62 Hub',
            bay: 'Bay B-08',
            city: 'Noida',
            lat: 28.628,
            lng: 77.366,
          },
          odometer: 9800,
          fuelOrBatteryPct: 85,
          documents: {
            rcNumber: 'RC-DL08C7711',
            insuranceExpiry: '2026-09-15',
            pucExpiry: '2026-06-20',
            fitnessCertificateExpiry: '2028-09-10',
            permitType: 'Self-Drive Black Plate',
          },
        },
        {
          id: 'hilux_5005',
          make: 'Toyota',
          model: 'Hilux 4x4 High Pickup',
          year: 2024,
          category: '4x4 Pickup',
          licensePlate: 'HR 26 HX 5005',
          color: 'Super White',
          transmission: 'Automatic',
          fuelType: 'Diesel',
          seatingCapacity: 5,
          dailyRate: 5500,
          hourlyRate: 450,
          kmAllowancePerDay: 300,
          excessKmRate: 18,
          depositAmount: 12000,
          status: 'available',
          approvalStatus: 'approved',
          image: '/images/toyota_hilux_pickup_1791026055660.jpg',
          gallery: ['/images/toyota_hilux_pickup_1791026055660.jpg'],
          currentLocation: {
            hubName: 'Gurgaon Offroad Depot',
            bay: 'Bay H-01',
            city: 'Gurgaon',
            lat: 28.459,
            lng: 77.026,
          },
          odometer: 7500,
          fuelOrBatteryPct: 94,
          documents: {
            rcNumber: 'RC-HR26HX5005',
            insuranceExpiry: '2027-01-20',
            pucExpiry: '2026-10-10',
            fitnessCertificateExpiry: '2029-01-15',
            permitType: 'All India Tourist Permit (AITP)',
          },
        },
      ],
    },
    {
      email: 'ananya.tours@godrive.com',
      password: 'OwnerPassword123!',
      name: 'Ananya Deshmukh (Royal Family Travels)',
      phone: '+91 97654 88210',
      upiId: 'ananya@axisbank',
      bankAccount: '102938475610',
      bankIfsc: 'UTIB0000456',
      payoutBalance: 38900,
      totalEarned: 112000,
      vehicles: [
        {
          id: 'innova_hycross_7007',
          make: 'Toyota',
          model: 'Innova Hycross ZX Hybrid',
          year: 2024,
          category: 'MPV',
          licensePlate: 'MH 12 HY 7007',
          color: 'Platinum White Pearl',
          transmission: 'Automatic',
          fuelType: 'Strong Hybrid',
          seatingCapacity: 7,
          dailyRate: 4200,
          hourlyRate: 350,
          kmAllowancePerDay: 300,
          excessKmRate: 15,
          depositAmount: 10000,
          status: 'available',
          approvalStatus: 'approved',
          image: '/images/toyota_innova_hycross_1791025553936.jpg',
          gallery: [
            '/images/toyota_innova_hycross_1791025553936.jpg',
            '/images/innova_fleet_white_1790848395872.jpg',
          ],
          currentLocation: {
            hubName: 'Pune Baner Express Hub',
            bay: 'Bay M-01',
            city: 'Pune',
            lat: 18.559,
            lng: 73.786,
          },
          odometer: 19800,
          fuelOrBatteryPct: 96,
          documents: {
            rcNumber: 'RC-MH12HY7007',
            insuranceExpiry: '2026-12-20',
            pucExpiry: '2026-09-10',
            fitnessCertificateExpiry: '2028-12-15',
            permitType: 'All India Tourist Permit (AITP)',
          },
        },
        {
          id: 'kia_carnival_9000',
          make: 'Kia',
          model: 'Carnival Limousine Plus',
          year: 2024,
          category: 'Luxury MPV',
          licensePlate: 'MH 02 KL 9000',
          color: 'Aurora Black Pearl',
          transmission: 'Automatic',
          fuelType: 'Diesel',
          seatingCapacity: 7,
          dailyRate: 5800,
          hourlyRate: 500,
          kmAllowancePerDay: 300,
          excessKmRate: 18,
          depositAmount: 12000,
          status: 'available',
          approvalStatus: 'approved',
          image: '/images/kia_carnival_black_1791026080768.jpg',
          gallery: ['/images/kia_carnival_black_1791026080768.jpg'],
          currentLocation: {
            hubName: 'Mumbai Airport T2 Hub',
            bay: 'Bay VIP-09',
            city: 'Mumbai',
            lat: 19.089,
            lng: 72.865,
          },
          odometer: 12500,
          fuelOrBatteryPct: 90,
          documents: {
            rcNumber: 'RC-MH02KL9000',
            insuranceExpiry: '2027-01-05',
            pucExpiry: '2026-10-25',
            fitnessCertificateExpiry: '2029-01-01',
            permitType: 'All India Tourist Permit (AITP)',
          },
        },
        {
          id: 'urbania_van_1010',
          make: 'Force',
          model: 'Urbania Luxury Van 10-Seater',
          year: 2023,
          category: 'Luxury Van',
          licensePlate: 'MH 04 UB 1010',
          color: 'Silver Metallic',
          transmission: 'Manual',
          fuelType: 'Diesel',
          seatingCapacity: 10,
          dailyRate: 6500,
          hourlyRate: 550,
          kmAllowancePerDay: 300,
          excessKmRate: 20,
          depositAmount: 15000,
          status: 'available',
          approvalStatus: 'approved',
          image: '/images/force_urbania_van_1791025621572.jpg',
          gallery: [
            '/images/force_urbania_van_1791025621572.jpg',
            '/images/commercial_van_fleet_1790847677500.jpg',
          ],
          currentLocation: {
            hubName: 'Mumbai Bandra West Hub',
            bay: 'Bay V-02',
            city: 'Mumbai',
            lat: 19.06,
            lng: 72.836,
          },
          odometer: 22100,
          fuelOrBatteryPct: 88,
          documents: {
            rcNumber: 'RC-MH04UB1010',
            insuranceExpiry: '2026-11-10',
            pucExpiry: '2026-08-01',
            fitnessCertificateExpiry: '2028-11-05',
            permitType: 'All India Tourist Permit (AITP)',
          },
        },
      ],
    },
  ];

  const customersData = [
    {
      email: 'customer_demo@godrive.com',
      password: 'customerPassword123',
      name: 'Pooja Sharma (Demo Customer)',
      phone: '+91 87654 32109',
      drivingLicense: 'DL-1122334455',
      aadhaarMasked: 'XXXX-XXXX-9911',
    },
    {
      email: 'rahul.renter@godrive.com',
      password: 'CustomerPassword123!',
      name: 'Rahul Verma (Frequent Renter)',
      phone: '+91 91234 56789',
      drivingLicense: 'DL-5544332211',
      aadhaarMasked: 'XXXX-XXXX-4433',
    },
  ];

  let userCount = 0;
  let vehicleCount = 0;

  for (const owner of ownersData) {
    let uid = '';
    try {
      const uRec = await auth.getUserByEmail(owner.email);
      uid = uRec.uid;
    } catch {
      const created = await auth.createUser({
        email: owner.email,
        password: owner.password,
        displayName: owner.name,
      });
      uid = created.uid;
    }

    await db.collection('users').doc(uid).set({
      id: uid,
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      role: 'vehicle_owner',
      activeViewMode: 'vehicle_owner',
      approvalStatus: 'approved',
      createdAt: new Date().toISOString(),
      ownerDetails: {
        upiId: owner.upiId,
        bankAccount: owner.bankAccount,
        bankIfsc: owner.bankIfsc,
        approvalStatus: 'approved',
        payoutBalance: owner.payoutBalance,
        totalEarned: owner.totalEarned,
        joinedDate: new Date().toISOString().split('T')[0],
      },
    }, { merge: true });

    userCount++;

    for (const v of owner.vehicles) {
      await db.collection('vehicles').doc(v.id).set({
        ...v,
        ownerId: uid,
        ownerName: owner.name,
        ownerEmail: owner.email,
      }, { merge: true });
      vehicleCount++;
    }
  }

  for (const c of customersData) {
    let uid = '';
    try {
      const uRec = await auth.getUserByEmail(c.email);
      uid = uRec.uid;
    } catch {
      const created = await auth.createUser({
        email: c.email,
        password: c.password,
        displayName: c.name,
      });
      uid = created.uid;
    }

    await db.collection('users').doc(uid).set({
      id: uid,
      name: c.name,
      email: c.email,
      phone: c.phone,
      role: 'renter',
      activeViewMode: 'renter',
      approvalStatus: 'approved',
      createdAt: new Date().toISOString(),
      renterDetails: {
        drivingLicense: c.drivingLicense,
        aadhaarMasked: c.aadhaarMasked,
        kycStatus: 'verified',
      },
    }, { merge: true });

    userCount++;
  }

  console.log(`✅ Auto-seeding completed! Users: ${userCount}, Vehicles: ${vehicleCount}`);
}

runSeed().then(() => process.exit(0)).catch(err => {
  console.error('❌ Error during seeding:', err);
  process.exit(1);
});
