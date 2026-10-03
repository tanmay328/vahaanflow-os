import React, { useState } from 'react';
import { Vehicle, VehicleCategory, FuelType, VehicleStatus, INDIAN_LOCATIONS } from '../../types/rental';
import { UserProfile } from '../../types/auth';
import { 
  X, 
  Car, 
  FileText, 
  Calendar, 
  AlertCircle 
} from 'lucide-react';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialVehicle?: Vehicle | null;
  allOwners: UserProfile[];
  onSaveVehicle: (vehicle: Vehicle) => void;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialVehicle,
  allOwners,
  onSaveVehicle,
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Basic Information
  const [make, setMake] = useState<string>(initialVehicle?.make || 'Mahindra');
  const [model, setModel] = useState<string>(initialVehicle?.model || 'XUV700 AX7L AWD');
  const [year, setYear] = useState<number>(initialVehicle?.year || 2024);
  const [category, setCategory] = useState<VehicleCategory>(initialVehicle?.category || 'SUV');
  const [licensePlate, setLicensePlate] = useState<string>(initialVehicle?.licensePlate || 'KA 01 MJ 8820');
  const [color, setColor] = useState<string>(initialVehicle?.color || 'Everest White');
  const [transmission, setTransmission] = useState<'Automatic' | 'Manual'>(initialVehicle?.transmission || 'Automatic');
  const [fuelType, setFuelType] = useState<FuelType>(initialVehicle?.fuelType || 'Diesel');
  const [seatingCapacity, setSeatingCapacity] = useState<number>(initialVehicle?.seatingCapacity || 7);
  const [odometer, setOdometer] = useState<number>(initialVehicle?.odometer || 12400);
  const [fuelPct, setFuelPct] = useState<number>(initialVehicle?.fuelOrBatteryPct || 90);
  const [image, setImage] = useState<string>(
    initialVehicle?.image || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80'
  );

  // Status & Owner
  const [status, setStatus] = useState<VehicleStatus>(initialVehicle?.status || 'available');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(
    initialVehicle?.ownerId || (isAdmin ? (allOwners[0]?.id || currentUser.id) : currentUser.id)
  );

  // Pricing & Allowances
  const [dailyRate, setDailyRate] = useState<number>(initialVehicle?.dailyRate || 3500);
  const [suggestedDailyRate, setSuggestedDailyRate] = useState<number>(initialVehicle?.suggestedDailyRate || 3500);
  const [kmAllowance, setKmAllowance] = useState<number>(initialVehicle?.kmAllowancePerDay || 300);
  const [excessKmRate, setExcessKmRate] = useState<number>(initialVehicle?.excessKmRate || 15);
  const [depositAmount, setDepositAmount] = useState<number>(initialVehicle?.depositAmount || 10000);

  // Location
  const [city, setCity] = useState<string>(initialVehicle?.currentLocation.city || 'Bengaluru');
  const [hubName, setHubName] = useState<string>(
    initialVehicle?.currentLocation.hubName || 'Kempegowda Int\'l Airport (BLR) Hub'
  );

  // Documents & "Skip for now" option
  const [skipDocsForNow, setSkipDocsForNow] = useState<boolean>(
    initialVehicle?.documents?.skipped || false
  );
  const [rcNumber, setRcNumber] = useState<string>(initialVehicle?.documents?.rcNumber || 'RC-KA01-2024-8820');
  const [insuranceExpiry, setInsuranceExpiry] = useState<string>(initialVehicle?.documents?.insuranceExpiry || '2027-03-31');
  const [pucExpiry, setPucExpiry] = useState<string>(initialVehicle?.documents?.pucExpiry || '2027-04-15');
  const [permitType, setPermitType] = useState<any>(initialVehicle?.documents?.permitType || 'All India Tourist Permit (AITP)');

  // Personal use blocked dates
  const [blockedDatesInput, setBlockedDatesInput] = useState<string>(
    initialVehicle?.blockedDates?.join(', ') || ''
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedOwner = allOwners.find(o => o.id === selectedOwnerId) || currentUser;

    const blockedDates = blockedDatesInput
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    const vehicleData: Vehicle = {
      id: initialVehicle?.id || `veh-${Date.now()}`,
      ownerId: isAdmin ? selectedOwner.id : currentUser.id,
      ownerName: isAdmin ? selectedOwner.name : currentUser.name,
      ownerEmail: isAdmin ? selectedOwner.email : currentUser.email,
      approvalStatus: isAdmin ? 'approved' : (initialVehicle?.approvalStatus || 'pending_approval'),
      status: isAdmin ? status : (initialVehicle?.status || 'available'),
      make: make.trim(),
      model: model.trim(),
      year: Number(year),
      category,
      licensePlate: licensePlate.trim().toUpperCase(),
      color: color.trim(),
      transmission,
      fuelType,
      seatingCapacity: Number(seatingCapacity),
      dailyRate: isAdmin ? Number(dailyRate) : (initialVehicle?.dailyRate || Number(suggestedDailyRate)),
      suggestedDailyRate: Number(suggestedDailyRate),
      hourlyRate: Math.round(Number(dailyRate) / 8),
      kmAllowancePerDay: Number(kmAllowance),
      excessKmRate: Number(excessKmRate),
      depositAmount: Number(depositAmount),
      blockedDates,
      documents: {
        rcNumber: skipDocsForNow ? undefined : rcNumber,
        insuranceExpiry: skipDocsForNow ? '2027-12-31' : insuranceExpiry,
        pucExpiry: skipDocsForNow ? '2027-12-31' : pucExpiry,
        permitType: skipDocsForNow ? 'Private White Plate' : permitType,
        skipped: skipDocsForNow,
      },
      currentLocation: {
        city,
        hubName,
        bay: initialVehicle?.currentLocation.bay || 'Bay 1',
        lat: 13.1986,
        lng: 77.7066,
      },
      odometer: Number(odometer),
      fuelOrBatteryPct: Number(fuelPct),
      image,
      notes: initialVehicle?.notes || 'Car in great condition, ready for rent.',
    };

    onSaveVehicle(vehicleData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {initialVehicle ? 'Edit Car Details' : (isAdmin ? 'Add Car to Platform' : 'Add My Car for Rent')}
              </h2>
              <p className="text-xs text-neutral-400">
                {isAdmin 
                  ? 'Admin: Set daily price, car status, and fitness/PUC dates' 
                  : 'Car Owner: Suggest rental price, upload RC/insurance or skip for now'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-300">
          
          {/* Section 1: Basic Specifications */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Car Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Brand / Company</label>
                <input
                  type="text"
                  required
                  value={make}
                  onChange={e => setMake(e.target.value)}
                  placeholder="e.g. Maruti, Hyundai, Tata"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Model Name</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="e.g. Swift, Creta, Nexon"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Year of Car</label>
                <input
                  type="number"
                  min="2018"
                  max="2026"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Car Number Plate</label>
                <input
                  type="text"
                  required
                  value={licensePlate}
                  onChange={e => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="e.g. DL 01 EV 3490"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono uppercase focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Car Body Type</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as VehicleCategory)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="SUV">SUV</option>
                  <option value="MPV">MPV (7 Seater)</option>
                  <option value="Sedan">Sedan</option>
                  <option value="Compact EV">Electric EV</option>
                  <option value="Off-Roader">4x4 Off-Roader</option>
                  <option value="Luxury Van">Van</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Fuel Type</label>
                <select
                  value={fuelType}
                  onChange={e => setFuelType(e.target.value as FuelType)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric (EV)</option>
                  <option value="Strong Hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Seats</label>
                <input
                  type="number"
                  min="2"
                  max="16"
                  value={seatingCapacity}
                  onChange={e => setSeatingCapacity(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Gear Type</label>
                <select
                  value={transmission}
                  onChange={e => setTransmission(e.target.value as 'Automatic' | 'Manual')}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Current KM Reading</label>
                <input
                  type="number"
                  value={odometer}
                  onChange={e => setOdometer(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Current Fuel / Battery %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={fuelPct}
                  onChange={e => setFuelPct(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Owner & Status (Admin Power) */}
          {isAdmin && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Car Owner & Status</span>
                <span className="font-mono text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Admin Only
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Car Owner</label>
                  <select
                    value={selectedOwnerId}
                    onChange={e => setSelectedOwnerId(e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {allOwners.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Car Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as VehicleStatus)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="available">Available (Ready to rent)</option>
                    <option value="booked">Booked (Upcoming trip)</option>
                    <option value="on_trip">On Trip (Currently with customer)</option>
                    <option value="maintenance">In Workshop (Servicing)</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Pricing, KM Allowance & Deposit */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Pricing & Free KM</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {isAdmin ? (
                <div>
                  <label className="block text-neutral-400 mb-1">Rent per Day (₹)</label>
                  <input
                    type="number"
                    required
                    value={dailyRate}
                    onChange={e => setDailyRate(Number(e.target.value))}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-neutral-400 mb-1">Suggested Rent per Day (₹)</label>
                  <input
                    type="number"
                    required
                    value={suggestedDailyRate}
                    onChange={e => setSuggestedDailyRate(Number(e.target.value))}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-neutral-500 block mt-0.5">Admin can review/adjust</span>
                </div>
              )}

              <div>
                <label className="block text-neutral-400 mb-1">Free KM per Day</label>
                <input
                  type="number"
                  value={kmAllowance}
                  onChange={e => setKmAllowance(Number(e.target.value))}
                  placeholder="300 km"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Extra KM Rate (₹/km)</label>
                <input
                  type="number"
                  value={excessKmRate}
                  onChange={e => setExcessKmRate(Number(e.target.value))}
                  placeholder="₹15/km"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Security Deposit (₹)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={e => setDepositAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Block Dates for Personal Use */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <span>Block Dates for Personal / Family Use</span>
              </label>
              <span className="text-[10px] text-neutral-500">Comma-separated (YYYY-MM-DD)</span>
            </div>
            <input
              type="text"
              value={blockedDatesInput}
              onChange={e => setBlockedDatesInput(e.target.value)}
              placeholder="e.g. 2026-10-20, 2026-10-21"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
            />
            <p className="text-[10px] text-neutral-400">
              Customers will NOT be able to book your car on these dates so you can use it yourself.
            </p>
          </div>

          {/* Section 5: Documents with "Skip for now" Option */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Car Documents (RC & Insurance)
                </h3>
              </div>

              {/* Skip for now option */}
              <label className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDocsForNow}
                  onChange={e => setSkipDocsForNow(e.target.checked)}
                  className="rounded border-amber-500 text-amber-500 focus:ring-0"
                />
                <span className="font-semibold">Skip uploading documents for now (Upload later)</span>
              </label>
            </div>

            {skipDocsForNow ? (
              <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-neutral-400 text-[11px] flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300">Documents skipped.</strong> You can add your car immediately. You can upload your RC and insurance later before trips start.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-neutral-400 mb-1">RC Number (Registration Card)</label>
                  <input
                    type="text"
                    value={rcNumber}
                    onChange={e => setRcNumber(e.target.value)}
                    placeholder="RC-KA05-2024-9120"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Insurance Expiry Date</label>
                  <input
                    type="date"
                    value={insuranceExpiry}
                    onChange={e => setInsuranceExpiry(e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">PUC Pollution Certificate Expiry</label>
                  <input
                    type="date"
                    value={pucExpiry}
                    onChange={e => setPucExpiry(e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Permit / Plate Type</label>
                  <select
                    value={permitType}
                    onChange={e => setPermitType(e.target.value)}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="All India Tourist Permit (AITP)">All India Tourist Permit (AITP)</option>
                    <option value="Self-Drive Black Plate">Self-Drive Black Plate</option>
                    <option value="Commercial Yellow Plate">Commercial Yellow Plate</option>
                    <option value="Private White Plate">Private White Plate</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* City Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 mb-1">City</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                {Array.from(new Set(INDIAN_LOCATIONS.map(l => l.city))).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 mb-1">Pickup Hub / Area</label>
              <select
                value={hubName}
                onChange={e => setHubName(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                {INDIAN_LOCATIONS.filter(l => l.city === city).map(l => (
                  <option key={l.hubName} value={l.hubName}>{l.hubName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold transition-colors shadow-lg shadow-emerald-500/20"
            >
              {initialVehicle ? 'Save Changes' : (isAdmin ? 'Add Car' : 'Submit Car for Approval')}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
