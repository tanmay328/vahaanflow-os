import React, { useState, useRef } from 'react';
import { Vehicle, VehicleCategory, FuelType, VehicleStatus, INDIAN_LOCATIONS } from '../../types/rental';
import { UserProfile } from '../../types/auth';
import { cleanImageUrl } from '../../utils/imageHelper';
import { 
  X, 
  Car, 
  FileText, 
  Calendar, 
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  Sparkles,
  Camera,
  ChevronLeft,
  ChevronRight,
  Mail,
  ShieldCheck,
  Check,
  Loader2,
  IndianRupee,
  Fuel,
  Gauge,
  Users,
  MapPin,
  Info,
  CalendarDays
} from 'lucide-react';
import { EmailService } from '../../services/emailService';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialVehicle?: Vehicle | null;
  allOwners: UserProfile[];
  onSaveVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle?: (vehicleId: string) => void;
  theme?: 'dark' | 'light';
}

const PRESET_CAR_PHOTOS = [
  { name: 'Tata Nexon EV (Teal/White)', url: '/images/nexon_ev_blue_1790848422140.jpg', make: 'Tata', model: 'Nexon EV Empowered', category: 'Compact EV' as VehicleCategory, fuelType: 'Electric' as FuelType },
  { name: 'Mahindra XUV700 (White SUV)', url: '/images/suv_premium_black_1790847653822.jpg', make: 'Mahindra', model: 'XUV700 AX7L AWD', category: 'SUV' as VehicleCategory, fuelType: 'Diesel' as FuelType },
  { name: 'Hyundai Creta / Alcazar', url: '/images/luxury_sedan_black_1790848433946.jpg', make: 'Hyundai', model: 'Creta SX(O)', category: 'SUV' as VehicleCategory, fuelType: 'Petrol' as FuelType },
  { name: 'Mahindra Thar 4x4', url: '/images/mahindra_thar_black_1791025566221.jpg', make: 'Mahindra', model: 'Thar LX 4x4 Hardtop', category: 'Off-Roader' as VehicleCategory, fuelType: 'Diesel' as FuelType },
  { name: 'Honda City / Verna Sedan', url: '/images/sedan_luxury_ev_1790847641852.jpg', make: 'Honda', model: 'City ZX i-VTEC', category: 'Sedan' as VehicleCategory, fuelType: 'Petrol' as FuelType },
  { name: 'Toyota Innova Hycross', url: '/images/toyota_innova_hycross_1791025553936.jpg', make: 'Toyota', model: 'Innova Hycross ZX(O)', category: 'MPV' as VehicleCategory, fuelType: 'Strong Hybrid' as FuelType },
];

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialVehicle,
  allOwners,
  onSaveVehicle,
  onDeleteVehicle,
  theme = 'dark',
}) => {
  const isAdmin = currentUser.role === 'admin';
  const canDelete = initialVehicle && (
    currentUser.role === 'admin' || 
    (currentUser.role === 'vehicle_owner' && initialVehicle.ownerId === currentUser.id)
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  // Energy source type: Battery/EV or Fuel
  type FuelDropdownOption = 'full' | 'more_than_half' | 'half' | 'less_than_half' | 'low';
  const getInitialFuelOption = (pct: number): FuelDropdownOption => {
    if (pct >= 85) return 'full';
    if (pct >= 60) return 'more_than_half';
    if (pct >= 40) return 'half';
    if (pct >= 20) return 'less_than_half';
    return 'low';
  };

  const [energyType, setEnergyType] = useState<'fuel' | 'ev'>(
    initialVehicle?.fuelType === 'Electric' ? 'ev' : 'fuel'
  );
  const [fuelOption, setFuelOption] = useState<FuelDropdownOption>(
    getInitialFuelOption(initialVehicle?.fuelOrBatteryPct ?? 90)
  );
  const [fuelPct, setFuelPct] = useState<number>(initialVehicle?.fuelOrBatteryPct ?? 90);

  // Photos State
  const [image, setImage] = useState<string>(initialVehicle?.image || '/images/upload_vehicle_photo_1791278597476.jpg');
  const [gallery, setGallery] = useState<string[]>(initialVehicle?.gallery || []);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingVehicleData, setPendingVehicleData] = useState<Vehicle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  // Status & Owner
  const [status, setStatus] = useState<VehicleStatus>(initialVehicle?.status || 'available');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(
    initialVehicle?.ownerId || (isAdmin ? (allOwners[0]?.id || currentUser.id) : currentUser.id)
  );
  const [ownerName, setOwnerName] = useState<string>(
    initialVehicle?.ownerName || (allOwners.find(o => o.id === (initialVehicle?.ownerId || allOwners[0]?.id))?.name || currentUser.name)
  );
  const [ownerEmail, setOwnerEmail] = useState<string>(
    initialVehicle?.ownerEmail || (allOwners.find(o => o.id === (initialVehicle?.ownerId || allOwners[0]?.id))?.email || currentUser.email)
  );

  // Pricing & Allowances
  const [dailyRate, setDailyRate] = useState<number>(initialVehicle?.dailyRate || 3500);
  const [suggestedDailyRate, setSuggestedDailyRate] = useState<number>(initialVehicle?.suggestedDailyRate || 3500);
  const [kmAllowance, setKmAllowance] = useState<number>(initialVehicle?.kmAllowancePerDay || 300);
  const [excessKmRate, setExcessKmRate] = useState<number>(initialVehicle?.excessKmRate || 15);
  const [depositAmount, setDepositAmount] = useState<number>(initialVehicle?.depositAmount || 10000);

  // Location
  const initialCity = initialVehicle?.currentLocation?.city || 'Bengaluru';
  const initialCityHubs = INDIAN_LOCATIONS.filter(l => l.city === initialCity);
  const initialHub = (initialVehicle?.currentLocation?.hubName && initialCityHubs.some(h => h.hubName === initialVehicle.currentLocation.hubName))
    ? initialVehicle.currentLocation.hubName
    : (initialCityHubs[0]?.hubName || '');

  const [city, setCity] = useState<string>(initialCity);
  const [hubName, setHubName] = useState<string>(initialHub);

  // Documents & "Skip for now" option
  const [skipDocsForNow, setSkipDocsForNow] = useState<boolean>(
    initialVehicle?.documents?.skipped || false
  );
  const [rcNumber, setRcNumber] = useState<string>(initialVehicle?.documents?.rcNumber || 'RC-KA01-2024-8820');
  const [insuranceExpiry, setInsuranceExpiry] = useState<string>(initialVehicle?.documents?.insuranceExpiry || '2027-03-31');
  const [pucExpiry, setPucExpiry] = useState<string>(initialVehicle?.documents?.pucExpiry || '2027-04-15');
  const [permitType, setPermitType] = useState<any>(initialVehicle?.documents?.permitType || 'All India Tourist Permit (AITP)');

  // Personal use blocked dates
  const [blockedDatesList, setBlockedDatesList] = useState<string[]>(
    initialVehicle?.blockedDates ? [...initialVehicle.blockedDates] : []
  );
  const [blockedDatesInput, setBlockedDatesInput] = useState<string>(
    initialVehicle?.blockedDates?.join(', ') || ''
  );

  // Calendar month state
  const [calendarDate, setCalendarDate] = useState<Date>(() => {
    if (initialVehicle?.blockedDates && initialVehicle.blockedDates.length > 0) {
      const parsed = new Date(initialVehicle.blockedDates[0]);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });
  const [datePickerValue, setDatePickerValue] = useState<string>('');

  const handleToggleDate = (dateStr: string) => {
    let nextList: string[];
    if (blockedDatesList.includes(dateStr)) {
      nextList = blockedDatesList.filter(d => d !== dateStr);
    } else {
      nextList = [...blockedDatesList, dateStr].sort();
    }
    setBlockedDatesList(nextList);
    setBlockedDatesInput(nextList.join(', '));
  };

  const handleAddSingleDate = () => {
    if (!datePickerValue) return;
    if (!blockedDatesList.includes(datePickerValue)) {
      const nextList = [...blockedDatesList, datePickerValue].sort();
      setBlockedDatesList(nextList);
      setBlockedDatesInput(nextList.join(', '));
    }
    setDatePickerValue('');
  };

  const handleRemoveDate = (dateToRemove: string) => {
    const nextList = blockedDatesList.filter(d => d !== dateToRemove);
    setBlockedDatesList(nextList);
    setBlockedDatesInput(nextList.join(', '));
  };

  const handleClearAllDates = () => {
    setBlockedDatesList([]);
    setBlockedDatesInput('');
  };

  const handleBlockUpcomingWeekend = () => {
    const now = new Date();
    const day = now.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7 || 7;
    const sat = new Date(now);
    sat.setDate(now.getDate() + daysUntilSaturday);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);

    const satStr = sat.toISOString().split('T')[0];
    const sunStr = sun.toISOString().split('T')[0];

    const combined = Array.from(new Set([...blockedDatesList, satStr, sunStr])).sort();
    setBlockedDatesList(combined);
    setBlockedDatesInput(combined.join(', '));
  };

  if (!isOpen) return null;

  // Handle Main Car Photo Upload from Device
  const handlePrimaryPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoUploadError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setPhotoUploadError('Image size exceeds 10MB. Please choose a smaller photo.');
      return;
    }

    setPhotoUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImage(reader.result);
        setCustomUrl('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Gallery Photos Upload (Multi-angle: Front, Rear, Interior)
  const handleGalleryPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setPhotoUploadError(null);
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setGallery(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveGalleryPhoto = (indexToRemove: number) => {
    setGallery(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if owner has uploaded at least 1 photo
    const isOwner = currentUser.role === 'vehicle_owner';
    const isPlaceholderImage = image && (image.includes('upload_car_placeholder') || image.includes('upload_vehicle_photo'));
    const hasUploadedPhoto = !isPlaceholderImage || gallery.length > 0;

    if (isOwner && !hasUploadedPhoto) {
      setPhotoUploadError('⚠️ Action Required: Please upload at least 1 real photo of your car (either a custom primary cover photo or an additional angle/interior photo) before confirming!');
      // Scroll modal body to top to reveal error
      const formEl = e.currentTarget;
      formEl.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const matchedOwner = allOwners.find(o => o.id === selectedOwnerId || o.name.toLowerCase() === ownerName.trim().toLowerCase());
    const finalOwnerId = isAdmin ? (matchedOwner?.id || selectedOwnerId || currentUser.id) : currentUser.id;
    const finalOwnerName = isAdmin ? (ownerName.trim() || matchedOwner?.name || currentUser.name) : currentUser.name;
    const finalOwnerEmail = isAdmin ? (ownerEmail.trim() || matchedOwner?.email || currentUser.email) : currentUser.email;

    const parsedInput = blockedDatesInput
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);
    const blockedDates = Array.from(new Set([...blockedDatesList, ...parsedInput])).sort();

    const vehicleData: Vehicle = {
      id: initialVehicle?.id || `veh-${Date.now()}`,
      ownerId: finalOwnerId,
      ownerName: finalOwnerName,
      ownerEmail: finalOwnerEmail,
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
      dailyRate: isAdmin ? Number(dailyRate) : Number(suggestedDailyRate || dailyRate),
      suggestedDailyRate: Number(suggestedDailyRate || dailyRate),
      hourlyRate: Math.max(150, Math.round((isAdmin ? Number(dailyRate) : Number(suggestedDailyRate || dailyRate)) / 8)),
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
        lat: INDIAN_LOCATIONS.find(l => l.city === city && l.hubName === hubName)?.lat ?? 13.1986,
        lng: INDIAN_LOCATIONS.find(l => l.city === city && l.hubName === hubName)?.lng ?? 77.7066,
      },
      odometer: Number(odometer),
      fuelOrBatteryPct: Number(fuelPct),
      image: image || '/images/upload_vehicle_photo_1791278597476.jpg',
      gallery,
      notes: initialVehicle?.notes || 'Car in great condition, ready for rent.',
    };

    setPendingVehicleData(vehicleData);
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingVehicleData || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      // 1. Commit vehicle data to parent handler (Firestore & local state)
      onSaveVehicle(pendingVehicleData);

      // 2. Mail the full service & finalized rates to the owner (and admin copy)
      const mailRes = await EmailService.sendVehicleSubmissionSummary({
        vehicle: pendingVehicleData,
      });

      // 3. Notify admin operations
      await EmailService.notifyAdmin({
        eventTitle: 'Vehicle Listing Submission & Finalized Rates',
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actorEmail: currentUser.email,
        summaryText: `Vehicle submitted: ${pendingVehicleData.make} ${pendingVehicleData.model} (${pendingVehicleData.licensePlate}). Finalized rate: ₹${pendingVehicleData.dailyRate}/day by ${currentUser.name}. Full summary email sent to ${currentUser.email || pendingVehicleData.ownerEmail}.`,
        detailsHtml: `
          <h3>Vehicle Listing Summary & Rates</h3>
          <ul>
            <li><strong>Car:</strong> ${pendingVehicleData.make} ${pendingVehicleData.model} (${pendingVehicleData.year})</li>
            <li><strong>License Plate:</strong> ${pendingVehicleData.licensePlate}</li>
            <li><strong>Category:</strong> ${pendingVehicleData.category}</li>
            <li><strong>Fuel:</strong> ${pendingVehicleData.fuelType}</li>
            <li><strong>Daily Rate (Finalized):</strong> ₹${pendingVehicleData.dailyRate}</li>
            <li><strong>Hourly Rate:</strong> ₹${pendingVehicleData.hourlyRate}</li>
            <li><strong>Deposit Amount:</strong> ₹${pendingVehicleData.depositAmount}</li>
            <li><strong>City & Hub:</strong> ${pendingVehicleData.currentLocation.hubName}, ${pendingVehicleData.currentLocation.city}</li>
            <li><strong>Owner:</strong> ${currentUser.name} (${currentUser.email})</li>
          </ul>
        `
      });

      if (mailRes.success) {
        setSubmitFeedback({
          type: 'success',
          message: `Submission confirmed! Full service summary and finalized rates (₹${pendingVehicleData.dailyRate}/day) mailed to ${currentUser.email || pendingVehicleData.ownerEmail}.`
        });
      } else {
        setSubmitFeedback({
          type: 'success',
          message: `Submission confirmed and saved! Vehicle is sent for approval.`
        });
      }

      // Allow owner to see confirmation message briefly
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1600);
    } catch (err: any) {
      console.warn('Submission error:', err);
      setIsSubmitting(false);
      onClose();
    }
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
                {showConfirmation 
                  ? 'Review Listing Summary & Finalized Rates' 
                  : (initialVehicle ? 'Edit Car Details' : (isAdmin ? 'Add Car to Platform' : 'Add My Car for Rent'))}
              </h2>
              <p className="text-xs text-neutral-400">
                {showConfirmation
                  ? 'Review all vehicle specifications, included services, and rates before approval submission'
                  : (isAdmin 
                      ? 'Admin: Set daily price, car photos, fitness/PUC dates' 
                      : 'Car Owner: Upload real car photos, set suggested price & availability')}
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

        {/* Scrollable Form or Confirmation View */}
        {showConfirmation && pendingVehicleData ? (
          <div className="flex flex-col p-6 overflow-y-auto space-y-5 text-xs text-neutral-300">
            {/* Top Banner */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Full Listing Summary & Finalized Rates</span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                      Ready for Review
                    </span>
                  </h3>
                  <p className="text-neutral-400 text-xs mt-1">
                    Please review all vehicle specifications, included platform services, and your finalized rental rates. Once confirmed, a full copy will be dispatched to your registered email (<strong className="text-neutral-200">{currentUser.email || pendingVehicleData.ownerEmail}</strong>).
                  </p>
                </div>
              </div>
            </div>

            {submitFeedback && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                submitFeedback.type === 'success' 
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300' 
                  : 'border-amber-500/40 bg-amber-950/30 text-amber-300'
              }`}>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{submitFeedback.message}</span>
              </div>
            )}

            {/* Vehicle Showcase Card */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="relative w-full sm:w-48 h-32 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0">
                  <img
                    src={cleanImageUrl(pendingVehicleData.image)}
                    alt={`${pendingVehicleData.make} ${pendingVehicleData.model}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/upload_vehicle_photo_1791278597476.jpg';
                    }}
                  />
                  {pendingVehicleData.gallery && pendingVehicleData.gallery.length > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded text-[10px] bg-black/80 backdrop-blur-sm text-neutral-300 border border-neutral-700 flex items-center gap-1 font-mono">
                      <Camera className="h-3 w-3 text-emerald-400" />
                      <span>+{pendingVehicleData.gallery.length} photos</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-base font-extrabold text-white">
                        {pendingVehicleData.make} {pendingVehicleData.model} ({pendingVehicleData.year})
                      </h4>
                      <p className="text-neutral-400 text-xs flex items-center gap-1.5 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>{pendingVehicleData.currentLocation.hubName}, {pendingVehicleData.currentLocation.city}</span>
                      </p>
                    </div>

                    {/* Indian License Plate Badge */}
                    <div className="inline-flex items-center rounded-md border border-neutral-600 bg-neutral-900 px-3 py-1 font-mono font-bold text-xs tracking-wider text-white shadow-inner">
                      <span className="text-[10px] text-blue-400 font-sans font-bold border-r border-neutral-700 pr-1.5 mr-1.5 flex items-center gap-1">
                        🇮🇳 IND
                      </span>
                      <span>{pendingVehicleData.licensePlate}</span>
                    </div>
                  </div>

                  {/* Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-neutral-800 border border-neutral-700 text-neutral-300 font-medium">
                      {pendingVehicleData.category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-neutral-800 border border-neutral-700 text-neutral-300 font-medium flex items-center gap-1">
                      <Fuel className="h-3 w-3 text-emerald-400" />
                      {pendingVehicleData.fuelType}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-neutral-800 border border-neutral-700 text-neutral-300 font-medium">
                      {pendingVehicleData.transmission}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-neutral-800 border border-neutral-700 text-neutral-300 font-medium flex items-center gap-1">
                      <Users className="h-3 w-3 text-emerald-400" />
                      {pendingVehicleData.seatingCapacity} Seater
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-neutral-800 border border-neutral-700 text-neutral-300 font-medium">
                      Color: {pendingVehicleData.color}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rates Finalized by Owner (Highlighted Card) */}
            <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-neutral-900/60 to-neutral-950 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Finalized Rates & Pricing (Set by Owner)
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Rates Finalized
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-neutral-900/90 border border-neutral-800">
                  <span className="text-neutral-400 text-[11px] block">Daily Rental Rate</span>
                  <span className="text-lg font-extrabold text-emerald-400 font-mono">₹{pendingVehicleData.dailyRate}</span>
                  <span className="text-neutral-500 text-[10px] block">per day (24 hours)</span>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900/90 border border-neutral-800">
                  <span className="text-neutral-400 text-[11px] block">Hourly Rate</span>
                  <span className="text-base font-bold text-white font-mono">₹{pendingVehicleData.hourlyRate}</span>
                  <span className="text-neutral-500 text-[10px] block">per hour pro-rata</span>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900/90 border border-neutral-800">
                  <span className="text-neutral-400 text-[11px] block">Security Deposit</span>
                  <span className="text-base font-bold text-white font-mono">₹{pendingVehicleData.depositAmount}</span>
                  <span className="text-neutral-500 text-[10px] block">Refundable deposit</span>
                </div>

                <div className="p-3 rounded-lg bg-neutral-900/90 border border-neutral-800">
                  <span className="text-neutral-400 text-[11px] block">Free Daily KM</span>
                  <span className="text-base font-bold text-white font-mono">{pendingVehicleData.kmAllowancePerDay} KM</span>
                  <span className="text-neutral-500 text-[10px] block">Extra: ₹{pendingVehicleData.excessKmRate}/km</span>
                </div>
              </div>
            </div>

            {/* Included Platform Services */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-neutral-800/80 pb-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Full Platform Services & Guarantees Included
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80 flex items-start gap-2.5">
                  <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <strong className="text-white block">24/7 Roadside Assistance</strong>
                    <span className="text-neutral-400 text-[11px]">Emergency towing, flat-tyre assistance, and jump-start support nationwide.</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80 flex items-start gap-2.5">
                  <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <strong className="text-white block">Comprehensive Insurance Cover</strong>
                    <span className="text-neutral-400 text-[11px]">Commercial self-drive protection for accidental damage and third-party liabilities.</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80 flex items-start gap-2.5">
                  <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <strong className="text-white block">Verified Renter Background Checks</strong>
                    <span className="text-neutral-400 text-[11px]">Every customer is verified with Aadhaar and original Driving License before rental.</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80 flex items-start gap-2.5">
                  <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <strong className="text-white block">FASTag Automated Toll Management</strong>
                    <span className="text-neutral-400 text-[11px]">Contactless toll tracking and seamless deduction billed directly to the customer.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Condition & Documents Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Technical Specifications */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-2.5">
                <div className="flex items-center gap-2 border-b border-neutral-800/80 pb-2">
                  <Gauge className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Vehicle Condition</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-neutral-800/50">
                    <span className="text-neutral-400">Current Odometer:</span>
                    <span className="font-mono text-white font-semibold">{pendingVehicleData.odometer.toLocaleString('en-IN')} KM</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/50">
                    <span className="text-neutral-400">Fuel / Battery Level:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{pendingVehicleData.fuelOrBatteryPct}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/50">
                    <span className="text-neutral-400">Transmission:</span>
                    <span className="text-white font-semibold">{pendingVehicleData.transmission}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400">Seating Capacity:</span>
                    <span className="text-white font-semibold">{pendingVehicleData.seatingCapacity} Persons</span>
                  </div>
                </div>
              </div>

              {/* Legal & Compliance */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-2.5">
                <div className="flex items-center gap-2 border-b border-neutral-800/80 pb-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Compliance & Documents</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-neutral-800/50">
                    <span className="text-neutral-400">RC Number:</span>
                    <span className="font-mono text-white font-semibold">
                      {pendingVehicleData.documents?.skipped ? 'Skipped (Upload later)' : (pendingVehicleData.documents?.rcNumber || 'Provided')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/50">
                    <span className="text-neutral-400">Insurance Expiry:</span>
                    <span className="text-white font-semibold">{pendingVehicleData.documents?.insuranceExpiry || '2027-12-31'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-neutral-800/50">
                    <span className="text-neutral-400">PUC Certificate:</span>
                    <span className="text-white font-semibold">{pendingVehicleData.documents?.pucExpiry || '2027-12-31'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-400">Plate / Permit Type:</span>
                    <span className="text-white font-semibold">{pendingVehicleData.documents?.permitType || 'Self-Drive'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Blocked Dates Info */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Personal Schedule</span>
                </div>
                <span className="text-[11px] text-neutral-400">
                  {pendingVehicleData.blockedDates && pendingVehicleData.blockedDates.length > 0 
                    ? `${pendingVehicleData.blockedDates.length} date(s) reserved for personal use`
                    : '100% Available for bookings'}
                </span>
              </div>
              {pendingVehicleData.blockedDates && pendingVehicleData.blockedDates.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {pendingVehicleData.blockedDates.map(dateStr => (
                    <span key={dateStr} className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 border border-amber-500/30 text-amber-300">
                      {dateStr}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 italic">No blackout dates. Your car will be ready for bookings immediately upon approval.</p>
              )}
            </div>

            {/* Email Dispatch Notice */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 flex items-start gap-3">
              <Mail className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-neutral-300">
                <strong className="text-white block">Email Dispatch on Confirmation:</strong>
                A full copy of this service breakdown and your finalized rates (₹{pendingVehicleData.dailyRate}/day) will be emailed to <strong className="text-emerald-300">{currentUser.email || pendingVehicleData.ownerEmail}</strong> and copied to GoDrive Operations for expedited verification.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmation(false);
                  setSubmitFeedback(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back to Edit</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mailing Summary & Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Submit for Approval</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-300">
          
          {/* SECTION 1: CAR PHOTOS UPLOAD (Owner Photo Upload Feature) */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Car Photos & Inspection Gallery
                </h3>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>Upload real photos to get more bookings</span>
              </span>
            </div>

            {photoUploadError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{photoUploadError}</span>
              </div>
            )}

            {/* Main Cover Photo Upload Area - Centered on Top */}
            <div className="flex flex-col items-center justify-center space-y-3 pb-4 border-b border-neutral-800/80 w-full">
              <div className="w-full max-w-xl text-center space-y-2">
                <label className="block text-neutral-400 text-[11px] font-semibold tracking-wide">
                  Primary Cover Photo
                </label>
                <div className="relative group h-56 sm:h-72 w-full rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 flex items-center justify-center mx-auto shadow-md">
                  {image ? (
                    <>
                      <img
                        src={image}
                        alt="Primary car preview"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Change Photo</span>
                        </button>
                      </div>
                      <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-neutral-950/80 text-white text-[10px] font-mono border border-neutral-800">
                        Primary Cover
                      </span>
                    </>
                  ) : (
                    <div className="text-center p-4 text-neutral-500 space-y-2">
                      <ImageIcon className="h-10 w-10 mx-auto text-neutral-600" />
                      <p className="text-xs">No primary photo chosen</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shifted Details to the bottom, in landscape mode */}
            <div className="space-y-4 pt-2">
              
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePrimaryPhotoUpload}
                accept="image/png, image/jpeg, image/webp, image/jpg"
                className="hidden"
              />

              {/* Upload & Preset Row (Side-by-side in landscape) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Upload Action Column with Additional Photos Section */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-neutral-400 text-[11px] font-semibold">
                      Upload from Device
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-neutral-800 bg-neutral-900 hover:bg-neutral-800 hover:border-emerald-500 text-neutral-300 font-bold transition-all text-xs cursor-pointer"
                    >
                      <Upload className="h-4 w-4 text-emerald-400" />
                      <span>Upload New Primary Photo</span>
                    </button>
                    <p className="text-[10px] text-neutral-500 mt-1">
                      Supports JPG, PNG, WebP up to 10MB.
                    </p>
                  </div>

                  {/* Additional Photos Section - Placed Just Below It */}
                  <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-neutral-300 font-semibold text-xs">
                          Additional Photos (Front, Rear, Cabin)
                        </label>
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="px-2.5 py-1 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Upload className="h-3 w-3 text-emerald-400" />
                          <span>Add Angle</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-neutral-500">
                        Upload multiple angles to show your car's clean condition.
                      </p>
                    </div>

                    <input
                      type="file"
                      multiple
                      ref={galleryInputRef}
                      onChange={handleGalleryPhotoUpload}
                      accept="image/png, image/jpeg, image/webp, image/jpg"
                      className="hidden"
                    />

                    {/* Gallery Preview Grid */}
                    {gallery.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {gallery.map((photoUrl, idx) => (
                          <div
                            key={idx}
                            className="relative group h-20 rounded-lg overflow-hidden border border-neutral-800 bg-neutral-900"
                          >
                            <img
                              src={photoUrl}
                              alt={`Car angle ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryPhoto(idx)}
                              className="absolute top-1 right-1 p-1 rounded bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              title="Delete photo"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                            <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-neutral-950/80 text-neutral-300 text-[9px] font-mono">
                              Angle {idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border border-dashed border-neutral-800 text-center text-[10px] text-neutral-500">
                        No additional angle photos uploaded yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Presets for Instant Selection */}
                <div className="space-y-1">
                  <label className="block text-neutral-400 text-[11px] font-semibold">
                    Or select standard Indian car photo:
                  </label>
                  <div className="relative">
                    <select
                      defaultValue=""
                      onChange={e => {
                        const selectedVal = e.target.value;
                        if (selectedVal === 'custom') return;
                        if (selectedVal) {
                          const found = PRESET_CAR_PHOTOS.find(p => p.url === selectedVal);
                          if (found) {
                            setImage(found.url);
                            setCustomUrl('');
                            setMake(found.make);
                            setModel(found.model);
                            setCategory(found.category);
                            setFuelType(found.fuelType);
                            if (found.fuelType === 'Electric') {
                              setEnergyType('ev');
                            } else {
                              setEnergyType('fuel');
                            }
                          } else {
                            setImage(selectedVal);
                            setCustomUrl('');
                          }
                        }
                      }}
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3 text-white text-xs focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="">-- Choose Car Photo Preset --</option>
                      {PRESET_CAR_PHOTOS.map(p => (
                        <option key={p.name} value={p.url}>
                          {p.name}
                        </option>
                      ))}
                      <option value="custom">✏️ Other / Manually Enter Car Name & Photo...</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Instant high-fidelity vehicle model setup.
                  </p>
                </div>

              </div>

              {/* Option to Manually Enter the Car Name - Full-Width Landscape */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 space-y-3 pt-3 mt-2">
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
                  <label className="text-white text-xs font-bold flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Manually Enter Car Name:</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">Custom Brand & Model</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 text-[10px] mb-1">Brand / Company</label>
                    <input
                      type="text"
                      required
                      value={make}
                      onChange={e => setMake(e.target.value)}
                      placeholder="e.g. Maruti, Hyundai, Kia, Tata"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white text-xs placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 text-[10px] mb-1">Car Model Name</label>
                    <input
                      type="text"
                      required
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      placeholder="e.g. Swift ZXi, Seltos, Creta SX"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white text-xs placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400 leading-tight">
                  Type your car brand and model name here. This title will be shown on the car rental profile.
                </p>
              </div>

            </div>

          </div>
          
          {/* Section 2: Basic Specifications */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Car Specifications</h3>
            
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
                <label className="block text-neutral-400 mb-1">Year of Car</label>
                <input
                  type="number"
                  min="2018"
                  max="2026"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none font-mono"
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
                  onChange={e => {
                    const val = e.target.value as FuelType;
                    setFuelType(val);
                    if (val === 'Electric') {
                      setEnergyType('ev');
                    } else {
                      setEnergyType('fuel');
                    }
                  }}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric (EV)</option>
                  <option value="Strong Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-neutral-400 mb-1">Seats</label>
                <input
                  type="number"
                  min="2"
                  max="16"
                  value={seatingCapacity}
                  onChange={e => setSeatingCapacity(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

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

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-neutral-400 text-xs">
                    {energyType === 'ev' ? 'Current Battery' : 'Current Fuel'}
                  </label>

                  {/* Option for selecting Battery / EV vs Fuel */}
                  <div className="inline-flex rounded-md border border-neutral-800 bg-neutral-950 p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        setEnergyType('fuel');
                        if (fuelType === 'Electric') setFuelType('Petrol');
                        if (fuelOption === 'full') setFuelPct(100);
                        else if (fuelOption === 'more_than_half') setFuelPct(75);
                        else if (fuelOption === 'half') setFuelPct(50);
                        else if (fuelOption === 'less_than_half') setFuelPct(25);
                        else if (fuelOption === 'low') setFuelPct(10);
                      }}
                      className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                        energyType === 'fuel'
                          ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Fuel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEnergyType('ev');
                        setFuelType('Electric');
                      }}
                      className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                        energyType === 'ev'
                          ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Battery / EV
                    </button>
                  </div>
                </div>

                {energyType === 'ev' ? (
                  /* EV selected: enter percentage in numbers */
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={fuelPct}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setFuelPct(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                      }}
                      placeholder="e.g. 91"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 pl-3 pr-8 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-mono text-neutral-400">%</span>
                  </div>
                ) : (
                  /* Fuel selected: dropdown with options (full, more than half, half, less than half, low) */
                  <select
                    value={fuelOption}
                    onChange={e => {
                      const opt = e.target.value as FuelDropdownOption;
                      setFuelOption(opt);
                      if (opt === 'full') setFuelPct(100);
                      else if (opt === 'more_than_half') setFuelPct(75);
                      else if (opt === 'half') setFuelPct(50);
                      else if (opt === 'less_than_half') setFuelPct(25);
                      else if (opt === 'low') setFuelPct(10);
                    }}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="full">Full</option>
                    <option value="more_than_half">More than half</option>
                    <option value="half">Half</option>
                    <option value="less_than_half">Less than half</option>
                    <option value="low">Low</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Owner & Status (Admin Power) */}
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
                  <label className="block text-neutral-400 mb-1 text-xs">Car Owner Name</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={e => {
                      const val = e.target.value;
                      setOwnerName(val);
                      const matched = allOwners.find(o => o.name.toLowerCase() === val.trim().toLowerCase());
                      if (matched) {
                        setSelectedOwnerId(matched.id);
                        if (matched.email) setOwnerEmail(matched.email);
                      }
                    }}
                    placeholder="Enter owner name (e.g. Rahul Sharma)"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none text-xs placeholder:text-neutral-600"
                  />
                  {allOwners.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] text-neutral-500">Quick Select:</span>
                      {allOwners.map(o => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setSelectedOwnerId(o.id);
                            setOwnerName(o.name);
                            if (o.email) setOwnerEmail(o.email);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            ownerName === o.name
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
                          }`}
                        >
                          {o.name}
                        </button>
                      ))}
                    </div>
                  )}
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

          {/* Section 4: Pricing, KM Allowance & Deposit */}
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

          {/* Section 5: Block Dates for Personal Use - Interactive Calendar Plugin */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
              <div>
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <span>Block Dates for Personal / Family Use</span>
                </label>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Click any date on the calendar to block or unblock. Customers cannot book on these dates.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleBlockUpcomingWeekend}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-neutral-700 bg-neutral-900 text-neutral-200 hover:text-white hover:border-emerald-500/50 transition-colors cursor-pointer"
                >
                  + Block This Weekend
                </button>
                {blockedDatesList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllDates}
                    className="px-2 py-1 rounded-md text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Calendar Plugin Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              
              {/* Interactive Calendar Month Grid */}
              <div className="md:col-span-8 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 space-y-2">
                {/* Month Navigator Header */}
                <div className="flex items-center justify-between px-1 pb-1.5 border-b border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
                    }}
                    className="p-1 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="text-xs font-bold text-white tracking-wide">
                    {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
                    }}
                    className="p-1 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-neutral-500 uppercase">
                  <span>Su</span>
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = calendarDate.getFullYear();
                    const month = calendarDate.getMonth();
                    const firstDayOfWeek = new Date(year, month, 1).getDay();
                    const totalDays = new Date(year, month + 1, 0).getDate();
                    const blanks = Array.from({ length: firstDayOfWeek });
                    const days = Array.from({ length: totalDays }, (_, i) => i + 1);
                    const todayStr = new Date().toISOString().split('T')[0];

                    return (
                      <>
                        {blanks.map((_, idx) => (
                          <div key={`blank-${idx}`} className="h-7 w-full" />
                        ))}
                        {days.map(d => {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                          const isBlocked = blockedDatesList.includes(dateStr);
                          const isToday = dateStr === todayStr;

                          return (
                            <button
                              key={dateStr}
                              type="button"
                              onClick={() => handleToggleDate(dateStr)}
                              className={`h-7 w-full rounded text-xs font-mono font-medium transition-all flex items-center justify-center cursor-pointer ${
                                isBlocked
                                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm ring-1 ring-amber-400'
                                  : isToday
                                  ? 'border border-emerald-500/60 bg-emerald-500/10 text-emerald-400 hover:bg-neutral-800'
                                  : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                              }`}
                              title={isBlocked ? `Blocked on ${dateStr} (Click to unblock)` : `Click to block ${dateStr}`}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>

                {/* Calendar Legend */}
                <div className="flex items-center gap-4 text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-amber-500" />
                    <span>Blocked for Personal Use</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded border border-emerald-500/60 bg-emerald-500/20" />
                    <span>Today</span>
                  </div>
                </div>
              </div>

              {/* Native Date Picker & Blocked Dates List */}
              <div className="md:col-span-4 space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Pick Date from Calendar:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={datePickerValue}
                      onChange={e => setDatePickerValue(e.target.value)}
                      className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddSingleDate}
                      disabled={!datePickerValue}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Block
                    </button>
                  </div>
                </div>

                {/* Blocked Dates Chips Card */}
                <div className="rounded-lg border border-neutral-800 bg-neutral-950/80 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-neutral-300">Blocked Dates:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {blockedDatesList.length} {blockedDatesList.length === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  {blockedDatesList.length === 0 ? (
                    <p className="text-[10px] text-neutral-500 italic py-1">
                      No dates blocked. Click any date on the calendar to block it.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1 pt-0.5">
                      {blockedDatesList.map(dateStr => (
                        <span
                          key={dateStr}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 border border-amber-500/30 text-amber-300"
                        >
                          <span>{dateStr}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDate(dateStr)}
                            className="hover:text-white p-0.5 cursor-pointer"
                            title={`Unblock ${dateStr}`}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Section 6: Documents with "Skip for now" Option */}
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

          {/* Section 7: City Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 mb-1">City</label>
              <select
                value={city}
                onChange={e => {
                  const newCity = e.target.value;
                  setCity(newCity);
                  const firstHub = INDIAN_LOCATIONS.find(l => l.city === newCity);
                  setHubName(firstHub ? firstHub.hubName : '');
                }}
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
          <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
            {canDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-red-400 text-xs font-semibold">Are you sure?</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteVehicle && initialVehicle) {
                        onDeleteVehicle(initialVehicle.id);
                        onClose();
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Listing</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                {initialVehicle ? 'Save Changes' : (isAdmin ? 'Add Car' : 'Submit Car for Approval')}
              </button>
            </div>
          </div>

        </form>
        )}

      </div>
    </div>
  );
};
