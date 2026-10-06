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
import { EmailService } from './services/emailService';
import { auth } from './services/firebase';
import { Navbar } from './components/Navbar';
import { FleetOverview } from './components/FleetOverview';
import { BookingManager } from './components/BookingManager';
import { OwnerEarningsView } from './components/OwnerEarningsView';
import { AdminPayoutsDisputes } from './components/AdminPayoutsDisputes';
import { AuditLogViewer } from './components/AuditLogViewer';
import { MaintenanceLedger } from './components/MaintenanceLedger';
import { UserAccessControl } from './components/UserAccessControl';
import { LoginPage } from './components/LoginPage';

// Modals
import { VehicleFormModal } from './components/modals/VehicleFormModal';
import { CheckOutModal } from './components/modals/CheckOutModal';
import { CheckInModal } from './components/modals/CheckInModal';
import { NewBookingModal } from './components/modals/NewBookingModal';
import { RentalAgreementModal } from './components/modals/RentalAgreementModal';
import { ReturnDossierModal } from './components/modals/ReturnDossierModal';
import { ErrorBoundary } from './components/ErrorBoundary';

import { CheckCircle2, AlertCircle, Info, Lock } from 'lucide-react';

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'fleet' | 'bookings' | 'earnings' | 'payouts' | 'audit' | 'maintenance' | 'user_access'>('fleet');

  // Sidebar Collapsed state (persisted in localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vahaanflow_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Suspension error for login
  const [suspensionError, setSuspensionError] = useState<string | null>(null);

  // Core Data State
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => RentalStorageService.getVehicles());
  const [bookings, setBookings] = useState<Booking[]>(() => RentalStorageService.getBookings());
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>(() => RentalStorageService.getAuditLogs());
  const [maintenance, setMaintenance] = useState<MaintenanceLog[]>(() => RentalStorageService.getMaintenanceLogs());
  const [payouts, setPayouts] = useState<PayoutRecord[]>(() => RentalStorageService.getPayouts());
  const [disputes, setDisputes] = useState<DisputeRecord[]>(() => RentalStorageService.getDisputes());
  const [settings, setSettings] = useState<PlatformSettings>(() => RentalStorageService.getSettings());

  // Light / Dark Theme State (persisted in localStorage)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('vahaanflow_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('bg-slate-50', 'text-slate-900');
      document.body.classList.remove('bg-neutral-950', 'text-neutral-100');
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#0f172a';
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('bg-neutral-950', 'text-neutral-100');
      document.body.classList.remove('bg-slate-50', 'text-slate-900');
      document.body.style.backgroundColor = '#0a0a0a';
      document.body.style.color = '#f5f5f5';
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('vahaanflow_theme', next);
      return next;
    });
  };

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

  // Real-time Firebase Auth listener
  useEffect(() => {
    const unsubAuth = AuthService.initAuthListener((user, err) => {
      setCurrentUser(user);
      if (err) {
        setSuspensionError(err);
      } else {
        setSuspensionError(null);
      }
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Real-time Admin user directory sync
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      RentalStorageService.backfillVehiclesOwnerSuspended();
      const unsub = AuthService.initAdminUsersSync((users) => {
        setAllUsers(users);
      });
      return () => unsub();
    } else {
      setAllUsers(currentUser ? [currentUser] : []);
    }
  }, [currentUser?.role, currentUser?.id]);

  // Real-time Cloud Firestore data synchronization
  useEffect(() => {
    const unsubSettings = RentalStorageService.initSettingsSync((s) => setSettings(s));

    if (!currentUser) {
      return () => { unsubSettings(); };
    }

    const unsubData = RentalStorageService.initFirestoreSync(
      currentUser.role,
      currentUser.id,
      {
        onVehicles: (v) => setVehicles(v),
        onBookings: (b) => setBookings(b),
        onAuditLogs: (a) => setAuditLogs(a),
        onMaintenance: (m) => setMaintenance(m),
        onPayouts: (p) => setPayouts(p),
        onDisputes: (d) => setDisputes(d),
      }
    );

    return () => {
      unsubSettings();
      unsubData();
    };
  }, [currentUser?.role, currentUser?.id]);

  // Handlers for Session
  const handleLoginSuccess = async (user: UserProfile) => {
    if (user.role !== 'renter' && user.activeViewMode === 'renter') {
      user.activeViewMode = user.role;
      await AuthService.syncUserProfileToFirestore(user);
    }
    setCurrentUser(user);
    setActiveTab('fleet');
    showToast(`Welcome, ${user.name}`, `Signed in as ${user.role === 'admin' ? 'Admin' : (user.role === 'vehicle_owner' ? 'Car Owner' : 'Customer')}.`, 'success');
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
    showToast('Logged Out', 'You have been logged out safely.', 'info');
  };

  // Toggle Normal Customer View ("for both owner and admin: can use the app as normal user")
  const handleToggleNormalUserMode = async () => {
    if (!currentUser) return;
    const targetMode = currentUser.activeViewMode === 'renter' ? currentUser.role : 'renter';
    const updated: UserProfile = { ...currentUser, activeViewMode: targetMode };
    setCurrentUser(updated);
    await AuthService.syncUserProfileToFirestore(updated);
    setActiveTab('fleet');
    if (targetMode === 'renter') {
      showToast('Customer Mode Active', 'You can now browse cars and book as a customer.', 'info');
    } else {
      showToast('Returned to Dashboard', `Back to ${currentUser.role === 'admin' ? 'Admin' : 'Car Owner'} dashboard.`, 'success');
    }
  };

  // USER ACCESS CONTROL OPERATIONS
  const handleSuspendUser = async (userId: string, reason: string) => {
    const target = allUsers.find(u => u.id === userId);
    if (!target) return;

    if (target.role === 'admin' || target.email.toLowerCase() === 'tanmayrajaura28@gmail.com') {
      showToast('Action Prohibited', 'Admin accounts cannot be suspended.', 'warning');
      return;
    }

    const suspendedAt = new Date().toISOString();
    const updatedUser: UserProfile = {
      ...target,
      approvalStatus: 'suspended',
      suspensionReason: reason,
      suspendedAt,
      ownerDetails: target.ownerDetails ? {
        ...target.ownerDetails,
        approvalStatus: 'suspended',
      } : undefined,
    };

    setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
    await AuthService.syncUserProfileToFirestore(updatedUser);

    // Record every suspend action in Activity History (category "user access", with the reason)
    await RentalStorageService.logAudit({
      category: 'user access',
      action: 'User Account Suspended',
      summary: `Account ${target.name} (${target.email}) was suspended by Admin. Reason: "${reason}".`,
      actor: {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Admin',
        role: 'admin',
      },
      severity: 'warning',
    });

    if (currentUser?.id === userId) {
      const errorMsg = `Your account has been suspended by the admin. Reason: ${reason}. Please contact support to restore access.`;
      setSuspensionError(errorMsg);
      await AuthService.logout();
      setCurrentUser(null);
    }

    showToast('User Suspended', `${target.name} account suspended.`, 'info');
  };

  const handleReactivateUser = async (userId: string) => {
    const target = allUsers.find(u => u.id === userId);
    if (!target) return;

    const updatedUser: UserProfile = {
      ...target,
      approvalStatus: 'approved',
      suspensionReason: undefined,
      suspendedAt: undefined,
      ownerDetails: target.ownerDetails ? {
        ...target.ownerDetails,
        approvalStatus: 'approved',
      } : undefined,
    };

    setAllUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
    await AuthService.syncUserProfileToFirestore(updatedUser);

    // Record every reactivate action in Activity History
    await RentalStorageService.logAudit({
      category: 'user access',
      action: 'User Account Reactivated',
      summary: `Account ${target.name} (${target.email}) was reactivated by Admin.`,
      actor: {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Admin',
        role: 'admin',
      },
      severity: 'notice',
    });

    showToast('User Reactivated', `Access restored for ${target.name}.`, 'success');
  };

  const handleResetDummyUsers = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        showToast('Operation Failed', 'You must be signed in.', 'warning');
        return;
      }

      const token = await user.getIdToken();
      const res = await fetch('/api/admin/reset-dummy-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        showToast('Dummy Users Reset', 'All dummy users have been reset and recreated.', 'success');
        // Record action in Audit Logs
        await RentalStorageService.logAudit({
          category: 'user access',
          action: 'Dummy Users Reseeded',
          summary: 'Admin reset and recreated the platform dummy accounts.',
          actor: {
            id: currentUser?.id || 'admin',
            name: currentUser?.name || 'Admin',
            role: 'admin',
          },
          severity: 'warning',
        });
      } else {
        showToast('Operation Failed', data.error || 'Failed to reset dummy users.', 'warning');
      }
    } catch (err: any) {
      console.error('Error resetting dummy users:', err);
      showToast('Operation Failed', err.message || 'An error occurred.', 'warning');
    }
  };

  // VEHICLE OPERATIONS
  const handleDeleteUser = async (userId: string) => {
    const target = allUsers.find(u => u.id === userId);
    await AuthService.deleteUser(userId);
    setAllUsers(prev => prev.filter(u => u.id !== userId));
    showToast('User Profile Deleted', `Account for ${target?.name || 'User'} permanently deleted.`, 'info');
  };

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

    // Notify Admin (tanmayrajaura28@gmail.com) for owner car additions/updates
    if (currentUser?.role === 'vehicle_owner') {
      EmailService.notifyAdmin({
        eventTitle: editingVehicleTarget ? 'Car Details Updated by Owner' : 'New Car Submitted by Owner for Approval',
        actorName: currentUser.name,
        actorRole: 'Car Owner',
        actorEmail: currentUser.email,
        summaryText: `Owner ${currentUser.name} (${currentUser.email}) ${editingVehicleTarget ? 'updated' : 'submitted new car'} ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate}). Daily Rate: ₹${vehicle.dailyRate || vehicle.suggestedDailyRate}. Approval Status: ${vehicle.approvalStatus}.`,
      }).catch(console.warn);
    }

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
    // 1. Immediately update React state so the UI updates with zero lag
    setBookings(prev => [newBooking, ...prev.filter(b => b.id !== newBooking.id)]);

    const targetVeh = vehicles.find(v => v.id === newBooking.vehicleId);
    if (targetVeh) {
      const updatedVeh = { ...targetVeh, status: 'booked' as VehicleStatus };
      setVehicles(prev => prev.map(v => v.id === updatedVeh.id ? updatedVeh : v));
      await RentalStorageService.saveVehicle(updatedVeh);
    }

    await RentalStorageService.saveBooking(newBooking);

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

    // Send instant alert email to Admin (tanmayrajaura28@gmail.com)
    EmailService.notifyAdmin({
      eventTitle: 'New Car Booking Confirmed by Customer',
      actorName: newBooking.customer.name,
      actorRole: 'Customer',
      actorEmail: newBooking.customer.email,
      summaryText: `Customer ${newBooking.customer.name} (${newBooking.customer.email}) reserved ${newBooking.vehicle.make} ${newBooking.vehicle.model} (${newBooking.vehicle.licensePlate}) from ${newBooking.startDate} to ${newBooking.endDate}. Total Rent: ₹${newBooking.totalRental}. Booking Code: ${newBooking.bookingCode}.`,
    }).catch(console.warn);

    // Automatically switch active view to My Trips so the customer sees their new booking details immediately!
    setActiveTab('bookings');
    showToast('🎉 Booking Confirmed', `Booking ${newBooking.bookingCode} confirmed! Email confirmation sent.`, 'success');
  };

  const handleCancelBooking = async (bookingId: string, reason: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;

    const updated: Booking = { 
      ...target, 
      status: 'cancelled',
      cancellationReason: reason,
      cancelledAt: new Date().toISOString(),
      cancelledBy: currentUser?.name || 'User'
    };

    // 1. Immediately update React state for instant UI re-render
    setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));

    // 2. Immediately free up vehicle in React state
    setVehicles(prev => prev.map(v => v.id === target.vehicleId ? { ...v, status: 'available' } : v));

    // 3. Persist to storage and Firestore
    try {
      await RentalStorageService.saveBooking(updated);
      const targetVehicle = vehicles.find(v => v.id === target.vehicleId);
      if (targetVehicle && (targetVehicle.status === 'booked' || targetVehicle.status === 'on_trip')) {
        await RentalStorageService.saveVehicle({ ...targetVehicle, status: 'available' });
      }
    } catch (err) {
      console.warn('Error persisting booking cancellation:', err);
    }

    // 4. Log audit trail
    const auditRole = currentUser?.role || 'renter';
    await RentalStorageService.logAudit({
      category: 'BOOKING',
      action: 'Booking Cancelled',
      summary: `Booking ${target.bookingCode} for ${target.vehicle?.make || 'Car'} ${target.vehicle?.model || ''} was cancelled. Reason: "${reason}".`,
      actor: {
        id: currentUser?.id || 'usr',
        name: currentUser?.name || 'User',
        role: auditRole,
        ip: '127.0.0.1',
      },
      bookingCode: target.bookingCode,
      vehiclePlate: target.vehicle?.licensePlate,
      severity: 'notice',
    });

    // 5. Notify admin/parties via email
    EmailService.notifyAdmin({
      eventTitle: 'Booking Cancelled by User',
      actorName: currentUser?.name || 'User',
      actorRole: auditRole === 'admin' ? 'Admin' : (auditRole === 'vehicle_owner' ? 'Car Owner' : 'Customer'),
      actorEmail: currentUser?.email || target.customer?.email || 'N/A',
      summaryText: `Reservation ${target.bookingCode} for ${target.vehicle?.make} ${target.vehicle?.model} (${target.vehicle?.licensePlate}) was cancelled. Reason: "${reason}".`,
    }).catch(console.warn);

    showToast('Booking Cancelled', `Reservation ${target.bookingCode} has been cancelled.`, 'info');
  };

  const handleOwnerApproveBooking = async (bookingId: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;
    const updated: Booking = { ...target, ownerApprovalStatus: 'approved' };
    setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
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

    EmailService.notifyAdmin({
      eventTitle: 'Booking Request Approved by Car Owner',
      actorName: currentUser?.name || 'Car Owner',
      actorRole: 'Car Owner',
      actorEmail: currentUser?.email || 'N/A',
      summaryText: `Car Owner ${currentUser?.name} approved reservation ${target.bookingCode} for ${target.vehicle.make} ${target.vehicle.model} (${target.vehicle.licensePlate}).`,
    }).catch(console.warn);

    showToast('Booking Approved', `You approved reservation ${target.bookingCode}.`, 'success');
  };

  const handleOwnerDeclineBooking = async (bookingId: string, reason: string) => {
    const target = bookings.find(b => b.id === bookingId);
    if (!target) return;
    const updated: Booking = { 
      ...target, 
      status: 'cancelled', 
      ownerApprovalStatus: 'declined', 
      ownerApprovalNotes: reason,
      cancellationReason: reason
    };
    setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
    setVehicles(prev => prev.map(v => v.id === target.vehicleId ? { ...v, status: 'available' } : v));
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

    EmailService.notifyAdmin({
      eventTitle: 'Booking Request Declined by Car Owner',
      actorName: currentUser?.name || 'Car Owner',
      actorRole: 'Car Owner',
      actorEmail: currentUser?.email || 'N/A',
      summaryText: `Car Owner ${currentUser?.name} declined reservation ${target.bookingCode}. Reason: "${reason}".`,
    }).catch(console.warn);

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
    setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));

    // Set vehicle status to on_trip
    const targetVeh = vehicles.find(v => v.id === target.vehicleId);
    if (targetVeh) {
      const updatedVeh: Vehicle = {
        ...targetVeh,
        status: 'on_trip',
        odometer: details.startOdometer,
        fuelOrBatteryPct: details.startFuelPct,
      };
      setVehicles(prev => prev.map(v => v.id === targetVeh.id ? updatedVeh : v));
      await RentalStorageService.saveVehicle(updatedVeh);
    }

    await RentalStorageService.saveBooking(updatedBooking);

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
    setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));

    // Free the vehicle and update odometer
    const targetVeh = vehicles.find(v => v.id === target.vehicleId);
    if (targetVeh) {
      const updatedVeh: Vehicle = {
        ...targetVeh,
        status: 'available',
        odometer: details.endOdometer,
        fuelOrBatteryPct: details.endFuelPct,
      };
      setVehicles(prev => prev.map(v => v.id === targetVeh.id ? updatedVeh : v));
      await RentalStorageService.saveVehicle(updatedVeh);
    }

    await RentalStorageService.saveBooking(updatedBooking);

    // Create pending payout record for the vehicle owner upon check-in completion (once per finished trip)
    const existingPayout = payouts.find(p => p.bookingId === target.id);
    if (!existingPayout) {
      const newPayout: PayoutRecord = {
        id: `pay-${Date.now()}`,
        ownerId: target.ownerId,
        ownerName: target.ownerName,
        ownerUpiOrBank: 'UPI/Bank on file',
        bookingId: target.id,
        vehiclePlate: target.vehicle.licensePlate,
        grossAmount: target.totalRental,
        platformCommission: target.platformCommission,
        netPayout: target.ownerNetShare,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      setPayouts(prev => [newPayout, ...prev]);
      await RentalStorageService.savePayout(newPayout);
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
    setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
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
    setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
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
  const handleReportDispute = async (title: string, description: string, bookingId?: string, raisedBy?: 'admin' | 'owner' | 'renter') => {
    const determinedRole = raisedBy || (currentUser?.role === 'admin' ? 'admin' : 'owner');
    const newDispute: DisputeRecord = {
      id: `disp-${Date.now()}`,
      bookingId: bookingId || 'General',
      raisedBy: determinedRole,
      reporterId: currentUser?.id || 'unknown',
      reporterName: determinedRole === 'admin' ? (currentUser?.name ? `${currentUser.name} (Admin)` : 'Fleet Operations Desk (Admin)') : (currentUser?.name || 'User'),
      title,
      description,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    await RentalStorageService.saveDispute(newDispute);
    setDisputes(prev => [newDispute, ...prev]);

    const auditRole = currentUser?.role || (determinedRole === 'owner' ? 'vehicle_owner' : determinedRole);
    await RentalStorageService.logAudit({
      category: 'DISPUTE',
      action: 'Dispute Ticket Raised',
      summary: `Ticket "${title}" filed (${determinedRole.toUpperCase()}).`,
      actor: { id: currentUser?.id || 'usr', name: currentUser?.name || 'User', role: auditRole },
      severity: 'warning',
    });

    showToast('Dispute Reported', 'Incident/complaint registered successfully.', 'info');
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
      <LoginPage 
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        initialError={suspensionError || undefined}
      />
    );
  }

  // Filter owners for vehicle assignment
  const allOwners = allUsers.filter(u => u.role === 'vehicle_owner');

  // Scoped bookings for owner
  const ownerBookings = bookings.filter(b => b.ownerId === currentUser.id);
  const ownerPayoutsList = payouts.filter(p => p.ownerId === currentUser.id);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-neutral-950 text-neutral-100 dark' 
        : 'bg-slate-50 text-slate-900 light'
    }`}>
      
      {/* Top Bar & Sidebar (Wrapping main content in a unified layout) */}
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
        onToggleNormalUserMode={handleToggleNormalUserMode}
        auditCount={auditLogs.length}
        onDeleteUser={handleDeleteUser}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      >
        <ErrorBoundary fallbackTitle="Could not load this dashboard tab">
          {/* TAB 1: FLEET OVERVIEW */}
          {activeTab === 'fleet' && (
            <FleetOverview
              vehicles={vehicles}
              currentUser={currentUser}
              allUsers={allUsers}
              theme={theme}
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

          {/* TAB 2: BOOKINGS / TRIPS */}
          {activeTab === 'bookings' && (
            <BookingManager
              bookings={bookings}
              currentUser={currentUser}
              theme={theme}
              onOpenCheckOut={(b) => setCheckOutBookingTarget(b)}
              onOpenCheckIn={(b) => setCheckInBookingTarget(b)}
              onViewAgreement={(b) => setAgreementBookingTarget(b)}
              onCancelBooking={handleCancelBooking}
              onOpenNewBooking={() => {
                setPreselectedVehicleForBooking(null);
                setNewBookingModalOpen(true);
              }}
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
              theme={theme}
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
              onReportDispute={handleReportDispute}
              theme={theme}
              onSaveSettings={(s) => {
                RentalStorageService.saveSettings(s);
                setSettings(s);
                showToast('Settings Saved', 'Platform rules and fee split updated.', 'success');
              }}
              onUpdatePendingSplit={(newCommissionRate) => {
                const updatedPayouts = payouts.map(p => {
                  if (p.status === 'pending') {
                    const gross = p.grossAmount || (p.netPayout + (p.platformCommission || 0));
                    const comm = Math.round(gross * newCommissionRate);
                    const net = gross - comm;
                    const updated = { ...p, platformCommission: comm, netPayout: net };
                    RentalStorageService.savePayout(updated);
                    return updated;
                  }
                  return p;
                });
                setPayouts(updatedPayouts);
                showToast('Pending Payouts Recalculated', `Updated to ${Math.round((1 - newCommissionRate) * 100)}% Owner / ${Math.round(newCommissionRate * 100)}% Platform.`, 'info');
              }}
            />
          )}

          {/* TAB 5: AUDIT LOG (Activity History) */}
          {activeTab === 'audit' && currentUser.role === 'admin' && (
            <AuditLogViewer
              logs={auditLogs}
              vehicles={vehicles}
              theme={theme}
              onClearAuditHistory={async (days) => {
                let count = 0;
                if (days === 'all') {
                  count = await RentalStorageService.clearAllAuditLogs();
                  setAuditLogs([]);
                } else {
                  count = await RentalStorageService.clearAuditLogsOlderThan(days);
                  const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
                  setAuditLogs(prev => prev.filter(l => {
                    const t = new Date(l.timestamp).getTime();
                    return !isNaN(t) && t >= cutoffMs;
                  }));
                }
                const timeframeLabel = days === 'all' ? 'all history' : (days === 15 ? '15 days' : (days === 30 ? '1 month' : '2 months'));
                showToast('Activity History Cleared', `Purged ${count} activity log record(s) older than ${timeframeLabel}.`, 'info');
              }}
            />
          )}

          {/* TAB 6: MAINTENANCE (Admin Only) */}
          {activeTab === 'maintenance' && currentUser.role === 'admin' && (
            <MaintenanceLedger
              maintenanceLogs={maintenance}
              vehicles={vehicles}
              theme={theme}
              onAddLog={async (m) => {
                await RentalStorageService.saveMaintenance(m);
                setMaintenance(prev => [...prev, m]);
                const vehicle = vehicles.find(v => v.id === m.vehicleId);
                await RentalStorageService.logAudit({
                  category: 'maintenance',
                  action: 'Servicing Scheduled',
                  summary: `Servicing logged for ${vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle'} (${m.vehiclePlate}). Type: ${m.serviceType}, Workshop: ${m.workshopName}, Cost: ₹${m.cost}.`,
                  actor: {
                    id: currentUser.id,
                    name: currentUser.name,
                    role: currentUser.role,
                  },
                  vehiclePlate: m.vehiclePlate,
                  severity: 'info',
                });
                showToast('Work Order Created', `Scheduled ${m.serviceType}.`, 'success');
              }}
              onCompleteLog={async (mId) => {
                const m = maintenance.find(item => item.id === mId);
                if (m) {
                  const updated = { ...m, status: 'completed' as const, completionDate: new Date().toISOString().split('T')[0] };
                  await RentalStorageService.saveMaintenance(updated);
                  setMaintenance(prev => prev.map(item => item.id === mId ? updated : item));
                  const vehicle = vehicles.find(v => v.id === m.vehicleId);
                  await RentalStorageService.logAudit({
                    category: 'maintenance',
                    action: 'Servicing Completed',
                    summary: `Servicing completed for ${vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle'} (${m.vehiclePlate}). Type: ${m.serviceType}, Workshop: ${m.workshopName}. Vehicle returned to available status.`,
                    actor: {
                      id: currentUser.id,
                      name: currentUser.name,
                      role: currentUser.role,
                    },
                    vehiclePlate: m.vehiclePlate,
                    severity: 'info',
                  });
                  showToast('Service Completed', 'Vehicle returned to service ready.', 'success');
                }
              }}
              onRevertLog={async (mId) => {
                const m = maintenance.find(item => item.id === mId);
                if (m) {
                  const updated = { ...m, status: 'in_progress' as const };
                  await RentalStorageService.saveMaintenance(updated);
                  setMaintenance(prev => prev.map(item => item.id === mId ? updated : item));
                  const vehicle = vehicles.find(v => v.id === m.vehicleId);
                  await RentalStorageService.logAudit({
                    category: 'maintenance',
                    action: 'Servicing Reopened',
                    summary: `Servicing reopened / moved back to In Workshop status for ${vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle'} (${m.vehiclePlate}).`,
                    actor: {
                      id: currentUser.id,
                      name: currentUser.name,
                      role: currentUser.role,
                    },
                    vehiclePlate: m.vehiclePlate,
                    severity: 'notice',
                  });
                  showToast('Action Undone', 'Vehicle moved back to In Workshop status.', 'info');
                }
              }}
            />
          )}

          {/* TAB 7: USER ACCESS CONTROL (Admin Only) */}
          {activeTab === 'user_access' && currentUser.role === 'admin' && (
            <UserAccessControl
              users={allUsers}
              vehicles={vehicles}
              bookings={bookings}
              onSuspendUser={handleSuspendUser}
              onReactivateUser={handleReactivateUser}
              onResetDummyUsers={handleResetDummyUsers}
              theme={theme}
            />
          )}
        </ErrorBoundary>
      </Navbar>

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
          theme={theme}
        />
      )}

      {newBookingModalOpen && (
        <NewBookingModal
          vehicles={vehicles}
          initialVehicle={preselectedVehicleForBooking}
          currentUser={currentUser}
          allUsers={allUsers}
          theme={theme}
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
          theme={theme}
        />
      )}

      {checkInBookingTarget && (
        <CheckInModal
          booking={checkInBookingTarget}
          vehicle={vehicles.find(v => v.id === checkInBookingTarget.vehicleId)}
          onClose={() => setCheckInBookingTarget(null)}
          onSubmitCheckIn={handleSubmitCheckIn}
          theme={theme}
        />
      )}

      {agreementBookingTarget && (
        <RentalAgreementModal
          booking={agreementBookingTarget}
          vehicle={vehicles.find(v => v.id === agreementBookingTarget.vehicleId)}
          onClose={() => setAgreementBookingTarget(null)}
          theme={theme}
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
          theme={theme}
        />
      )}

      {/* Toast Notification */}
      {activeToast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-start gap-3 rounded-xl border p-3.5 shadow-2xl backdrop-blur-md max-w-sm transition-all duration-300 ${
          theme === 'light'
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-neutral-900/95 border-neutral-800 text-neutral-100'
        }`}>
          <div className="mt-0.5 shrink-0">
            {activeToast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            {activeToast.type === 'warning' && <AlertCircle className="h-4 w-4 text-amber-500" />}
            {activeToast.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
          </div>
          <div className="flex-1">
            <div className={`text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{activeToast.title}</div>
            <div className={`text-[11px] mt-0.5 leading-snug ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>{activeToast.message}</div>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className={`text-xs ${theme === 'light' ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-500 hover:text-white'}`}
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
