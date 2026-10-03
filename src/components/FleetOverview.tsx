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

interface FleetOverviewProps {
  vehicles: Vehicle[];
  currentUser: UserProfile;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onStartBookingForVehicle: (vehicle: Vehicle) => void;
  onAddNewVehicle: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onUpdateStatus: (vehicleId: string, newStatus: VehicleStatus, reason: string) => void;
  onApproveVehicle?: (vehicleId: string) => void;
  onRejectVehicle?: (vehicleId: string, reason: string) => void;
}

export const FleetOverview: React.FC<FleetOverviewProps> = ({
  vehicles,
  currentUser,
  onSelectVehicle,
  onStartBookingForVehicle,
  onAddNewVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onUpdateStatus,
  onApproveVehicle,
  onRejectVehicle,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isNormalUserMode = currentUser.activeViewMode === 'renter';
  const isOwner = currentUser.role === 'vehicle_owner' && !isNormalUserMode;

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Strict Role Isolation: Owner sees only own vehicles!
  const scopedVehicles = useMemo(() => {
    if (isOwner) {
      return vehicles.filter(v => v.ownerId === currentUser.id);
    }
    if (isNormalUserMode) {
      return vehicles.filter(v => v.approvalStatus === 'approved' && v.status !== 'blocked');
    }
    return vehicles;
  }, [vehicles, isOwner, isNormalUserMode, currentUser.id]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isOwner ? 'My Registered Cars' : (isNormalUserMode ? 'Choose a Car to Rent' : 'All Cars on Platform')}
            </h2>
            <span className="font-mono text-xs text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
              {filteredVehicles.length} {filteredVehicles.length === 1 ? 'car' : 'cars'}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            {isOwner && 'Manage your cars, block dates for personal use, and set your rental rates.'}
            {isAdmin && 'Admin view: Check fitness/insurance dates, approve new cars, and set car status.'}
            {isNormalUserMode && 'Browse all verified cars available for your trip.'}
          </p>
        </div>

        {/* Add Car Button */}
        {!isNormalUserMode && (
          <button
            onClick={onAddNewVehicle}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors shadow-sm whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>{isAdmin ? 'Add New Car' : 'Add My Car for Rent'}</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by car name, number plate, or city..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/80 pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
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
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
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

      {/* Car Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVehicles.map(vehicle => {
          const isPending = vehicle.approvalStatus === 'pending_approval';
          const isPersonalBlocked = vehicle.blockedDates && vehicle.blockedDates.length > 0;

          return (
            <div
              key={vehicle.id}
              className="group rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden flex flex-col hover:border-neutral-700 transition-all shadow-lg"
            >
              {/* Image & Status Badge */}
              <div className="relative h-44 w-full bg-neutral-950 overflow-hidden">
                <img
                  src={vehicle.image}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Status Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                    vehicle.status === 'available' ? 'bg-emerald-500/80 text-white' :
                    vehicle.status === 'on_trip' ? 'bg-blue-500/80 text-white' :
                    vehicle.status === 'booked' ? 'bg-amber-500/80 text-white' :
                    vehicle.status === 'maintenance' ? 'bg-orange-500/80 text-white' :
                    'bg-red-500/80 text-white'
                  }`}>
                    {vehicle.status === 'available' ? 'Available' :
                     vehicle.status === 'on_trip' ? 'On Trip' :
                     vehicle.status === 'booked' ? 'Booked' :
                     vehicle.status === 'maintenance' ? 'In Workshop' : 'Blocked'}
                  </span>

                  {isPending && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-neutral-950">
                      Waiting for Approval
                    </span>
                  )}
                </div>

                {/* Daily Price Tag */}
                <div className="absolute bottom-3 right-3 rounded-lg bg-neutral-950/80 backdrop-blur-md px-2.5 py-1 border border-neutral-800 text-right">
                  <div className="text-xs font-bold text-emerald-400 font-mono">
                    ₹{vehicle.dailyRate.toLocaleString()} <span className="text-[10px] text-neutral-400 font-normal">/day</span>
                  </div>
                  <div className="text-[9px] text-neutral-400 font-mono">
                    {vehicle.kmAllowancePerDay} km free / day
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4 text-xs">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white text-sm">
                        {vehicle.make} {vehicle.model}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] text-neutral-300 bg-neutral-950 px-1.5 py-0.2 rounded border border-neutral-800">
                          {vehicle.licensePlate}
                        </span>
                        <span className="text-neutral-400 text-[11px]">
                          {vehicle.category} &middot; {vehicle.fuelType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Owner Name */}
                  {isAdmin && (
                    <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500">Car Owner:</span>
                      <span className="font-medium text-emerald-300 font-sans">
                        {vehicle.ownerName}
                      </span>
                    </div>
                  )}

                  {/* Location & KM */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-neutral-800/60 text-[11px] text-neutral-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                      <span className="truncate">{vehicle.currentLocation.city}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                      <span className="font-mono">{vehicle.odometer.toLocaleString()} km</span>
                    </div>
                  </div>

                  {/* Insurance & PUC Dates (Admin view) */}
                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-800/60 text-[10px] text-neutral-400">
                      <span>PUC till: <strong className="text-neutral-300">{vehicle.documents.pucExpiry}</strong></span>
                      <span>&middot;</span>
                      <span>Insurance: <strong className="text-neutral-300">{vehicle.documents.insuranceExpiry}</strong></span>
                    </div>
                  )}

                  {/* Personal Blocked Dates */}
                  {isPersonalBlocked && (
                    <div className="mt-2 p-1.5 rounded bg-neutral-950 border border-neutral-800 text-[10px] text-amber-400 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>Blocked for personal use on {vehicle.blockedDates?.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-2">
                  
                  {/* Customer Mode: Book Now */}
                  {isNormalUserMode ? (
                    <button
                      onClick={() => onStartBookingForVehicle(vehicle)}
                      disabled={vehicle.status !== 'available'}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold transition-colors disabled:opacity-50"
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
                            className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[11px] transition-colors"
                          >
                            Approve Car
                          </button>
                          <button
                            onClick={() => {
                              const r = prompt('Reason for rejecting car:');
                              if (r) onRejectVehicle(vehicle.id, r);
                            }}
                            className="py-1.5 px-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 font-medium text-[11px]"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {/* Standard Controls */}
                      {(!isPending || !isAdmin) && (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onEditVehicle(vehicle)}
                              className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                              title="Edit car details / price"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => {
                                  if (confirm(`Remove ${vehicle.make} ${vehicle.model} from platform?`)) {
                                    onDeleteVehicle(vehicle.id);
                                  }
                                }}
                                className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-red-500/10"
                                title="Delete car"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isAdmin && (
                              <select
                                value={vehicle.status}
                                onChange={e => {
                                  const reason = prompt(`Reason for setting status to ${e.target.value}:`);
                                  if (reason) {
                                    onUpdateStatus(vehicle.id, e.target.value as VehicleStatus, reason);
                                  }
                                }}
                                className="text-[10px] rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white focus:outline-none"
                              >
                                <option value="available">Set Available</option>
                                <option value="booked">Set Booked</option>
                                <option value="on_trip">Set On Trip</option>
                                <option value="maintenance">Set In Workshop</option>
                                <option value="blocked">Set Blocked</option>
                              </select>
                            )}

                            <button
                              onClick={() => onStartBookingForVehicle(vehicle)}
                              disabled={vehicle.status !== 'available'}
                              className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-[11px] disabled:opacity-40"
                            >
                              Book
                            </button>
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
