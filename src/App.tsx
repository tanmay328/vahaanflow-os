import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Vehicle, 
  Booking, 
  AuditRecord, 
  MaintenanceLog, 
  PayoutRecord,
  DisputeRecord,
  PlatformSettings,
  VehicleStatus,
  PenaltyItem
} from './types/rental';
import { UserProfile } from './types/auth';
import { RentalStorageService } from './services/rentalStorage';
import { AuthService } from './services/authService';
import { Navbar } from './components/Navbar';
import { FleetOverview } from './components/FleetOverview';
import { BookingManager } from './components/BookingManager';
import { OwnerEarningsView } from './components/OwnerEarningsView';
import { AdminPayoutsDisputes } from './components/AdminPayoutsDisputes';
import { AuditLogViewer } from './components/AuditLogViewer';
import { MaintenanceLedger } from './components/MaintenanceLedger';
import { LoginPage } from './components/LoginPage';

// Modals
import { VehicleFormModal } from './components/modals/VehicleFormModal';
import { CheckOutModal } from './components/modals/CheckOutModal';
import { CheckInModal } from './components/modals/CheckInModal';
import { NewBookingModal } from './components/modals/NewBookingModal';
import { RentalAgreementModal } from './components/modals/RentalAgreementModal';
import { ReturnDossierModal } from './components/modals/ReturnDossierModal';
import { DeveloperManualModal } from './components/modals/DeveloperManualModal';

import { CheckCircle2, AlertCircle, Info, Lock } from 'lucide-react';

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => AuthService.getCurrentUser());
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => AuthService.getUsers());

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'fleet' | 'bookings' | 'earnings' | 'payouts' | 'audit' | 'maintenance'>('fleet');

  // Core Data State
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => RentalStorageService.getVehicles());
  const [bookings, setBookings] = useState<Booking[]>(() => RentalStorageService.getBookings());
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>(() => RentalStorageService.getAuditLogs());
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>(() => RentalStorageService.getMaintenanceLogs());
  const [payouts, setPayouts] = useState<PayoutRecord[]>(() => RentalStorageService.getPayouts());
  const [disputes, setDisputes] = useState<DisputeRecord[]>(() => RentalStorageService.getDisputes());
  const [settings, setSettings] = useState<PlatformSettings>(() => RentalStorageService.getSettings());

  // Demo Pulse: DEFAULT OFF as explicitly requested (no background fastag/telemetry spam)
  const [isDemoPulseActive, setIsDemoPulseActive] = useState<boolean>(false);

  // Notification Toast
  const [activeToast, setActiveToast] = useState<{ title: string; message: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const showToast = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setActiveToast({ title, message, type });
    setTimeout(() => {
      setActiveToast(prev => (prev?.title === title ? null : prev));
    }, 4000);
  }, []);

  // Modal Targets
  const [vehicleFormOpen, setVehicleFormOpen] = useState<boolean>(false);
  const [editingVehicleTarget, setEditingVehicleTarget] = useState<Vehicle | null>(null);
  const [newBookingModalOpen, setNewBookingModalOpen] = useState<boolean>(false);
  const [preselectedVehicleForBooking, setPreselectedVehicleForBooking] = useState<Vehicle | null>(null);
  const [checkOutBookingTarget, setCheckOutBookingTarget] = useState<Booking | null>(null);
  const [checkInBookingTarget, setCheckInBookingTarget] = useState<Booking | null>(null);
  const [agreementBookingTarget, setAgreementBookingTarget] = useState<Booking | null>(null);
  const [returnDossierBookingTarget, setReturnDossierBookingTarget] = useState<Booking | null>(null);
  const [devManualModalOpen, setDevManualModalOpen] = useState<boolean>(false);

  // Real-time Cloud Firestore synchronization
  useEffect(() => {
    const unsubStorage = RentalStorageService.initFirestoreSync({
      onVehicles: (v) => setVehicles(v),
      onBookings: (b) => setBookings(b),
      onAuditLogs: (a) => setAuditLogs(a),
      onMaintenance: (m) => setMaintenance(m),
      onPayouts: (p) => setPayouts(p),
      onDisputes: (d) => setDisputes(d),
    });

    const unsubUsers = AuthService.initFirestoreUsersSync((users) => {
      setAllUsers(users);
      // Keep currentUser refreshed
      const current = AuthService.getCurrentUser();
      if (current) {
        const found = users.find(u => u.id === current.id);
        if (found) setCurrentUser(found);
      }
    });

    return () => {
      unsubStorage();
      unsubUsers();
    };
  }, []);

  // Handlers for Session
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setActiveTab('fleet');
    showToast(`Welcome, ${user.name}`, `Signed in as ${user.role === 'admin' ? 'Admin' : 'Car Owner'}.`, 'success');
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
    showToast('Logged Out', 'You have been logged out safely.', 'info');
  };

  const handleSwitchUser = (userId: string) => {
    const switched = AuthService.switchUser(userId);
    if (switched) {
      setCurrentUser(switched);
      setActiveTab('fleet');
      showToast('Switched Profile', `Now active as ${switched.name} (${switched.role === 'admin' ? 'Admin' : 'Car Owner'}).`, 'info');
    }
  };

  // Toggle Normal Customer View ("for both owner and admin: can use the app as normal user")
  const handleToggleNormalUserMode = () => {
    if (!currentUser) return;
    const targetMode = currentUser.activeViewMode === 'renter' ? currentUser.role : 'renter';
    const updated = AuthService.toggleViewMode(currentUser, targetMode);
    setCurrentUser(updated);
    setActiveTab('fleet');
    if (targetMode === 'renter') {
      showToast('Customer Mode Active', 'You can now browse cars and book as a customer.', 'info');
    } else {
      showToast('Returned to Dashboard', `Back to ${currentUser.role === 'admin' ? 'Admin' : 'Car Owner'} dashboard.`, 'success');
    }
  };

  // VEHICLE OPERATIONS
  const handleSaveVehicle = async (vehicle: Vehicle) => {
    await RentalStorageService.saveVehicle(vehicle);
    await RentalStorageService.logAudit({
      category: 'VEHICLE',
      action: editingVehicleTarget ? 'Vehicle Updated' : 'New Vehicle Registered',
      summary: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate}) saved by ${currentUser?.name}. Status: ${vehicle.approvalStatus}.`,
      actor: {
        id: currentUser?.id || 'sys',
        name: currentUser?.name || 'User',
        role: currentUser?.role || 'admin',
      },
      vehiclePlate: vehicle.licensePlate,
      severity: 'info',
    });
    setEditingVehicleTarget(null);
    showToast('Vehicle Saved', `${vehicle.make} ${vehicle.model} saved to fleet.`, 'success');
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    const target = vehicles.find(v => v.id === vehicleId);
    await RentalStorageService.deleteVehicle(vehicleId);
    if (target) {
      await RentalStorageService.logAudit({
        category: 'VEHICLE',
        action: 'Vehicle Removed from Platform',
        summary: `${target.make} ${target.model} (${target.licensePlate}) removed by Admin.`,
        actor: {
          id: currentUser?.id || 'admin',
          name: currentUser?.name || 'Admin',
          role: 'admin',
        },
        vehiclePlate: target.licensePlate,
        severity: 'warning',
      });
    }
    showToast('Vehicle Deleted', 'Vehicle removed from platform inventory.', 'info');
  };

  const handleUpdateVehicleStatus = async (vehicleId: string, newStatus: VehicleStatus, reason: string) => {
    const target = vehicles.find(v => v.id === vehicleId);
    if (!target) return;

    const oldStatus = target.status;
    const updated: Vehicle = { ...target, status: newStatus };
    await RentalStorageService.saveVehicle(updated);

    await RentalStorageService.logAudit({
      category: 'VEHICLE',
      action: 'Operational Status Altered',
      summary: `${target.make} ${target.model} (${target.licensePlate}) status changed from ${oldStatus} to ${newStatus}. Reason: "${reason}".`,
      actor: {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Admin',
        role: 'admin',
      },
      vehiclePlate: target.licensePlate,
      changes: [{ field: 'status', before: oldStatus, after: newStatus }],
      severity: 'notice',
    });

    showToast('Status Updated', `${target.licensePlate} set to ${newStatus}.`, 'success');
  };

  const handleApproveVehicle = async (vehicleId: string) => {
    const target = vehicles.find(v => v.id === vehicleId);
    if (!target) return;
    const updated: Vehicle = { ...target, approvalStatus: 'approved', status: 'available' };
    await RentalStorageService.saveVehicle(updated);

    await RentalStorageService.logAudit({
      category: 'VEHICLE',
      action: 'Vehicle Listing Approved by Admin',
      summary: `Owner listing for ${target.make} ${target.model} (${target.licensePlate}) approved for platform rentals.`,
      actor: {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Admin',
        role: 'admin',
      },
      vehiclePlate: target.licensePlate,
      severity: 'info',
    });
    showToast('Vehicle Approved', `${target.licensePlate} is now live for rental bookings.`, 'success');
  };

  const handleRejectVehicle = async (vehicleId: string, reason: string) => {
    const target = vehicles.find(v => v.id === vehicleId);
    if (!target) return;
    const updated: Vehicle = { ...target, approvalStatus: 'rejected', rejectionReason: reason, status: 'blocked' };
    await RentalStorageService.saveVehicle(updated);

    await RentalStorageService.logAudit({
      category: 'VEHICLE',
      action: 'Vehicle Listing Rejected by Admin',
      summary: `Owner listing for ${target.make} ${target.model} rejected. Reason: "${reason}".`,
      actor: {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Admin',
        role: 'admin',
      },
      vehiclePlate: target.licensePlate,
      severity: 'warning',
    });
    showToast('Vehicle Rejected', `Listing rejected: ${reason}`, 'warning');
  };

  // BOOKING OPERATIONS
  const handleCreateBooking = async (newBooking: Booking) => {
    await RentalStorageService.saveBooking(newBooking);

    // Update vehicle status to booked
    const targetVeh = vehicles.find(v => v.id === newBooking.vehicleId);
    if (targetVeh) {
      await RentalStorageService.saveVehicle({ ...targetVeh, status: 'booked' });
    }

    // Create pending payout record for the vehicle owner
    const newPayout: PayoutRecord = {
      id: `pay-${Date.now()}`,
      ownerId: newBooking.ownerId,
      ownerName: newBooking.ownerName,
      ownerUpiOrBank: 'UPI/Bank on file',
      bookingId: newBooking.id,
      vehiclePlate: newBooking.vehicle.licensePlate,
      grossAmount: newBooking.totalRental,
      platformCommission: newBooking.platformCommission,
      netPayout: newBooking.ownerNetShare,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await RentalStorageService.savePayout(newPayout);

    await RentalStorageService.logAudit({
      category: 'BOOKING',
      action: 'Reservation Confirmed',
      summary: `Booking ${newBooking.bookingCode} confirmed for ${newBooking.customer.name} on ${newBooking.vehicle.make} ${newBooking.vehicle.model}. Deposit escrow: ₹${newBooking.depositAmount}.`,
      actor: {
        id: currentUser?.id || 'sys',
        name: currentUser?.name || 'Customer',
        role: currentUser?.role || 'admin',
      },
      vehiclePlate: newBooking.vehicle.licensePlate,
      bookingCode: newBooking.bookingCode,
      severity: 'info',
    });

    showToast('Reservation Created', `Booking ${newBooking.bookingCode} recorded.`, 'success');
  };

  const handleOwnerApproveBooking = async (bookingId: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;
    const updated: Booking = { ...target, ownerApprovalStatus: 'approved' };
    await RentalStorageService.saveBooking(updated);

    await RentalStorageService.logAudit({
      category: 'BOOKING',
      action: 'Booking Approved by Vehicle Owner',
      summary: `Owner ${currentUser?.name} approved reservation ${target.bookingCode}.`,
      actor: {
        id: currentUser?.id || 'owner',
        name: currentUser?.name || 'Owner',
        role: 'vehicle_owner',
      },
      bookingCode: target.bookingCode,
      severity: 'info',
    });
    showToast('Booking Approved', `You approved reservation ${target.bookingCode}.`, 'success');
  };

  const handleOwnerDeclineBooking = async (bookingId: string, reason: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;
    const updated: Booking = { 
      ...target, 
      status: 'cancelled', 
      ownerApprovalStatus: 'declined', 
      ownerApprovalNotes: reason 
    };
    await RentalStorageService.saveBooking(updated);

    // Free the car
    const veh = vehicles.find(v => v.id === target.vehicleId);
    if (veh) await RentalStorageService.saveVehicle({ ...veh, status: 'available' });

    await RentalStorageService.logAudit({
      category: 'BOOKING',
      action: 'Booking Declined by Vehicle Owner',
      summary: `Owner declined ${target.bookingCode}. Reason: "${reason}". Vehicle released to available.`,
      actor: {
        id: currentUser?.id || 'owner',
        name: currentUser?.name || 'Owner',
        role: 'vehicle_owner',
      },
      bookingCode: target.bookingCode,
      severity: 'warning',
    });
    showToast('Booking Declined', `Reservation cancelled. Reason: ${reason}`, 'info');
  };

  // CHECK-OUT DISPATCH HANDOVER
  const handleSubmitCheckOut = async (bookingId: string, details: any) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;

    const updatedBooking: Booking = {
      ...target,
      status: 'active',
      dispatchCheckOut: {
        dispatchedAt: new Date().toISOString(),
        dispatchedBy: details.dispatchedBy,
        startOdometer: details.startOdometer,
        startFuelPct: details.startFuelPct,
        photos: details.photos,
        inspectionNotes: details.inspectionNotes,
        customerSignature: details.customerSignature,
      },
    };
    await RentalStorageService.saveBooking(updatedBooking);

    // Set vehicle status to on_trip
    const targetVeh = vehicles.find(v => v.id === target.vehicleId);
    if (targetVeh) {
      await RentalStorageService.saveVehicle({
        ...targetVeh,
        status: 'on_trip',
        odometer: details.startOdometer,
        fuelOrBatteryPct: details.startFuelPct,
      });
    }

    await RentalStorageService.logAudit({
      category: 'CHECK_OUT',
      action: 'Vehicle Dispatched on Trip',
      summary: `${target.vehicle.make} ${target.vehicle.model} (${target.vehicle.licensePlate}) handed over to ${target.customer.name}. Start Odo: ${details.startOdometer} km, Fuel: ${details.startFuelPct}%.`,
      actor: {
        id: currentUser?.id || 'admin',
        name: details.dispatchedBy,
        role: 'admin',
      },
      vehiclePlate: target.vehicle.licensePlate,
      bookingCode: target.bookingCode,
      severity: 'info',
    });

    setCheckOutBookingTarget(null);
    showToast('Dispatch Completed', `Keys handed over to ${target.customer.name}.`, 'success');
  };

  // CHECK-IN RETURN INSPECTION & SETTLEMENT
  const handleSubmitCheckIn = async (bookingId: string, details: any) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;

    const updatedBooking: Booking = {
      ...target,
      status: 'completed',
      returnCheckIn: {
        returnedAt: new Date().toISOString(),
        receivedBy: details.receivedBy,
        endOdometer: details.endOdometer,
        endFuelPct: details.endFuelPct,
        photos: details.photos,
        excessKm: details.excessKm,
        excessKmCharge: details.excessKmCharge,
        fuelDeficitPct: details.fuelDeficitPct,
        fuelPenaltyCharge: details.fuelPenaltyCharge,
        damageCharge: details.damageCharge,
        damageNotes: details.damageNotes,
        manualTollExpenses: details.manualTollExpenses,
        tollReceiptNotes: details.tollReceiptNotes,
        penalties: details.penalties,
        totalDeductions: details.totalDeductions,
        netDepositRefund: details.netDepositRefund,
        depositSettled: true,
        settlementDate: new Date().toISOString(),
        settlementAdjustmentNotes: `Refund of ₹${details.netDepositRefund} authorized after ₹${details.totalDeductions} total deductions.`,
      },
    };
    await RentalStorageService.saveBooking(updatedBooking);

    // Free the vehicle and update odometer
    const targetVeh = vehicles.find(v => v.id === target.vehicleId);
    if (targetVeh) {
      await RentalStorageService.saveVehicle({
        ...targetVeh,
        status: 'available',
        odometer: details.endOdometer,
        fuelOrBatteryPct: details.endFuelPct,
      });
    }

    await RentalStorageService.logAudit({
      category: 'CHECK_IN',
      action: 'Vehicle Return & Settlement Finalized',
      summary: `${target.vehicle.make} returned. Ending Odo: ${details.endOdometer} km. Net deposit refund: ₹${details.netDepositRefund} (Deductions: ₹${details.totalDeductions}).`,
      actor: {
        id: currentUser?.id || 'admin',
        name: details.receivedBy,
        role: 'admin',
      },
      vehiclePlate: target.vehicle.licensePlate,
      bookingCode: target.bookingCode,
      severity: 'info',
    });

    setCheckInBookingTarget(null);
    setReturnDossierBookingTarget(updatedBooking);
    showToast('Check-In Completed', `Deposit settlement executed. Net refund: ₹${details.netDepositRefund}.`, 'success');
  };

  // KYC OPERATIONS (Admin Power)
  const handleApproveKYC = async (bookingId: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;
    const updated: Booking = {
      ...target,
      customer: { ...target.customer, kycStatus: 'verified' },
    };
    await RentalStorageService.saveBooking(updated);
    showToast('KYC Approved', `Verified documents for ${target.customer.name}.`, 'success');
  };

  const handleRejectKYC = async (bookingId: string, reason: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;
    const updated: Booking = {
      ...target,
      customer: { ...target.customer, kycStatus: 'rejected' },
    };
    await RentalStorageService.saveBooking(updated);

    await RentalStorageService.logAudit({
      category: 'KYC',
      action: 'Renter KYC Rejected',
      summary: `Admin rejected KYC documents for ${target.customer.name}. Reason: "${reason}".`,
      actor: { id: currentUser?.id || 'admin', name: currentUser?.name || 'Admin', role: 'admin' },
      bookingCode: target.bookingCode,
      severity: 'warning',
    });
    showToast('KYC Rejected', `Rejected KYC for ${target.customer.name}: ${reason}`, 'warning');
  };

  const handleBlacklistRenter = async (bookingId: string, reason: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;

    await RentalStorageService.logAudit({
      category: 'KYC',
      action: 'Customer Blacklisted & Suspended',
      summary: `Renter ${target.customer.name} (${target.customer.email}) suspended from platform by Admin. Reason: "${reason}".`,
      actor: { id: currentUser?.id || 'admin', name: currentUser?.name || 'Admin', role: 'admin' },
      bookingCode: target.bookingCode,
      severity: 'critical',
    });
    showToast('Customer Suspended', `${target.customer.name} has been blacklisted.`, 'warning');
  };

  // DISBURSING OWNER PAYOUTS (Admin Power)
  const handleExecutePayout = async (payoutId: string, transactionRef: string) => {
    const target = payouts.find(p => p.id === payoutId);
    if (!target) return;

    const updated: PayoutRecord = {
      ...target,
      status: 'paid',
      paidAt: new Date().toISOString(),
      transactionRef,
    };
    await RentalStorageService.savePayout(updated);

    // Also update associated booking payoutStatus
    const linkedBooking = bookings.find(b => b.id === target.bookingId);
    if (linkedBooking) {
      await RentalStorageService.saveBooking({
        ...linkedBooking,
        payoutStatus: 'paid',
        payoutDate: new Date().toISOString(),
        payoutRef: transactionRef,
      });
    }

    await RentalStorageService.logAudit({
      category: 'PAYOUT',
      action: 'Owner Share Disbursed',
      summary: `Transferred ₹${target.netPayout} to ${target.ownerName} for booking ${target.bookingId}. Ref: ${transactionRef}.`,
      actor: {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Admin',
        role: 'admin',
      },
      severity: 'notice',
    });

    showToast('Payout Disbursed', `Transferred ₹${target.netPayout} to ${target.ownerName}.`, 'success');
  };

  // DISPUTES
  const handleReportDispute = async (title: string, description: string, bookingId?: string) => {
    const newDispute: DisputeRecord = {
      id: `disp-${Date.now()}`,
      bookingId: bookingId || 'General',
      raisedBy: currentUser?.role === 'admin' ? 'admin' : 'owner',
      reporterId: currentUser?.id || 'unknown',
      reporterName: currentUser?.name || 'Vehicle Owner',
      title,
      description,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    await RentalStorageService.saveDispute(newDispute);

    await RentalStorageService.logAudit({
      category: 'DISPUTE',
      action: 'Dispute Ticket Raised',
      summary: `Ticket "${title}" filed by ${currentUser?.name}.`,
      actor: { id: currentUser?.id || 'usr', name: currentUser?.name || 'Owner', role: currentUser?.role || 'vehicle_owner' },
      severity: 'warning',
    });

    showToast('Dispute Reported', 'Your ticket has been sent to platform administration for review.', 'info');
  };

  const handleResolveDispute = async (disputeId: string, resolution: string) => {
    const target = disputes.find(d => d.id === disputeId);
    if (!target) return;

    const updated: DisputeRecord = {
      ...target,
      status: 'resolved',
      resolutionNotes: resolution,
      resolvedAt: new Date().toISOString(),
      resolvedBy: currentUser?.name || 'Platform Admin',
    };
    await RentalStorageService.saveDispute(updated);

    await RentalStorageService.logAudit({
      category: 'DISPUTE',
      action: 'Dispute Resolved by Admin',
      summary: `Ticket "${target.title}" resolved. Outcome: "${resolution}".`,
      actor: { id: currentUser?.id || 'admin', name: currentUser?.name || 'Admin', role: 'admin' },
      severity: 'info',
    });

    showToast('Dispute Resolved', 'Resolution recorded and communicated to reporter.', 'success');
  };

  // If not logged in, render LoginPage
  if (!currentUser) {
    return (
      <>
        <LoginPage 
          onLoginSuccess={handleLoginSuccess}
          onOpenDeveloperManual={() => setDevManualModalOpen(true)}
        />
        <DeveloperManualModal
          isOpen={devManualModalOpen}
          onClose={() => setDevManualModalOpen(false)}
        />
      </>
    );
  }

  // Filter owners for vehicle assignment
  const allOwners = allUsers.filter(u => u.role === 'vehicle_owner');

  // Scoped bookings for owner
  const ownerBookings = bookings.filter(b => b.ownerId === currentUser.id);
  const ownerPayoutsList = payouts.filter(p => p.ownerId === currentUser.id);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      
      {/* Top Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        allUsers={allUsers}
        onOpenNewBooking={() => {
          setPreselectedVehicleForBooking(null);
          setNewBookingModalOpen(true);
        }}
        onOpenNewVehicle={() => {
          setEditingVehicleTarget(null);
          setVehicleFormOpen(true);
        }}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        onToggleNormalUserMode={handleToggleNormalUserMode}
        onOpenDeveloperManual={() => setDevManualModalOpen(true)}
        isDemoPulseActive={isDemoPulseActive}
        setIsDemoPulseActive={setIsDemoPulseActive}
        auditCount={auditLogs.length}
      />

      {/* Normal User Mode Banner */}
      {currentUser.activeViewMode === 'renter' && (
        <div className="border-b border-blue-500/20 bg-blue-500/5 px-4 py-2 text-xs">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-neutral-300">
                You are currently in <strong className="text-white">Customer Mode (Rent a Car)</strong>.
              </span>
            </div>
            <button
              onClick={handleToggleNormalUserMode}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline"
            >
              Back to {currentUser.role === 'admin' ? 'Admin' : 'Car Owner'} Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        
        {/* TAB 1: FLEET OVERVIEW */}
        {activeTab === 'fleet' && (
          <FleetOverview
            vehicles={vehicles}
            currentUser={currentUser}
            onSelectVehicle={(veh) => {
              setEditingVehicleTarget(veh);
              setVehicleFormOpen(true);
            }}
            onStartBookingForVehicle={(veh) => {
              setPreselectedVehicleForBooking(veh);
              setNewBookingModalOpen(true);
            }}
            onAddNewVehicle={() => {
              setEditingVehicleTarget(null);
              setVehicleFormOpen(true);
            }}
            onEditVehicle={(veh) => {
              setEditingVehicleTarget(veh);
              setVehicleFormOpen(true);
            }}
            onDeleteVehicle={handleDeleteVehicle}
            onUpdateStatus={handleUpdateVehicleStatus}
            onApproveVehicle={currentUser.role === 'admin' ? handleApproveVehicle : undefined}
            onRejectVehicle={currentUser.role === 'admin' ? handleRejectVehicle : undefined}
          />
        )}

        {/* TAB 2: BOOKINGS */}
        {activeTab === 'bookings' && (
          <BookingManager
            bookings={bookings}
            currentUser={currentUser}
            onOpenCheckOut={(b) => setCheckOutBookingTarget(b)}
            onOpenCheckIn={(b) => setCheckInBookingTarget(b)}
            onViewAgreement={(b) => setAgreementBookingTarget(b)}
            onCancelBooking={(bId, r) => {
              const b = bookings.find(item => item.id === bId);
              if (b) {
                RentalStorageService.saveBooking({ ...b, status: 'cancelled' });
                showToast('Booking Cancelled', `Reservation cancelled. Reason: ${r}`, 'info');
              }
            }}
            onOpenNewBooking={() => setNewBookingModalOpen(true)}
            onOpenReturnDossier={(b) => setReturnDossierBookingTarget(b)}
            onOwnerApproveBooking={handleOwnerApproveBooking}
            onOwnerDeclineBooking={handleOwnerDeclineBooking}
            onApproveKYC={handleApproveKYC}
            onRejectKYC={handleRejectKYC}
            onBlacklistRenter={handleBlacklistRenter}
            onDisbursePayout={(b) => {
              const pay = payouts.find(p => p.bookingId === b.id);
              if (pay) handleExecutePayout(pay.id, `UTR-IMPS-${Math.floor(100000 + Math.random() * 900000)}`);
            }}
          />
        )}

        {/* TAB 3: OWNER EARNINGS (Vehicle Owner Only) */}
        {activeTab === 'earnings' && currentUser.role === 'vehicle_owner' && (
          <OwnerEarningsView
            currentUser={currentUser}
            ownerBookings={ownerBookings}
            ownerPayouts={ownerPayoutsList}
            onReportDispute={handleReportDispute}
          />
        )}

        {/* TAB 4: ADMIN PAYOUTS & DISPUTES (Admin Only) */}
        {activeTab === 'payouts' && currentUser.role === 'admin' && (
          <AdminPayoutsDisputes
            payouts={payouts}
            disputes={disputes}
            settings={settings}
            onExecutePayout={handleExecutePayout}
            onResolveDispute={handleResolveDispute}
            onSaveSettings={(s) => {
              RentalStorageService.saveSettings(s);
              setSettings(s);
              showToast('Settings Saved', 'Platform rules and tax rates updated.', 'success');
            }}
          />
        )}

        {/* TAB 5: AUDIT LOG (Strictly Read-Only) */}
        {activeTab === 'audit' && currentUser.role === 'admin' && (
          <AuditLogViewer
            logs={auditLogs}
            vehicles={vehicles}
          />
        )}

        {/* TAB 6: MAINTENANCE (Admin Only) */}
        {activeTab === 'maintenance' && currentUser.role === 'admin' && (
          <MaintenanceLedger
            maintenanceLogs={maintenance}
            vehicles={vehicles}
            onAddLog={(m) => {
              RentalStorageService.saveMaintenance(m);
              showToast('Work Order Created', `Scheduled ${m.serviceType}.`, 'success');
            }}
            onCompleteLog={(mId) => {
              const m = maintenance.find(item => item.id === mId);
              if (m) {
                RentalStorageService.saveMaintenance({ ...m, status: 'completed' });
                showToast('Service Completed', 'Vehicle returned to service ready.', 'success');
              }
            }}
          />
        )}

      </main>

      {/* Modals Container */}
      {vehicleFormOpen && (
        <VehicleFormModal
          isOpen={vehicleFormOpen}
          onClose={() => {
            setVehicleFormOpen(false);
            setEditingVehicleTarget(null);
          }}
          currentUser={currentUser}
          initialVehicle={editingVehicleTarget}
          allOwners={allOwners}
          onSaveVehicle={handleSaveVehicle}
        />
      )}

      {newBookingModalOpen && (
        <NewBookingModal
          vehicles={vehicles}
          initialVehicle={preselectedVehicleForBooking}
          currentUser={currentUser}
          onClose={() => {
            setNewBookingModalOpen(false);
            setPreselectedVehicleForBooking(null);
          }}
          onSubmitBooking={handleCreateBooking}
        />
      )}

      {checkOutBookingTarget && (
        <CheckOutModal
          booking={checkOutBookingTarget}
          vehicle={vehicles.find(v => v.id === checkOutBookingTarget.vehicleId)}
          onClose={() => setCheckOutBookingTarget(null)}
          onSubmitCheckOut={handleSubmitCheckOut}
        />
      )}

      {checkInBookingTarget && (
        <CheckInModal
          booking={checkInBookingTarget}
          vehicle={vehicles.find(v => v.id === checkInBookingTarget.vehicleId)}
          onClose={() => setCheckInBookingTarget(null)}
          onSubmitCheckIn={handleSubmitCheckIn}
        />
      )}

      {agreementBookingTarget && (
        <RentalAgreementModal
          booking={agreementBookingTarget}
          vehicle={vehicles.find(v => v.id === agreementBookingTarget.vehicleId)}
          onClose={() => setAgreementBookingTarget(null)}
        />
      )}

      {returnDossierBookingTarget && (
        <ReturnDossierModal
          booking={returnDossierBookingTarget}
          vehicle={vehicles.find(v => v.id === returnDossierBookingTarget.vehicleId)}
          onClose={() => setReturnDossierBookingTarget(null)}
          onPrintAgreement={() => {
            const b = returnDossierBookingTarget;
            setReturnDossierBookingTarget(null);
            setAgreementBookingTarget(b);
          }}
        />
      )}

      <DeveloperManualModal
        isOpen={devManualModalOpen}
        onClose={() => setDevManualModalOpen(false)}
      />

      {/* Toast Notification */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900/95 p-3.5 shadow-2xl backdrop-blur-md max-w-sm transition-all duration-300">
          <div className="mt-0.5 shrink-0">
            {activeToast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            {activeToast.type === 'warning' && <AlertCircle className="h-4 w-4 text-amber-400" />}
            {activeToast.type === 'info' && <Info className="h-4 w-4 text-blue-400" />}
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-white">{activeToast.title}</div>
            <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">{activeToast.message}</div>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className="text-neutral-500 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
