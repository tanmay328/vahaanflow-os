import React, { useState, useMemo } from 'react';
import { AuditRecord, Vehicle } from '../types/rental';
import { 
  Search, 
  Download,
  Lock
} from 'lucide-react';

interface AuditLogViewerProps {
  logs: AuditRecord[];
  vehicles: Vehicle[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
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
  }, [logs, selectedCategory, selectedSeverity, searchQuery]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Activity History (Read-only)</h2>
            <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Lock className="h-3 w-3" />
              <span>CANNOT BE CHANGED</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Permanent record of car handovers, returns, deposit refunds, fee waivers, and owner payouts.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download History (CSV)</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search activity, person name, car plate, or booking..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/80 pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
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
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
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
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-950 text-neutral-400 font-semibold border-b border-neutral-800">
            <tr>
              <th className="py-2.5 px-3">Date & Time</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Activity & Details</th>
              <th className="py-2.5 px-3">Done By</th>
              <th className="py-2.5 px-3">Car Plate</th>
              <th className="py-2.5 px-3">Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/80 font-mono text-[11px]">
            {filteredLogs.map(log => {
              const isExpanded = expandedLogId === log.id;

              return (
                <React.Fragment key={log.id}>
                  <tr 
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="hover:bg-neutral-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 text-neutral-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-800 text-neutral-200 border border-neutral-700 uppercase">
                        {log.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans max-w-md">
                      <div className="font-semibold text-white">{log.action}</div>
                      <div className="text-[11px] text-neutral-400 truncate mt-0.5">{log.summary}</div>
                    </td>
                    <td className="py-3 px-3 text-neutral-300 font-sans">
                      <div>{log.actor.name}</div>
                      <div className="text-[10px] text-neutral-500 font-mono capitalize">{log.actor.role}</div>
                    </td>
                    <td className="py-3 px-3 text-emerald-400">
                      {log.vehiclePlate || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                        log.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        log.severity === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        log.severity === 'notice' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-neutral-800 text-neutral-400'
                      }`}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>

                  {isExpanded && log.changes && (
                    <tr className="bg-neutral-950/80">
                      <td colSpan={6} className="py-3 px-6">
                        <div className="space-y-1 font-mono text-[10px] text-neutral-400">
                          <strong className="text-white block font-sans">Field Changes:</strong>
                          {log.changes.map((c, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-emerald-400">{c.field}:</span>
                              <span className="text-red-400 line-through">{String(c.before)}</span>
                              <span>&rarr;</span>
                              <span className="text-emerald-300">{String(c.after)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
