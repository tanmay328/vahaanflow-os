import React, { useState, useMemo } from 'react';
import { AuditRecord, Vehicle } from '../types/rental';
import { 
  Search, 
  Download,
  Lock,
  ShieldAlert,
  Building2,
  User
} from 'lucide-react';

interface AuditLogViewerProps {
  logs: AuditRecord[];
  vehicles: Vehicle[];
  theme?: 'dark' | 'light';
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs, theme = 'dark' }) => {
  const [actorRoleFilter, setActorRoleFilter] = useState<'all' | 'admin' | 'owner' | 'renter'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Counts for the Role Switcher
  const adminLogsCount = useMemo(() => logs.filter(l => l.actor?.role === 'admin').length, [logs]);
  const ownerLogsCount = useMemo(() => logs.filter(l => l.actor?.role === 'vehicle_owner' || (l.actor?.role as string) === 'owner').length, [logs]);
  const customerLogsCount = useMemo(() => logs.filter(l => l.actor?.role === 'renter' || (l.actor?.role as string) === 'customer').length, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Role Switcher filter
      if (actorRoleFilter !== 'all') {
        if (actorRoleFilter === 'admin' && log.actor?.role !== 'admin') return false;
        if (actorRoleFilter === 'owner' && log.actor?.role !== 'vehicle_owner' && (log.actor?.role as string) !== 'owner') return false;
        if (actorRoleFilter === 'renter' && log.actor?.role !== 'renter' && (log.actor?.role as string) !== 'customer') return false;
      }
      if (selectedCategory !== 'all' && log.category !== selectedCategory) return false;
      if (selectedSeverity !== 'all' && log.severity !== selectedSeverity) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchSummary = log.summary.toLowerCase().includes(query);
        const matchAction = log.action.toLowerCase().includes(query);
        const matchActor = log.actor.name.toLowerCase().includes(query) || (log.actor.role || '').toLowerCase().includes(query);
        const matchPlate = (log.vehiclePlate || '').toLowerCase().includes(query);
        const matchBooking = (log.bookingCode || '').toLowerCase().includes(query);
        return matchSummary || matchAction || matchActor || matchPlate || matchBooking;
      }
      return true;
    });
  }, [logs, actorRoleFilter, selectedCategory, selectedSeverity, searchQuery]);

  const handleExportCSV = () => {
    let csv = 'Date Time,Category,Action,Summary,User Name,User Role,Car Plate,Booking Number,Level\n';
    filteredLogs.forEach(l => {
      csv += `"${l.timestamp}","${l.category}","${l.action}","${l.summary.replace(/"/g, '""')}","${l.actor.name}","${l.actor.role}","${l.vehiclePlate || ''}","${l.bookingCode || ''}","${l.severity}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `VahaanFlow_Activity_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-xl font-extrabold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Activity History (Read-only)</h2>
            <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Lock className="h-3 w-3" />
              <span>CANNOT BE CHANGED</span>
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
            Permanent record of car handovers, returns, deposit refunds, fee waivers, and owner payouts.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors self-start sm:self-auto ${
            theme === 'light'
              ? 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200'
              : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
          }`}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download History (CSV)</span>
        </button>
      </div>

      {/* Role Switcher Bar on top for organizing changes made by admin / owner / customer */}
      <div className={`p-2 rounded-xl border flex flex-wrap items-center gap-1.5 ${
        theme === 'light' ? 'bg-slate-100/90 border-slate-200' : 'bg-neutral-900/90 border-neutral-800'
      }`}>
        <button
          type="button"
          onClick={() => setActorRoleFilter('all')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            actorRoleFilter === 'all'
              ? (theme === 'light' ? 'bg-white text-slate-900 shadow-sm font-bold ring-1 ring-slate-300' : 'bg-neutral-800 text-white shadow-sm font-bold ring-1 ring-neutral-700')
              : (theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50')
          }`}
        >
          <span>All Activities</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            actorRoleFilter === 'all'
              ? (theme === 'light' ? 'bg-slate-200 text-slate-900 font-bold' : 'bg-neutral-700 text-white font-bold')
              : (theme === 'light' ? 'bg-slate-200/80 text-slate-600' : 'bg-neutral-800 text-neutral-400')
          }`}>
            {logs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActorRoleFilter('admin')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            actorRoleFilter === 'admin'
              ? (theme === 'light' ? 'bg-white text-indigo-950 shadow-sm ring-1 ring-indigo-400 font-bold' : 'bg-neutral-800 text-indigo-300 shadow-sm ring-1 ring-indigo-500/60 font-bold')
              : (theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50')
          }`}
        >
          <ShieldAlert className="h-4 w-4 text-indigo-500 shrink-0" />
          <span>changes made by admin</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            actorRoleFilter === 'admin'
              ? (theme === 'light' ? 'bg-indigo-100 text-indigo-900 font-bold' : 'bg-indigo-500/30 text-indigo-200 font-bold')
              : (theme === 'light' ? 'bg-slate-200/80 text-slate-600' : 'bg-neutral-800 text-neutral-400')
          }`}>
            {adminLogsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActorRoleFilter('owner')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            actorRoleFilter === 'owner'
              ? (theme === 'light' ? 'bg-white text-amber-950 shadow-sm ring-1 ring-amber-400 font-bold' : 'bg-neutral-800 text-amber-300 shadow-sm ring-1 ring-amber-500/60 font-bold')
              : (theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50')
          }`}
        >
          <Building2 className="h-4 w-4 text-amber-500 shrink-0" />
          <span>changes made by owner</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            actorRoleFilter === 'owner'
              ? (theme === 'light' ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-amber-500/30 text-amber-200 font-bold')
              : (theme === 'light' ? 'bg-slate-200/80 text-slate-600' : 'bg-neutral-800 text-neutral-400')
          }`}>
            {ownerLogsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActorRoleFilter('renter')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
            actorRoleFilter === 'renter'
              ? (theme === 'light' ? 'bg-white text-emerald-950 shadow-sm ring-1 ring-emerald-400 font-bold' : 'bg-neutral-800 text-emerald-300 shadow-sm ring-1 ring-emerald-500/60 font-bold')
              : (theme === 'light' ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50')
          }`}
        >
          <User className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>changes made by customer</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            actorRoleFilter === 'renter'
              ? (theme === 'light' ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-emerald-500/30 text-emerald-200 font-bold')
              : (theme === 'light' ? 'bg-slate-200/80 text-slate-600' : 'bg-neutral-800 text-neutral-400')
          }`}>
            {customerLogsCount}
          </span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-2.5 h-4 w-4 ${theme === 'light' ? 'text-slate-400' : 'text-neutral-500'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search activity, person name, car plate, or booking..."
            className={`w-full rounded-lg border pl-9 pr-3 py-2 text-xs transition-colors focus:outline-none ${
              theme === 'light'
                ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                : 'bg-neutral-900/80 border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className={`rounded-lg border px-3 py-2 text-xs focus:outline-none ${
              theme === 'light'
                ? 'bg-white border-slate-300 text-slate-900 shadow-sm'
                : 'bg-neutral-900 border-neutral-800 text-white'
            }`}
          >
            <option value="all">All Activities</option>
            <option value="CHECK_OUT">Car Handover</option>
            <option value="CHECK_IN">Car Return & Bill</option>
            <option value="PENALTY">Fines & Waivers</option>
            <option value="PAYOUT">Owner Payouts</option>
            <option value="VEHICLE">Car Changes</option>
            <option value="BOOKING">Bookings</option>
            <option value="KYC">ID Verification</option>
            <option value="DISPUTE">Complaints</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={e => setSelectedSeverity(e.target.value)}
            className={`rounded-lg border px-3 py-2 text-xs focus:outline-none ${
              theme === 'light'
                ? 'bg-white border-slate-300 text-slate-900 shadow-sm'
                : 'bg-neutral-900 border-neutral-800 text-white'
            }`}
          >
            <option value="all">All Priority Levels</option>
            <option value="info">Normal</option>
            <option value="notice">Notice</option>
            <option value="warning">Important</option>
            <option value="critical">Alert</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className={`rounded-xl border overflow-hidden ${
        theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-900/40 border-neutral-800'
      }`}>
        <table className="w-full text-left text-xs">
          <thead className={`font-semibold border-b ${
            theme === 'light' ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
          }`}>
            <tr>
              <th className="py-2.5 px-3">Date & Time</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Activity & Details</th>
              <th className="py-2.5 px-3">Done By</th>
              <th className="py-2.5 px-3">Car Plate</th>
              <th className="py-2.5 px-3">Level</th>
            </tr>
          </thead>
          <tbody className={`divide-y font-mono text-[11px] ${
            theme === 'light' ? 'divide-slate-100' : 'divide-neutral-800/80'
          }`}>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className={`py-12 text-center text-xs ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                  No activity history or changes found matching {actorRoleFilter === 'admin' ? '"changes made by admin"' : actorRoleFilter === 'owner' ? '"changes made by owner"' : actorRoleFilter === 'renter' ? '"changes made by customer"' : 'the selected filters'}.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => {
                const isExpanded = expandedLogId === log.id;

                return (
                  <React.Fragment key={log.id}>
                    <tr 
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className={`cursor-pointer transition-colors ${
                        theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-neutral-800/40'
                      }`}
                    >
                      <td className={`py-3 px-3 whitespace-nowrap ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase ${
                          theme === 'light' ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-neutral-800 text-neutral-200 border-neutral-700'
                        }`}>
                          {log.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans max-w-md">
                        <div className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{log.action}</div>
                        <div className={`text-[11px] mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>{log.summary}</div>
                      </td>
                      <td className={`py-3 px-3 font-sans ${theme === 'light' ? 'text-slate-800' : 'text-neutral-300'}`}>
                        <div className="font-medium">{log.actor.name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {log.actor.role === 'admin' && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                              theme === 'light' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            }`}>
                              <ShieldAlert className="h-2.5 w-2.5 text-indigo-500" />
                              <span>Admin</span>
                            </span>
                          )}
                          {(log.actor.role === 'vehicle_owner' || (log.actor.role as string) === 'owner') && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                              theme === 'light' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              <Building2 className="h-2.5 w-2.5 text-amber-500" />
                              <span>Car Owner</span>
                            </span>
                          )}
                          {(log.actor.role === 'renter' || (log.actor.role as string) === 'customer') && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                              theme === 'light' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              <User className="h-2.5 w-2.5 text-emerald-500" />
                              <span>Customer</span>
                            </span>
                          )}
                          {log.actor.role === 'system' && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                              theme === 'light' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                            }`}>
                              <span>System</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-3 px-3 font-bold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>
                        {log.vehiclePlate || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                          log.severity === 'critical' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          log.severity === 'warning' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                          log.severity === 'notice' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                          (theme === 'light' ? 'bg-slate-100 text-slate-500' : 'bg-neutral-800 text-neutral-400')
                        }`}>
                          {log.severity}
                        </span>
                      </td>
                    </tr>

                  {isExpanded && log.changes && (
                    <tr className={theme === 'light' ? 'bg-slate-50/50' : 'bg-neutral-950/80'}>
                      <td colSpan={6} className="py-3 px-6">
                        <div className={`space-y-1 font-mono text-[10px] ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
                          <strong className={`block font-sans ${theme === 'light' ? 'text-slate-800 font-extrabold' : 'text-white'}`}>Field Changes:</strong>
                          {log.changes.map((c, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-emerald-600 font-bold">{c.field}:</span>
                              <span className="text-red-500 line-through">{String(c.before)}</span>
                              <span>&rarr;</span>
                              <span className="text-emerald-600 font-bold">{String(c.after)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
