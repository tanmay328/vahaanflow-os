import React, { useState, useMemo } from 'react';
import { 
  Vehicle, 
  ServiceReminder, 
  ServiceReminderKind, 
  ServiceReminderFrequency 
} from '../types/rental';
import { UserProfile } from '../types/auth';
import { auth } from '../services/firebase';
import { 
  Wrench, 
  Plus, 
  Search, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Mail, 
  Send, 
  Pause, 
  Play, 
  Edit3, 
  Trash2, 
  X, 
  RotateCw, 
  Car, 
  Info,
  Check,
  AlertCircle
} from 'lucide-react';

interface MaintenanceLedgerProps {
  serviceReminders: ServiceReminder[];
  vehicles: Vehicle[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  theme?: 'dark' | 'light';
  onSaveReminder: (reminder: ServiceReminder) => Promise<void>;
  onDeleteReminder: (reminderId: string) => Promise<void>;
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

// Pre-defined Indian garage part check options
const PART_CHECK_OPTIONS = [
  'Engine oil and filter',
  'Air filter',
  'Brake pads and brake oil',
  'Tyres (rotation and air)',
  'Battery',
  'Coolant',
  'Wiper blades',
  'AC service',
  'Lights and horn',
  'Other'
];

// Helper: current date in Asia/Kolkata (YYYY-MM-DD)
export function getKolkataDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

// Helper: calendar days difference (dueDate - today)
export function getDaysDiff(dueDateStr: string, todayStr: string): number {
  if (!dueDateStr) return 0;
  const [y1, m1, d1] = dueDateStr.split('-').map(Number);
  const [y2, m2, d2] = todayStr.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
}

// Helper: move date forward by N months with month-end clipping
export function addMonthsClamped(dateStr: string, monthsToAdd: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetYear = year + Math.floor((month - 1 + monthsToAdd) / 12);
  const targetMonth = ((month - 1 + monthsToAdd) % 12) + 1;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const clampedDay = Math.min(day, daysInTargetMonth);
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

// Helper: format YYYY-MM-DD to Indian format e.g. "15 Oct 2026"
export function formatIndianDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'None';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateStr;
  }
}

export const MaintenanceLedger: React.FC<MaintenanceLedgerProps> = ({
  serviceReminders,
  vehicles,
  allUsers,
  currentUser,
  theme = 'dark',
  onSaveReminder,
  onDeleteReminder,
  showToast
}) => {
  const todayStr = useMemo(() => getKolkataDateString(), []);
  const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM

  // UI state
  const [typeFilter, setTypeFilter] = useState<'all' | 'main_service' | 'part_check'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dialogs
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingReminder, setEditingReminder] = useState<ServiceReminder | null>(null);
  const [deletingReminder, setDeletingReminder] = useState<ServiceReminder | null>(null);

  // Manual Trigger & Test state
  const [isRunningCheck, setIsRunningCheck] = useState<boolean>(false);
  const [runCheckResult, setRunCheckResult] = useState<{
    show: boolean;
    success: boolean;
    summary: string;
    details: string[];
  } | null>(null);

  const [testingReminderId, setTestingReminderId] = useState<string | null>(null);

  // Test Reminder Modal State (for testing all types of reminders)
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [testVehicleId, setTestVehicleId] = useState<string>('');
  const [testMode, setTestMode] = useState<'all_types' | 'main_service' | 'part_check' | 'existing_reminder'>('all_types');
  const [testMainDaysLeft, setTestMainDaysLeft] = useState<number>(3);
  const [testPartTitle, setTestPartTitle] = useState<string>('Engine oil and filter');
  const [testCustomPartTitle, setTestCustomPartTitle] = useState<string>('');
  const [testSelectedReminderId, setTestSelectedReminderId] = useState<string>('');
  const [isSendingCustomTest, setIsSendingCustomTest] = useState<boolean>(false);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [formVehicleId, setFormVehicleId] = useState<string>('');
  const [formKind, setFormKind] = useState<ServiceReminderKind>('main_service');
  const [formTitle, setFormTitle] = useState<string>('Main service');
  const [formPartSelect, setFormPartSelect] = useState<string>('Engine oil and filter');
  const [formCustomPart, setFormCustomPart] = useState<string>('');
  const [formDueDate, setFormDueDate] = useState<string>('');
  const [formFrequency, setFormFrequency] = useState<ServiceReminderFrequency>('every_12_months');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);

  // Map of owners by ID for easy lookup
  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    allUsers.forEach(u => map.set(u.id, u));
    return map;
  }, [allUsers]);

  // Map of vehicles by ID
  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach(v => map.set(v.id, v));
    return map;
  }, [vehicles]);

  // Approved cars for dropdown
  const approvedCars = useMemo(() => {
    return vehicles.filter(v => v.approvalStatus === 'approved');
  }, [vehicles]);

  // Selected test vehicle and owner
  const selectedTestVehicle = useMemo(() => {
    if (testMode === 'existing_reminder' && testSelectedReminderId) {
      const rem = serviceReminders.find(r => r.id === testSelectedReminderId);
      if (rem) return vehicles.find(v => v.id === rem.vehicleId) || null;
    }
    return vehicles.find(v => v.id === testVehicleId) || approvedCars[0] || vehicles[0] || null;
  }, [vehicles, testVehicleId, testMode, testSelectedReminderId, serviceReminders, approvedCars]);

  const selectedTestOwner = useMemo(() => {
    if (!selectedTestVehicle) return null;
    return userMap.get(selectedTestVehicle.ownerId) || null;
  }, [selectedTestVehicle, userMap]);

  // Helper to determine status category of reminder
  const getReminderStatus = (r: ServiceReminder) => {
    if (r.frequency === 'once' && r.completed) {
      return { key: 'completed', label: 'Completed', color: 'slate' };
    }
    if (r.paused) {
      return { key: 'paused', label: 'Paused', color: 'zinc' };
    }
    const days = getDaysDiff(r.dueDate, todayStr);
    if (days < 0) {
      return { key: 'overdue', label: 'Overdue', color: 'red', overdueDays: Math.abs(days) };
    }
    if (days === 0) {
      return { key: 'due_today', label: 'Due today', color: 'amber' };
    }
    if (r.kind === 'main_service' && (days === 1 || days === 2 || days === 3)) {
      return { key: 'reminding_now', label: 'Reminding now', color: 'purple', daysLeft: days };
    }
    return { key: 'scheduled', label: 'Scheduled', color: 'emerald', daysLeft: days };
  };

  // 1. TOP SUMMARY CARDS
  const topStats = useMemo(() => {
    // Next main service
    const activeMainServices = serviceReminders.filter(
      r => r.kind === 'main_service' && !r.paused && !(r.frequency === 'once' && r.completed)
    );
    activeMainServices.sort((a, b) => getDaysDiff(a.dueDate, todayStr) - getDaysDiff(b.dueDate, todayStr));
    const nextMain = activeMainServices[0] || null;

    let nextMainText = 'None scheduled';
    let nextMainSub = 'No upcoming services';
    if (nextMain) {
      const diff = getDaysDiff(nextMain.dueDate, todayStr);
      if (diff < 0) {
        nextMainText = `${nextMain.vehicleLabel}`;
        nextMainSub = `${Math.abs(diff)} days overdue`;
      } else if (diff === 0) {
        nextMainText = `${nextMain.vehicleLabel}`;
        nextMainSub = 'Due today';
      } else {
        nextMainText = `${nextMain.vehicleLabel}`;
        nextMainSub = `in ${diff} day${diff === 1 ? '' : 's'}`;
      }
    }

    // Due now: reminders due within 3 days (3, 2, 1 days left), due today, or overdue
    const dueNowCount = serviceReminders.filter(r => {
      if (r.paused || (r.frequency === 'once' && r.completed)) return false;
      const days = getDaysDiff(r.dueDate, todayStr);
      return days <= 3;
    }).length;

    // Monthly & 6-month checks due this month
    const checksThisMonthCount = serviceReminders.filter(r => {
      if (r.kind !== 'part_check' || r.paused || (r.frequency === 'once' && r.completed)) return false;
      return r.dueDate.startsWith(currentMonthPrefix);
    }).length;

    // Mails sent today
    const mailsSentTodayCount = serviceReminders.filter(r => r.lastMailDate === todayStr).length;

    return {
      nextMainText,
      nextMainSub,
      dueNowCount,
      checksThisMonthCount,
      mailsSentTodayCount,
    };
  }, [serviceReminders, todayStr, currentMonthPrefix]);

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    return serviceReminders.filter(r => {
      // Type filter
      if (typeFilter !== 'all' && r.kind !== typeFilter) return false;

      // Status filter
      const st = getReminderStatus(r);
      if (statusFilter !== 'all') {
        if (statusFilter === 'scheduled' && st.key !== 'scheduled') return false;
        if (statusFilter === 'reminding_now' && st.key !== 'reminding_now') return false;
        if (statusFilter === 'due_today' && st.key !== 'due_today') return false;
        if (statusFilter === 'overdue' && st.key !== 'overdue') return false;
        if (statusFilter === 'paused' && st.key !== 'paused') return false;
        if (statusFilter === 'completed' && st.key !== 'completed') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const label = (r.vehicleLabel || '').toLowerCase();
        const title = (r.title || '').toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        if (!label.includes(q) && !title.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [serviceReminders, typeFilter, statusFilter, searchQuery, todayStr]);

  // Group filtered reminders by car (vehicleId)
  const groupedByCar = useMemo(() => {
    const map = new Map<string, { vehicleLabel: string; ownerId: string; reminders: ServiceReminder[] }>();

    filteredReminders.forEach(r => {
      const vId = r.vehicleId || 'unknown';
      if (!map.has(vId)) {
        map.set(vId, {
          vehicleLabel: r.vehicleLabel,
          ownerId: r.ownerId,
          reminders: []
        });
      }
      map.get(vId)!.reminders.push(r);
    });

    // Sort reminders inside each car group by dueDate
    map.forEach(group => {
      group.reminders.sort((a, b) => getDaysDiff(a.dueDate, todayStr) - getDaysDiff(b.dueDate, todayStr));
    });

    return Array.from(map.entries());
  }, [filteredReminders, todayStr]);

  // Handle open Add modal
  const handleOpenAddModal = () => {
    setEditingReminder(null);
    setFormVehicleId(approvedCars[0]?.id || '');
    setFormKind('main_service');
    setFormTitle('Main service');
    setFormPartSelect('Engine oil and filter');
    setFormCustomPart('');
    setFormDueDate(todayStr);
    setFormFrequency('every_12_months');
    setFormNotes('');
    setShowAddModal(true);
  };

  // Handle open Edit modal
  const handleOpenEditModal = (r: ServiceReminder) => {
    setEditingReminder(r);
    setFormVehicleId(r.vehicleId);
    setFormKind(r.kind);
    setFormTitle(r.title);
    if (PART_CHECK_OPTIONS.includes(r.title)) {
      setFormPartSelect(r.title);
      setFormCustomPart('');
    } else {
      setFormPartSelect('Other');
      setFormCustomPart(r.title);
    }
    setFormDueDate(r.dueDate);
    setFormFrequency(r.frequency);
    setFormNotes(r.notes || '');
    setShowAddModal(true);
  };

  // Handle save from Add/Edit modal
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVehicleId || !formDueDate) {
      showToast('Missing details', 'Please choose a car and due date.', 'error');
      return;
    }

    const targetVehicle = vehicleMap.get(formVehicleId);
    if (!targetVehicle) {
      showToast('Error', 'Selected car not found.', 'error');
      return;
    }

    const finalTitle = formKind === 'main_service' 
      ? (formTitle.trim() || 'Main service')
      : (formPartSelect === 'Other' ? (formCustomPart.trim() || 'Custom part check') : formPartSelect);

    const vehicleLabel = `${targetVehicle.make} ${targetVehicle.model} (${targetVehicle.licensePlate})`;

    setFormSubmitting(true);
    try {
      if (editingReminder) {
        const updated: ServiceReminder = {
          ...editingReminder,
          vehicleId: formVehicleId,
          vehicleLabel,
          ownerId: targetVehicle.ownerId,
          kind: formKind,
          title: finalTitle,
          dueDate: formDueDate,
          frequency: formFrequency,
          notes: formNotes.trim(),
        };
        await onSaveReminder(updated);
        showToast('Reminder Updated', `Saved changes for ${vehicleLabel}.`, 'success');
      } else {
        const newReminder: ServiceReminder = {
          id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          vehicleId: formVehicleId,
          vehicleLabel,
          ownerId: targetVehicle.ownerId,
          kind: formKind,
          title: finalTitle,
          dueDate: formDueDate,
          frequency: formFrequency,
          lastDoneDate: null,
          paused: false,
          notes: formNotes.trim(),
          mailsSentForCurrentDue: 0,
          lastMailDate: null,
          createdAt: new Date().toISOString(),
          createdBy: currentUser.id,
        };
        await onSaveReminder(newReminder);
        showToast('Reminder Added', `Scheduled ${finalTitle} for ${vehicleLabel}.`, 'success');
      }
      setShowAddModal(false);
    } catch (err: any) {
      showToast('Save Failed', err.message || 'Could not save reminder.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Action: Mark as done
  const handleMarkAsDone = async (reminder: ServiceReminder) => {
    const targetDoneDate = todayStr;
    try {
      if (reminder.frequency === 'once') {
        const updated: ServiceReminder = {
          ...reminder,
          lastDoneDate: targetDoneDate,
          mailsSentForCurrentDue: 0,
          completed: true,
        };
        await onSaveReminder(updated);
        showToast('Service Marked Done', `Marked ${reminder.title} as completed.`, 'success');
      } else {
        const monthsToAdd = reminder.frequency === 'monthly' ? 1 : (reminder.frequency === 'every_6_months' ? 6 : 12);
        const nextDueDate = addMonthsClamped(reminder.dueDate, monthsToAdd);
        const updated: ServiceReminder = {
          ...reminder,
          lastDoneDate: targetDoneDate,
          mailsSentForCurrentDue: 0,
          dueDate: nextDueDate,
        };
        await onSaveReminder(updated);
        showToast('Service Marked Done', `Marked done. Next due date set to ${formatIndianDate(nextDueDate)}.`, 'success');
      }
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Could not mark service as done.', 'error');
    }
  };

  // Action: Toggle Pause / Resume
  const handleTogglePause = async (reminder: ServiceReminder) => {
    const nextPaused = !reminder.paused;
    try {
      const updated: ServiceReminder = {
        ...reminder,
        paused: nextPaused,
      };
      await onSaveReminder(updated);
      showToast(
        nextPaused ? 'Reminder Paused' : 'Reminder Resumed',
        `${reminder.title} for ${reminder.vehicleLabel} is now ${nextPaused ? 'paused' : 'active'}.`,
        'info'
      );
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Could not update reminder status.', 'error');
    }
  };

  // Action: Delete confirmed
  const handleConfirmDelete = async () => {
    if (!deletingReminder) return;
    try {
      await onDeleteReminder(deletingReminder.id);
      showToast('Reminder Deleted', `Removed reminder for ${deletingReminder.vehicleLabel}.`, 'success');
      setDeletingReminder(null);
    } catch (err: any) {
      showToast('Delete Failed', err.message || 'Could not delete reminder.', 'error');
    }
  };

  // Action: Send test mail now
  const handleSendTestMail = async (reminder: ServiceReminder) => {
    setTestingReminderId(reminder.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        showToast('Not signed in', 'Please sign in to send test reminder emails.', 'error');
        return;
      }

      const res = await fetch('/api/admin/service-reminders/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reminderId: reminder.id })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Test Mail Sent', data.message || 'Test mail was sent successfully.', 'success');
      } else {
        showToast('Test Mail Notice', data.error || 'Server could not send test mail.', 'error');
      }
    } catch (err: any) {
      showToast('Network error', err.message || 'Could not reach server endpoint.', 'error');
    } finally {
      setTestingReminderId(null);
    }
  };

  // Action: Check today's reminders now
  const handleRunRemindersCheck = async () => {
    setIsRunningCheck(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        showToast('Not signed in', 'Please sign in to trigger reminder checks.', 'error');
        return;
      }

      const res = await fetch('/api/admin/service-reminders/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRunCheckResult({
          show: true,
          success: true,
          summary: `Checked ${data.processedCount || 0} reminders. Sent ${data.mailsSent || 0} mail(s). Skipped ${data.skippedCount || 0}.`,
          details: data.details || [],
        });
      } else {
        setRunCheckResult({
          show: true,
          success: false,
          summary: data.error || 'The server encountered an issue checking reminders.',
          details: data.details || [data.error || 'Permission or configuration issue on server.'],
        });
      }
    } catch (err: any) {
      setRunCheckResult({
        show: true,
        success: false,
        summary: 'Network or server communication failure.',
        details: [err.message || 'Could not connect to /api/admin/service-reminders/run'],
      });
    } finally {
      setIsRunningCheck(false);
    }
  };

  // Open Test Reminder Modal
  const handleOpenTestModal = (defaultVehicleId?: string, defaultReminderId?: string) => {
    const selectedVehId = defaultVehicleId || (approvedCars[0]?.id || vehicles[0]?.id || '');
    setTestVehicleId(selectedVehId);
    if (defaultReminderId) {
      setTestMode('existing_reminder');
      setTestSelectedReminderId(defaultReminderId);
    } else {
      setTestMode('all_types');
      setTestSelectedReminderId('');
    }
    setTestFeedback(null);
    setShowTestModal(true);
  };

  // Send Test Reminder Submit
  const handleSendTestReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveVehicleId = testVehicleId || (approvedCars[0]?.id || vehicles[0]?.id || '');
    if (!effectiveVehicleId && testMode !== 'existing_reminder') {
      showToast('Select Car', 'Please select a car to send the test reminder to.', 'error');
      return;
    }

    setIsSendingCustomTest(true);
    setTestFeedback(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        showToast('Not signed in', 'Please sign in to send test reminder emails.', 'error');
        setIsSendingCustomTest(false);
        return;
      }

      let payload: any = {};
      if (testMode === 'all_types') {
        payload = { vehicleId: effectiveVehicleId, sendAllTypes: true };
      } else if (testMode === 'main_service') {
        payload = {
          vehicleId: effectiveVehicleId,
          kind: 'main_service',
          title: 'Main service',
          daysLeft: testMainDaysLeft
        };
      } else if (testMode === 'part_check') {
        const title = testPartTitle === 'Other' ? (testCustomPartTitle.trim() || 'Part check') : testPartTitle;
        payload = {
          vehicleId: effectiveVehicleId,
          kind: 'part_check',
          title,
          daysLeft: 0
        };
      } else if (testMode === 'existing_reminder') {
        if (!testSelectedReminderId) {
          showToast('Select Reminder', 'Please choose an existing reminder to test.', 'error');
          setIsSendingCustomTest(false);
          return;
        }
        payload = { reminderId: testSelectedReminderId };
      }

      const res = await fetch('/api/admin/service-reminders/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestFeedback({ success: true, message: data.message || 'Test mail was sent successfully.' });
        showToast('Test Mail Sent', data.message || 'Test reminder mail was sent successfully.', 'success');
      } else {
        setTestFeedback({ success: false, message: data.error || 'Failed to send test mail.' });
        showToast('Test Mail Notice', data.error || 'Server could not send test mail.', 'error');
      }
    } catch (err: any) {
      setTestFeedback({ success: false, message: err.message || 'Network error reaching server endpoint.' });
      showToast('Network Error', err.message || 'Could not connect to server.', 'error');
    } finally {
      setIsSendingCustomTest(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ----------------------------------------------------------------- */}
      {/* HEADER & MAIN ACTIONS */}
      {/* ----------------------------------------------------------------- */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-xl font-extrabold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              Car Servicing Reminders
            </h2>
            <span className={`font-mono text-xs px-2 py-0.5 rounded border ${
              theme === 'light' ? 'text-slate-700 bg-slate-100 border-slate-200' : 'text-neutral-400 bg-neutral-900 border-neutral-800'
            }`}>
              {serviceReminders.length} Active Items
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
            Admin desk: Keep track of upcoming car servicing, part replacements, and automated email reminders sent to car owners.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Send test reminder button for all types */}
          <button
            type="button"
            onClick={() => handleOpenTestModal()}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-xs ${
              theme === 'light'
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border-blue-500/30'
            }`}
            title="Send test reminders for all types of reminder"
          >
            <Send className="h-3.5 w-3.5 text-blue-400" />
            <span>Send test reminder</span>
          </button>

          {/* Check today's reminders now button */}
          <button
            type="button"
            onClick={handleRunRemindersCheck}
            disabled={isRunningCheck}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              theme === 'light' 
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200' 
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
            } disabled:opacity-50`}
            title="Run daily check for today's reminders"
          >
            <RotateCw className={`h-3.5 w-3.5 text-emerald-500 ${isRunningCheck ? 'animate-spin' : ''}`} />
            <span>{isRunningCheck ? 'Checking...' : "Check today's reminders now"}</span>
          </button>

          {/* Add reminder button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add reminder</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* TOP SUMMARY CARDS (Simple Everyday Indian-English Words) */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Next main service */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-900/60 border-neutral-800'
        }`}>
          <div>
            <span className={`text-[11px] font-semibold block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
              Next main service
            </span>
            <div className={`text-sm font-bold mt-1 line-clamp-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`} title={topStats.nextMainText}>
              {topStats.nextMainText}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
            <Clock className="h-3.5 w-3.5" />
            <span>{topStats.nextMainSub}</span>
          </div>
        </div>

        {/* Card 2: Due now */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-900/60 border-neutral-800'
        }`}>
          <div>
            <span className={`text-[11px] font-semibold block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
              Due now (in 3 days, today or overdue)
            </span>
            <div className={`text-2xl font-black mt-1 font-mono ${
              topStats.dueNowCount > 0 ? 'text-amber-500' : (theme === 'light' ? 'text-slate-900' : 'text-white')
            }`}>
              {topStats.dueNowCount}
            </div>
          </div>
          <div className={`mt-3 text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
            Requires immediate attention
          </div>
        </div>

        {/* Card 3: Monthly and 6-month checks due this month */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-900/60 border-neutral-800'
        }`}>
          <div>
            <span className={`text-[11px] font-semibold block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
              Checks due this month
            </span>
            <div className={`text-2xl font-black mt-1 font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              {topStats.checksThisMonthCount}
            </div>
          </div>
          <div className={`mt-3 text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
            Part checks scheduled for this month
          </div>
        </div>

        {/* Card 4: Mails sent today */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-900/60 border-neutral-800'
        }`}>
          <div>
            <span className={`text-[11px] font-semibold block ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
              Mails sent today
            </span>
            <div className={`text-2xl font-black mt-1 font-mono text-emerald-500`}>
              {topStats.mailsSentTodayCount}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
            <Mail className="h-3.5 w-3.5" />
            <span>Automated owner notifications</span>
          </div>
        </div>

      </div>

      {/* ----------------------------------------------------------------- */}
      {/* FILTERS & SEARCH BAR */}
      {/* ----------------------------------------------------------------- */}
      <div className={`p-3.5 rounded-xl border flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-neutral-900/60 border-neutral-800'
      }`}>
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <div className={`inline-flex rounded-lg p-0.5 border ${
            theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-neutral-950 border-neutral-800'
          }`}>
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                typeFilter === 'all'
                  ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'bg-neutral-800 text-white')
                  : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('main_service')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                typeFilter === 'main_service'
                  ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'bg-neutral-800 text-white')
                  : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
              }`}
            >
              Main service
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('part_check')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                typeFilter === 'part_check'
                  ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'bg-neutral-800 text-white')
                  : (theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-neutral-400 hover:text-white')
              }`}
            >
              Monthly & 6-month checks
            </button>
          </div>

          {/* Status Dropdown Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border focus:outline-none ${
              theme === 'light' 
                ? 'bg-slate-50 border-slate-200 text-slate-700' 
                : 'bg-neutral-950 border-neutral-800 text-neutral-300'
            }`}
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="reminding_now">Reminding now</option>
            <option value="due_today">Due today</option>
            <option value="overdue">Overdue</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed (Once only)</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search car name or plate..."
            className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none ${
              theme === 'light'
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                : 'bg-neutral-950 border-neutral-800 text-white focus:border-emerald-500'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-neutral-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* LIST GROUPED BY CAR */}
      {/* ----------------------------------------------------------------- */}
      {groupedByCar.length === 0 ? (
        <div className={`p-12 text-center rounded-xl border ${
          theme === 'light' ? 'bg-white border-slate-200 text-slate-500' : 'bg-neutral-900/40 border-neutral-800 text-neutral-500'
        }`}>
          <Wrench className="h-10 w-10 mx-auto stroke-1 opacity-50 mb-2" />
          <p className="text-sm font-semibold">No service reminders match your filter.</p>
          <p className="text-xs mt-1">Click "Add reminder" to schedule car servicing or regular part checks.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByCar.map(([vId, group]) => {
            const owner = userMap.get(group.ownerId);
            const ownerEmail = owner?.email;
            const isOwnerSuspended = owner?.approvalStatus === 'suspended';

            // Car-level summary line
            const carMainServices = group.reminders.filter(
              r => r.kind === 'main_service' && !r.paused && !(r.frequency === 'once' && r.completed)
            );
            const carChecksDue = group.reminders.filter(
              r => r.kind === 'part_check' && !r.paused && !(r.frequency === 'once' && r.completed) && getDaysDiff(r.dueDate, todayStr) <= 3
            ).length;

            let carNextMainStr = 'No main service scheduled';
            if (carMainServices.length > 0) {
              const nearest = carMainServices[0];
              const d = getDaysDiff(nearest.dueDate, todayStr);
              if (d < 0) {
                carNextMainStr = `Next main service ${Math.abs(d)} days overdue`;
              } else if (d === 0) {
                carNextMainStr = `Next main service due today`;
              } else {
                carNextMainStr = `Next main service in ${d} day${d === 1 ? '' : 's'}`;
              }
            }

            return (
              <div
                key={vId}
                className={`rounded-xl border overflow-hidden transition-all ${
                  theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-900/60 border-neutral-800'
                }`}
              >
                {/* Car Group Header */}
                <div className={`px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-neutral-950/70 border-neutral-800'
                }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Car className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      {group.vehicleLabel}
                    </span>
                    <span className="text-xs text-neutral-400">·</span>
                    <span className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                      Owner: {owner?.name || 'Owner'}
                    </span>

                    {/* Owner warning badges */}
                    {!ownerEmail && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        No owner email
                      </span>
                    )}
                    {isOwnerSuspended && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        Owner suspended — mail skipped
                      </span>
                    )}
                  </div>

                  {/* Summary line for this car */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-500 font-semibold">{carNextMainStr}</span>
                    <span className="text-neutral-400">·</span>
                    <span className={`font-semibold ${carChecksDue > 0 ? 'text-amber-500' : (theme === 'light' ? 'text-slate-600' : 'text-neutral-400')}`}>
                      {carChecksDue} checks due
                    </span>
                  </div>
                </div>

                {/* Reminder Rows Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b ${
                      theme === 'light' ? 'bg-slate-50/40 text-slate-500 border-slate-200' : 'bg-neutral-950/40 text-neutral-400 border-neutral-800'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Service Item</th>
                        <th className="py-2.5 px-3 font-semibold">Type</th>
                        <th className="py-2.5 px-3 font-semibold">Due Date</th>
                        <th className="py-2.5 px-3 font-semibold">Days Left</th>
                        <th className="py-2.5 px-3 font-semibold">Status</th>
                        <th className="py-2.5 px-3 font-semibold">Mail Schedule</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${theme === 'light' ? 'divide-slate-100' : 'divide-neutral-800/80'}`}>
                      {group.reminders.map(r => {
                        const days = getDaysDiff(r.dueDate, todayStr);
                        const statusObj = getReminderStatus(r);

                        // Days Left text & styling
                        let daysLeftElement;
                        if (r.frequency === 'once' && r.completed) {
                          daysLeftElement = <span className="text-slate-400 font-medium">Done</span>;
                        } else if (days < 0) {
                          daysLeftElement = (
                            <span className="text-sm font-black font-mono text-red-500">
                              {Math.abs(days)} day{Math.abs(days) === 1 ? '' : 's'} overdue
                            </span>
                          );
                        } else if (days === 0) {
                          daysLeftElement = (
                            <span className="text-sm font-black font-mono text-amber-500">
                              Due today
                            </span>
                          );
                        } else {
                          daysLeftElement = (
                            <span className={`text-sm font-bold font-mono ${days <= 3 ? 'text-purple-400' : (theme === 'light' ? 'text-slate-900' : 'text-white')}`}>
                              {days} day{days === 1 ? '' : 's'} left
                            </span>
                          );
                        }

                        // Next mail date calculation
                        let nextMailStr = 'None';
                        if (!r.paused && !(r.frequency === 'once' && r.completed)) {
                          if (r.kind === 'main_service') {
                            if (days > 3) {
                              // Mail starts when 3 days left
                              nextMailStr = formatIndianDate(addMonthsClamped(r.dueDate, 0)); // approximated
                              // Exactly 3 days before dueDate:
                              const [y, m, d] = r.dueDate.split('-').map(Number);
                              const targetMailDate = new Date(Date.UTC(y, m - 1, d - 3));
                              nextMailStr = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }).format(targetMailDate);
                            } else if (days > 0) {
                              nextMailStr = 'Today / Next run';
                            } else {
                              nextMailStr = 'Finished for this due';
                            }
                          } else {
                            // Part check
                            nextMailStr = `On due date (${formatIndianDate(r.dueDate)})`;
                          }
                        }

                        return (
                          <tr key={r.id} className={`hover:${theme === 'light' ? 'bg-slate-50/60' : 'bg-neutral-800/40'} transition-colors`}>
                            
                            {/* Title & Notes */}
                            <td className="py-3 px-4">
                              <div className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                                {r.title}
                              </div>
                              {r.notes && (
                                <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                                  {r.notes}
                                </div>
                              )}
                              <div className="text-[10px] text-neutral-500 mt-0.5">
                                Frequency: {r.frequency === 'once' ? 'Only once' : (r.frequency === 'monthly' ? 'Monthly' : (r.frequency === 'every_6_months' ? 'Every 6 months' : 'Every 12 months'))}
                                {r.lastDoneDate ? ` · Last done: ${formatIndianDate(r.lastDoneDate)}` : ''}
                              </div>
                            </td>

                            {/* Kind badge */}
                            <td className="py-3 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                r.kind === 'main_service'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {r.kind === 'main_service' ? 'Main service' : 'Part check'}
                              </span>
                            </td>

                            {/* Due Date */}
                            <td className="py-3 px-3 font-medium">
                              <div className={theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}>
                                {formatIndianDate(r.dueDate)}
                              </div>
                            </td>

                            {/* Big Days Left */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {daysLeftElement}
                            </td>

                            {/* Status Badge */}
                            <td className="py-3 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                statusObj.color === 'red'
                                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                  : statusObj.color === 'amber'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : statusObj.color === 'purple'
                                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                  : statusObj.color === 'zinc'
                                  ? 'bg-neutral-500/15 text-neutral-400 border border-neutral-500/30'
                                  : statusObj.color === 'slate'
                                  ? 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {statusObj.label}
                              </span>
                            </td>

                            {/* Mail Tracking */}
                            <td className="py-3 px-3 text-[11px]">
                              {r.kind === 'main_service' ? (
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-neutral-300">
                                    Mails sent: {r.mailsSentForCurrentDue || 0} of 3
                                  </div>
                                  <div className="text-[10px] text-neutral-500">
                                    Next mail: {nextMailStr}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="text-neutral-300">
                                    Last mail: {r.lastMailDate ? formatIndianDate(r.lastMailDate) : 'None'}
                                  </div>
                                  <div className="text-[10px] text-neutral-500">
                                    Next mail: {nextMailStr}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                
                                {/* Mark as done */}
                                {!(r.frequency === 'once' && r.completed) && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAsDone(r)}
                                    className="px-2 py-1 text-[11px] font-semibold rounded bg-emerald-600/90 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                                    title="Mark done and advance to next due date"
                                  >
                                    Mark as done
                                  </button>
                                )}

                                {/* Pause / Resume */}
                                <button
                                  type="button"
                                  onClick={() => handleTogglePause(r)}
                                  className={`p-1 rounded border text-xs transition-colors cursor-pointer ${
                                    theme === 'light'
                                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                                      : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-300'
                                  }`}
                                  title={r.paused ? 'Resume reminder' : 'Pause reminder'}
                                >
                                  {r.paused ? <Play className="h-3.5 w-3.5 text-emerald-400" /> : <Pause className="h-3.5 w-3.5 text-neutral-400" />}
                                </button>

                                {/* Edit */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(r)}
                                  className={`p-1 rounded border text-xs transition-colors cursor-pointer ${
                                    theme === 'light'
                                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                                      : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-300'
                                  }`}
                                  title="Edit reminder"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>

                                {/* Send test mail now */}
                                <button
                                  type="button"
                                  onClick={() => handleSendTestMail(r)}
                                  disabled={testingReminderId === r.id}
                                  className={`p-1 rounded border text-xs transition-colors cursor-pointer ${
                                    theme === 'light'
                                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                                      : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-300'
                                  } disabled:opacity-50`}
                                  title="Send test email now to car owner"
                                >
                                  <Send className={`h-3.5 w-3.5 text-blue-400 ${testingReminderId === r.id ? 'animate-pulse' : ''}`} />
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => setDeletingReminder(r)}
                                  className="p-1 rounded border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                                  title="Delete reminder"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>

                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* ADD / EDIT REMINDER IN-APP DIALOG */}
      {/* ----------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'
          }`}>
            
            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b px-5 py-3.5 ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950 border-neutral-800'
            }`}>
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-emerald-500" />
                <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  {editingReminder ? 'Edit Service Reminder' : 'Add Service Reminder'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-neutral-400 hover:text-white rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 overflow-y-auto text-xs">
              
              {/* Car Selection */}
              <div>
                <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                  Car
                </label>
                <select
                  value={formVehicleId}
                  onChange={(e) => setFormVehicleId(e.target.value)}
                  required
                  className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-neutral-950 border-neutral-800 text-white'
                  }`}
                >
                  <option value="">-- Choose Car --</option>
                  {approvedCars.map(c => {
                    const owner = userMap.get(c.ownerId);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.make} {c.model} ({c.licensePlate}) — Owner: {owner?.name || c.ownerName}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Reminder Type Selection */}
              <div>
                <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                  Type of Reminder
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormKind('main_service');
                      setFormTitle('Main service');
                      setFormFrequency('every_12_months');
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      formKind === 'main_service'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                        : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-neutral-800 bg-neutral-950 text-neutral-400')
                    }`}
                  >
                    Main Service
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormKind('part_check');
                      setFormFrequency('every_6_months');
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      formKind === 'part_check'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                        : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-neutral-800 bg-neutral-950 text-neutral-400')
                    }`}
                  >
                    Part Check
                  </button>
                </div>
              </div>

              {/* Main Service Fields */}
              {formKind === 'main_service' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                      Next Service Date
                    </label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      required
                      className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-neutral-950 border-neutral-800 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                      Repeat Frequency
                    </label>
                    <select
                      value={formFrequency}
                      onChange={(e) => setFormFrequency(e.target.value as ServiceReminderFrequency)}
                      className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-neutral-950 border-neutral-800 text-white'
                      }`}
                    >
                      <option value="once">Only once</option>
                      <option value="every_6_months">Every 6 months</option>
                      <option value="every_12_months">Every 12 months</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Part Check Fields */}
              {formKind === 'part_check' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                      Part to Check
                    </label>
                    <select
                      value={formPartSelect}
                      onChange={(e) => setFormPartSelect(e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-neutral-950 border-neutral-800 text-white'
                      }`}
                    >
                      {PART_CHECK_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {formPartSelect === 'Other' && (
                    <div>
                      <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                        Custom Part Name
                      </label>
                      <input
                        type="text"
                        value={formCustomPart}
                        onChange={(e) => setFormCustomPart(e.target.value)}
                        placeholder="e.g. Transmission fluid, Spark plugs"
                        required
                        className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 ${
                          theme === 'light'
                            ? 'bg-slate-50 border-slate-300 text-slate-900'
                            : 'bg-neutral-950 border-neutral-800 text-white'
                        }`}
                      />
                    </div>
                  )}

                  <div>
                    <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                      How Often
                    </label>
                    <select
                      value={formFrequency}
                      onChange={(e) => setFormFrequency(e.target.value as ServiceReminderFrequency)}
                      className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-neutral-950 border-neutral-800 text-white'
                      }`}
                    >
                      <option value="monthly">Every month</option>
                      <option value="every_6_months">Every 6 months</option>
                      <option value="once">Only once</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                      First Due Date
                    </label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      required
                      className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 ${
                        theme === 'light'
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-neutral-950 border-neutral-800 text-white'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                  Notes (Optional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Check synthetic oil 5W-30 level, brake disc wear"
                  rows={2}
                  className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 ${
                    theme === 'light'
                      ? 'bg-slate-50 border-slate-300 text-slate-900'
                      : 'bg-neutral-950 border-neutral-800 text-white'
                  }`}
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-3 py-1.5 rounded-lg border font-medium ${
                    theme === 'light' ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : (editingReminder ? 'Save Changes' : 'Schedule Reminder')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* DELETE CONFIRMATION IN-APP DIALOG */}
      {/* ----------------------------------------------------------------- */}
      {deletingReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'
          }`}>
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                Delete Service Reminder?
              </h3>
            </div>
            <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
              Are you sure you want to delete the reminder for <strong>{deletingReminder.title}</strong> on{' '}
              <strong>{deletingReminder.vehicleLabel}</strong>? Automated email reminders will stop.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingReminder(null)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  theme === 'light' ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* CHECK TODAY'S REMINDERS RESULT MODAL */}
      {/* ----------------------------------------------------------------- */}
      {runCheckResult?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-2xl border p-5 space-y-3.5 shadow-2xl ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-neutral-900 border-neutral-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {runCheckResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                )}
                <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  {runCheckResult.success ? 'Daily Reminder Run Completed' : 'Daily Reminder Notice'}
                </h3>
              </div>
              <button
                onClick={() => setRunCheckResult(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className={`text-xs font-medium ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
              {runCheckResult.summary}
            </p>

            {(runCheckResult.summary.includes('Permission') || runCheckResult.summary.includes('PERMISSION_DENIED') || runCheckResult.details?.some(d => d.includes('Permission') || d.includes('PERMISSION_DENIED'))) && (
              <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/30 space-y-1">
                <strong className="block text-amber-200">Server Credential Setup Required:</strong>
                <p className="text-[10px] leading-relaxed text-neutral-300">
                  The backend server reads Firestore via the Firebase Admin SDK, which requires Google Cloud IAM permissions. Add your service account key as a secret named <code className="text-amber-200 bg-neutral-900 px-1 py-0.5 rounded">FIREBASE_SERVICE_ACCOUNT_KEY</code> or grant the Cloud Run runtime service account the <strong>Cloud Datastore User</strong> role on project <code className="text-amber-200 bg-neutral-900 px-1 py-0.5 rounded">crested-dream-fkx2q</code>.
                </p>
              </div>
            )}

            {runCheckResult.details && runCheckResult.details.length > 0 && (
              <div className={`p-3 rounded-lg border max-h-48 overflow-y-auto space-y-1 text-[11px] ${
                theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-neutral-950 border-neutral-800 text-neutral-400 font-mono'
              }`}>
                {runCheckResult.details.map((d, idx) => (
                  <div key={idx} className="leading-snug">{d}</div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setRunCheckResult(null)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SEND TEST REMINDERS IN-APP DIALOG (For all types of reminder) */}
      {/* ----------------------------------------------------------------- */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden my-8 flex flex-col ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-neutral-900 border-neutral-800 text-neutral-100'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-3.5 border-b ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950 border-neutral-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    Send Test Reminder Mail
                  </h3>
                  <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                    Simulate and send test emails for any or all types of reminders
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTestModal(false);
                  setTestFeedback(null);
                }}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  theme === 'light' ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-neutral-800 text-neutral-400'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSendTestReminderSubmit} className="p-5 space-y-4 text-xs">
              {/* Feedback Banner if already triggered */}
              {testFeedback && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testFeedback.success
                    ? (theme === 'light' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300')
                    : (theme === 'light' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-red-950/30 border-red-500/30 text-red-300')
                }`}>
                  {testFeedback.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="font-semibold block">{testFeedback.success ? 'Test Successful' : 'Notice'}</span>
                    <span className="text-[11px] leading-relaxed">{testFeedback.message}</span>
                    {(testFeedback.message.includes('Permission') || testFeedback.message.includes('PERMISSION_DENIED')) && (
                      <div className="mt-2 text-[11px] text-amber-300 bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/30 space-y-1">
                        <strong className="block text-amber-200">Server Credential Setup Required:</strong>
                        <p className="text-[10px] leading-relaxed text-neutral-300">
                          The backend server reads Firestore via the Firebase Admin SDK, which requires Google Cloud IAM permissions. Add your service account key as a secret named <code className="text-amber-200 bg-neutral-900 px-1 py-0.5 rounded">FIREBASE_SERVICE_ACCOUNT_KEY</code> or grant the Cloud Run runtime service account the <strong>Cloud Datastore User</strong> role on project <code className="text-amber-200 bg-neutral-900 px-1 py-0.5 rounded">crested-dream-fkx2q</code>.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 1. Target Car */}
              <div>
                <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                  Target Car & Owner
                </label>
                <select
                  value={testVehicleId || (selectedTestVehicle?.id || '')}
                  onChange={(e) => setTestVehicleId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border font-medium transition-colors ${
                    theme === 'light'
                      ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                      : 'bg-neutral-950 border-neutral-700 text-white focus:border-blue-400'
                  } outline-none`}
                >
                  {approvedCars.length === 0 ? (
                    <option value="">No approved cars found</option>
                  ) : (
                    approvedCars.map(c => {
                      const owner = userMap.get(c.ownerId);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.make} {c.model} ({c.licensePlate}) — Owner: {owner?.name || c.ownerName || 'Owner'}
                        </option>
                      );
                    })
                  )}
                </select>

                {/* Owner Recipient Info Box */}
                {selectedTestOwner && (
                  <div className={`mt-2 p-2.5 rounded-lg border text-[11px] flex items-center justify-between ${
                    selectedTestOwner.approvalStatus === 'suspended'
                      ? (theme === 'light' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-950/20 border-amber-500/30 text-amber-300')
                      : !selectedTestOwner.email
                      ? (theme === 'light' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-red-950/20 border-red-500/30 text-red-300')
                      : (theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-neutral-950 border-neutral-800 text-neutral-300')
                  }`}>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span>
                        Recipient: <strong>{selectedTestOwner.name}</strong> ({selectedTestOwner.email || 'No email registered'})
                      </span>
                    </div>
                    {selectedTestOwner.approvalStatus === 'suspended' && (
                      <span className="font-bold text-amber-500 text-[10px]">Suspended</span>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Choose What to Test */}
              <div>
                <label className={`block font-semibold mb-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                  Reminder Type to Test
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestMode('all_types')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      testMode === 'all_types'
                        ? (theme === 'light' ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-xs' : 'border-blue-500 bg-blue-950/30 text-blue-300 shadow-xs')
                        : (theme === 'light' ? 'border-slate-200 hover:bg-slate-50 text-slate-700' : 'border-neutral-800 hover:bg-neutral-800 text-neutral-400')
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>🚀 All Types at Once</span>
                    </div>
                    <span className="text-[10px] opacity-80 block mt-0.5">
                      Sends test for Main Service + Part Check
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestMode('main_service')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      testMode === 'main_service'
                        ? (theme === 'light' ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs' : 'border-emerald-500 bg-emerald-950/30 text-emerald-300 shadow-xs')
                        : (theme === 'light' ? 'border-slate-200 hover:bg-slate-50 text-slate-700' : 'border-neutral-800 hover:bg-neutral-800 text-neutral-400')
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>🚗 Main Service</span>
                    </div>
                    <span className="text-[10px] opacity-80 block mt-0.5">
                      3-day daily email countdown
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestMode('part_check')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      testMode === 'part_check'
                        ? (theme === 'light' ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-xs' : 'border-purple-500 bg-purple-950/30 text-purple-300 shadow-xs')
                        : (theme === 'light' ? 'border-slate-200 hover:bg-slate-50 text-slate-700' : 'border-neutral-800 hover:bg-neutral-800 text-neutral-400')
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>🔧 Part Check</span>
                    </div>
                    <span className="text-[10px] opacity-80 block mt-0.5">
                      Single item check due today
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestMode('existing_reminder')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      testMode === 'existing_reminder'
                        ? (theme === 'light' ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs' : 'border-amber-500 bg-amber-950/30 text-amber-300 shadow-xs')
                        : (theme === 'light' ? 'border-slate-200 hover:bg-slate-50 text-slate-700' : 'border-neutral-800 hover:bg-neutral-800 text-neutral-400')
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>📋 Existing Reminder</span>
                    </div>
                    <span className="text-[10px] opacity-80 block mt-0.5">
                      Pick from scheduled list
                    </span>
                  </button>
                </div>
              </div>

              {/* Sub-options based on selected mode */}
              {testMode === 'main_service' && (
                <div className={`p-3 rounded-xl border space-y-2 ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950 border-neutral-800'
                }`}>
                  <label className={`block font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                    Simulate Days Left (Countdown Stage)
                  </label>
                  <select
                    value={testMainDaysLeft}
                    onChange={(e) => setTestMainDaysLeft(Number(e.target.value))}
                    className={`w-full px-3 py-1.5 rounded-lg border ${
                      theme === 'light' ? 'bg-white border-slate-300 text-slate-900' : 'bg-neutral-900 border-neutral-700 text-white'
                    } outline-none`}
                  >
                    <option value={3}>3 days left — Mail 1 of 3 (Initial warning)</option>
                    <option value={2}>2 days left — Mail 2 of 3 (Second reminder)</option>
                    <option value={1}>1 day left — Mail 3 of 3 (Final notice before due)</option>
                    <option value={0}>0 days left — Due Today</option>
                  </select>
                </div>
              )}

              {testMode === 'part_check' && (
                <div className={`p-3 rounded-xl border space-y-2.5 ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950 border-neutral-800'
                }`}>
                  <div>
                    <label className={`block font-semibold mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                      Select Part to Check
                    </label>
                    <select
                      value={testPartTitle}
                      onChange={(e) => setTestPartTitle(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg border ${
                        theme === 'light' ? 'bg-white border-slate-300 text-slate-900' : 'bg-neutral-900 border-neutral-700 text-white'
                      } outline-none`}
                    >
                      {PART_CHECK_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  {testPartTitle === 'Other' && (
                    <div>
                      <label className={`block font-medium mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                        Custom Part Name
                      </label>
                      <input
                        type="text"
                        value={testCustomPartTitle}
                        onChange={(e) => setTestCustomPartTitle(e.target.value)}
                        placeholder="e.g. Brake booster check"
                        className={`w-full px-3 py-1.5 rounded-lg border ${
                          theme === 'light' ? 'bg-white border-slate-300 text-slate-900' : 'bg-neutral-900 border-neutral-700 text-white'
                        } outline-none`}
                      />
                    </div>
                  )}
                </div>
              )}

              {testMode === 'existing_reminder' && (
                <div className={`p-3 rounded-xl border space-y-2 ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-neutral-950 border-neutral-800'
                }`}>
                  <label className={`block font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                    Choose from Scheduled Reminders
                  </label>
                  <select
                    value={testSelectedReminderId}
                    onChange={(e) => setTestSelectedReminderId(e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-lg border ${
                      theme === 'light' ? 'bg-white border-slate-300 text-slate-900' : 'bg-neutral-900 border-neutral-700 text-white'
                    } outline-none`}
                  >
                    <option value="">-- Choose a scheduled reminder --</option>
                    {serviceReminders.map(r => (
                      <option key={r.id} value={r.id}>
                        [{r.kind === 'main_service' ? 'Main service' : 'Part check'}] {r.title} — {r.vehicleLabel} (Due: {r.dueDate})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {testMode === 'all_types' && (
                <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                  theme === 'light' ? 'bg-blue-50/60 border-blue-200 text-blue-900' : 'bg-blue-950/20 border-blue-500/30 text-blue-300'
                }`}>
                  ℹ️ <strong>Comprehensive Test:</strong> This sends two distinct emails (one Main Service reminder and one Part Check reminder) with the <code>TEST:</code> prefix so the car owner and admin can verify all automated templates.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800/60">
                <button
                  type="button"
                  onClick={() => {
                    setShowTestModal(false);
                    setTestFeedback(null);
                  }}
                  className={`px-3.5 py-2 rounded-lg border font-medium text-xs transition-colors cursor-pointer ${
                    theme === 'light' ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSendingCustomTest}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {isSendingCustomTest ? (
                    <>
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Sending Test Reminder...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Test Reminder Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
