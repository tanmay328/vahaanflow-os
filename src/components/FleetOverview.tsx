import React, { useState, useMemo } from 'react';
import { 
  Vehicle, 
  VehicleStatus 
} from '../types/rental';
import { UserProfile } from '../types/auth';
import { 
  Car, 
  MapPin, 
  Gauge, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar
} from 'lucide-react';
import { cleanImageUrl } from '../utils/imageHelper';

interface FleetOverviewProps {
  vehicles: Vehicle[];
  currentUser: UserProfile;
  allUsers?: UserProfile[];
  onSelectVehicle: (vehicle: Vehicle) => void;
  onStartBookingForVehicle: (vehicle: Vehicle) => void;
  onAddNewVehicle: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onUpdateStatus: (vehicleId: string, newStatus: VehicleStatus, reason: string) => void;
  onApproveVehicle?: (vehicleId: string) => void;
  onRejectVehicle?: (vehicleId: string, reason: string) => void;
  theme?: 'dark' | 'light';
}

export const FleetOverview: React.FC<FleetOverviewProps> = ({
  vehicles,
  currentUser,
  allUsers,
  onSelectVehicle,
  onStartBookingForVehicle,
  onAddNewVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onUpdateStatus,
  onApproveVehicle,
  onRejectVehicle,
  theme = 'dark',
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isNormalUserMode = currentUser.activeViewMode === 'renter';
  const isOwner = currentUser.role === 'vehicle_owner' && !isNormalUserMode;

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Two-step delete confirmation (browser confirm()/prompt() are blocked in AI Studio's preview frame)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Strict Role Isolation: Owner sees only own vehicles! Suspending an owner hides their cars from customers.
  const scopedVehicles = useMemo(() => {
    if (isOwner) {
      return vehicles.filter(v => v.ownerId === currentUser.id);
    }
    if (isNormalUserMode) {
      const suspendedOwnerIds = new Set(
        (allUsers || []).filter(u => u.approvalStatus === 'suspended' || u.ownerDetails?.approvalStatus === 'suspended').map(u => u.id)
      );
      const suspendedOwnerEmails = new Set(
        (allUsers || []).filter(u => u.approvalStatus === 'suspended' || u.ownerDetails?.approvalStatus === 'suspended').map(u => u.email.toLowerCase())
      );

      return vehicles.filter(v => 
        v.approvalStatus === 'approved' && 
        v.status !== 'blocked' &&
        !suspendedOwnerIds.has(v.ownerId) &&
        !suspendedOwnerEmails.has((v.ownerEmail || '').toLowerCase())
      );
    }
    return vehicles;
  }, [vehicles, isOwner, isNormalUserMode, currentUser.id, allUsers]);

  const filteredVehicles = useMemo(() => {
    return scopedVehicles.filter(v => {
      const matchSearch = 
        v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.currentLocation.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = selectedStatus === 'all' || v.status === selectedStatus;
      const matchCategory = selectedCategory === 'all' || v.category === selectedCategory;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [scopedVehicles, searchQuery, selectedStatus, selectedCategory]);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-xl font-extrabold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {isOwner ? 'My Registered Cars' : (isNormalUserMode ? 'Choose a Car to Rent' : 'All Cars on Platform')}
            </h2>
            <span className={`font-mono text-xs px-2 py-0.5 rounded border ${
              theme === 'light' ? 'text-slate-700 bg-slate-100 border-slate-200' : 'text-neutral-400 bg-neutral-900 border-neutral-800'
            }`}>
              {filteredVehicles.length} {filteredVehicles.length === 1 ? 'car' : 'cars'}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
            {isOwner && 'Manage your cars, block dates for personal use, and set your rental rates.'}
            {isAdmin && 'Admin view: Check fitness/insurance dates, approve new cars, and set car status.'}
            {isNormalUserMode && 'Browse all verified cars available for your trip.'}
          </p>
        </div>
      </div>

      {/* Filters Bar - only displayed when cars exist */}
      {scopedVehicles.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-2.5 h-4 w-4 ${theme === 'light' ? 'text-slate-400' : 'text-neutral-500'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by car name, number plate, or city..."
              className={`w-full rounded-lg border pl-9 pr-3 py-2 text-xs transition-colors focus:outline-none ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                  : 'bg-neutral-900/80 border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className={`rounded-lg border px-3 py-2 text-xs focus:outline-none ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-900 shadow-sm focus:border-emerald-600'
                  : 'bg-neutral-900 border-neutral-800 text-white focus:border-emerald-500'
              }`}
            >
              <option value="all">All Status</option>
              <option value="available">Available (Ready)</option>
              <option value="booked">Booked (Upcoming)</option>
              <option value="on_trip">On Trip (With Customer)</option>
              <option value="maintenance">In Workshop</option>
              <option value="blocked">Blocked</option>
            </select>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className={`rounded-lg border px-3 py-2 text-xs focus:outline-none ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-900 shadow-sm focus:border-emerald-600'
                  : 'bg-neutral-900 border-neutral-800 text-white focus:border-emerald-500'
              }`}
            >
              <option value="all">All Types</option>
              <option value="SUV">SUV</option>
              <option value="MPV">MPV (7 Seater)</option>
              <option value="Sedan">Sedan</option>
              <option value="Compact EV">Electric EV</option>
              <option value="Off-Roader">4x4 Off-Roader</option>
              <option value="Luxury Van">Van</option>
            </select>
          </div>
        </div>
      )}

      {/* Empty State when no cars */}
      {scopedVehicles.length === 0 && (
        <div className={`text-center py-16 px-4 rounded-2xl border ${
          theme === 'light' ? 'border-slate-200 bg-white' : 'border-neutral-800 bg-neutral-900/40'
        }`}>
          <Car className={`mx-auto h-12 w-12 mb-3 ${theme === 'light' ? 'text-slate-300' : 'text-neutral-600'}`} />
          <h3 className={`text-base font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            {isOwner ? 'No cars registered yet' : 'No cars available'}
          </h3>
          <p className={`text-xs mt-1 max-w-sm mx-auto ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
            {isOwner 
              ? 'Click the "+ Add Car" button in the top navigation bar to register your vehicle for rent.' 
              : 'There are currently no vehicles on the platform.'}
          </p>
        </div>
      )}

      {/* Car Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVehicles.map(vehicle => {
          const isPending = vehicle.approvalStatus === 'pending_approval';
          const isPersonalBlocked = vehicle.blockedDates && vehicle.blockedDates.length > 0;

          return (
            <div
              key={vehicle.id}
              className={`group rounded-2xl border overflow-hidden flex flex-col transition-all ${
                theme === 'light'
                  ? 'bg-white border-slate-200/90 text-slate-900 shadow-sm hover:shadow-md hover:border-slate-300'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-100 shadow-lg hover:border-neutral-700'
              }`}
            >
              {/* Image & Status Badge */}
              <div className={`relative h-44 w-full overflow-hidden ${theme === 'light' ? 'bg-slate-100' : 'bg-neutral-950'}`}>
                <img
                  src={cleanImageUrl(vehicle.image)}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Status Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                  <span 
                    style={{ color: '#ffffff' }}
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm text-white ${
                      vehicle.status === 'available' ? 'bg-emerald-600' :
                      vehicle.status === 'on_trip' ? 'bg-blue-600' :
                      vehicle.status === 'booked' ? 'bg-amber-600' :
                      vehicle.status === 'maintenance' ? 'bg-orange-600' :
                      'bg-rose-600'
                    }`}
                  >
                    {vehicle.status === 'available' ? 'Available' :
                     vehicle.status === 'on_trip' ? 'On Trip' :
                     vehicle.status === 'booked' ? 'Booked' :
                     vehicle.status === 'maintenance' ? 'In Workshop' : 'Blocked'}
                  </span>

                  {isPending && (
                    <span 
                      style={{ color: '#ffffff' }}
                      className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm"
                    >
                      Waiting for Approval
                    </span>
                  )}
                </div>

                {/* Daily Price Tag */}
                <div className={`absolute bottom-3 right-3 rounded-xl px-2.5 py-1 text-right shadow-md border ${
                  theme === 'light'
                    ? 'bg-white/95 text-slate-900 border-slate-200 backdrop-blur-md'
                    : 'bg-neutral-950/80 text-emerald-400 border-neutral-800 backdrop-blur-md'
                }`}>
                  <div className={`text-xs font-extrabold font-mono ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    ₹{(vehicle.dailyRate ?? vehicle.suggestedDailyRate ?? 3500).toLocaleString()} <span className={`text-[10px] font-normal ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>/day</span>
                  </div>
                  <div className={`text-[9px] font-mono ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                    {vehicle.kmAllowancePerDay ?? 300} km free / day
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4 text-xs">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`font-extrabold text-sm ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        {vehicle.make} {vehicle.model}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`font-mono text-[11px] px-1.5 py-0.2 rounded border ${
                          theme === 'light' ? 'text-slate-800 bg-slate-100 border-slate-200' : 'text-neutral-300 bg-neutral-950 border-neutral-800'
                        }`}>
                          {vehicle.licensePlate || 'N/A'}
                        </span>
                        <span className={`text-[11px] ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                          {vehicle.category} &middot; {vehicle.fuelType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Owner Name */}
                  {isAdmin && (
                    <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[11px] ${
                      theme === 'light' ? 'border-slate-100' : 'border-neutral-800/80'
                    }`}>
                      <span className={theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}>Car Owner:</span>
                      <span className={`font-semibold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-300'}`}>
                        {vehicle.ownerName || 'Verified Fleet Owner'}
                      </span>
                    </div>
                  )}

                  {/* Location & KM */}
                  <div className={`grid grid-cols-2 gap-2 mt-3 pt-2 border-t text-[11px] ${
                    theme === 'light' ? 'border-slate-100 text-slate-600' : 'border-neutral-800/60 text-neutral-400'
                  }`}>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className={`h-3.5 w-3.5 shrink-0 ${theme === 'light' ? 'text-slate-400' : 'text-neutral-500'}`} />
                      <span className="truncate">{vehicle.currentLocation?.city || 'Bengaluru'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Gauge className={`h-3.5 w-3.5 shrink-0 ${theme === 'light' ? 'text-slate-400' : 'text-neutral-500'}`} />
                      <span className="font-mono">{(vehicle.odometer || 0).toLocaleString()} km</span>
                    </div>
                  </div>

                  {/* Insurance & PUC Dates (Admin view) */}
                  {isAdmin && (
                    <div className={`flex items-center gap-2 mt-2 pt-2 border-t text-[10px] ${
                      theme === 'light' ? 'border-slate-100 text-slate-500' : 'border-neutral-800/60 text-neutral-400'
                    }`}>
                      <span>PUC till: <strong className={theme === 'light' ? 'text-slate-800' : 'text-neutral-300'}>{vehicle.documents?.pucExpiry || 'N/A'}</strong></span>
                      <span>&middot;</span>
                      <span>Insurance: <strong className={theme === 'light' ? 'text-slate-800' : 'text-neutral-300'}>{vehicle.documents?.insuranceExpiry || 'N/A'}</strong></span>
                    </div>
                  )}

                  {/* Personal Blocked Dates */}
                  {isPersonalBlocked && (
                    <div className={`mt-2 p-1.5 rounded text-[10px] flex items-center gap-1.5 border ${
                      theme === 'light'
                        ? 'bg-amber-50 border-amber-200 text-amber-800'
                        : 'bg-neutral-950 border-neutral-800 text-amber-400'
                    }`}>
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>Blocked for personal use on {vehicle.blockedDates?.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className={`pt-2.5 border-t flex items-center justify-between gap-2 ${
                  theme === 'light' ? 'border-slate-100' : 'border-neutral-800'
                }`}>
                  
                  {/* Customer Mode: Book Now */}
                  {isNormalUserMode ? (
                    <button
                      onClick={() => onStartBookingForVehicle(vehicle)}
                      disabled={vehicle.status !== 'available'}
                      style={{ color: '#ffffff' }}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 text-white ${
                        vehicle.status === 'available'
                          ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]'
                          : 'bg-emerald-600/70 opacity-70 cursor-not-allowed'
                      }`}
                    >
                      {vehicle.status === 'available' ? 'Book This Car' : 'Currently Unavailable'}
                    </button>
                  ) : (
                    <>
                      {/* Admin Pending Approval */}
                      {isAdmin && isPending && onApproveVehicle && onRejectVehicle && (
                        <div className="flex items-center gap-1.5 w-full">
                          <button
                            onClick={() => onApproveVehicle(vehicle.id)}
                            style={{ color: '#ffffff' }}
                            className="flex-1 py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
                          >
                            Approve Car
                          </button>
                          <button
                            onClick={() => onRejectVehicle(vehicle.id, 'Rejected by admin')}
                            style={{ color: '#ffffff' }}
                            className="py-2 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {/* Standard Controls */}
                      {(!isPending || !isAdmin) && (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onEditVehicle(vehicle)}
                              style={{ color: '#ffffff' }}
                              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                              title="Edit car details, rates, blocked dates, or photos"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-white" />
                              <span>{isOwner ? 'Manage / Edit Car' : 'Edit Car'}</span>
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => {
                                  if (pendingDeleteId === vehicle.id) {
                                    onDeleteVehicle(vehicle.id);
                                    setPendingDeleteId(null);
                                  } else {
                                    setPendingDeleteId(vehicle.id);
                                    setTimeout(() => setPendingDeleteId(null), 4000);
                                  }
                                }}
                                style={{ color: '#ffffff' }}
                                className="p-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
                                title={pendingDeleteId === vehicle.id ? 'Click again to confirm delete' : 'Remove car from platform'}
                              >
                                {pendingDeleteId === vehicle.id ? (
                                  <span className="text-[10px] font-bold px-1" style={{ color: '#ffffff' }}>Sure?</span>
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5 text-white" />
                                )}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isAdmin && (
                              <select
                                value={vehicle.status}
                                onChange={e => {
                                  onUpdateStatus(
                                    vehicle.id,
                                    e.target.value as VehicleStatus,
                                    'Changed by admin from fleet list'
                                  );
                                }}
                                className={`text-[10px] font-semibold rounded border px-2 py-1 focus:outline-none ${
                                  theme === 'light'
                                    ? 'border-slate-300 bg-white text-slate-800 shadow-sm'
                                    : 'border-neutral-700 bg-neutral-950 text-white'
                                }`}
                              >
                                <option value="available">Set Available</option>
                                <option value="booked">Set Booked</option>
                                <option value="on_trip">Set On Trip</option>
                                <option value="maintenance">Set In Workshop</option>
                                <option value="blocked">Set Blocked</option>
                              </select>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
