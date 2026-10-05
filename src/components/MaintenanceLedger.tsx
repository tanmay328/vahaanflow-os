import React, { useState } from 'react';
import { MaintenanceLog, Vehicle } from '../types/rental';
import { 
  Wrench, 
  Plus, 
  ShieldCheck, 
  X,
  RotateCcw
} from 'lucide-react';

interface MaintenanceLedgerProps {
  maintenanceLogs: MaintenanceLog[];
  vehicles: Vehicle[];
  onAddLog: (newLog: MaintenanceLog) => void;
  onCompleteLog: (maintenanceId: string) => void;
  onRevertLog?: (maintenanceId: string) => void;
  theme?: 'dark' | 'light';
}

export const MaintenanceLedger: React.FC<MaintenanceLedgerProps> = ({
  maintenanceLogs,
  vehicles,
  onAddLog,
  onCompleteLog,
  onRevertLog,
  theme = 'dark',
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [serviceType, setServiceType] = useState<string>('Periodic Servicing & Oil Change');
  const [workshopName, setWorkshopName] = useState<string>('Authorized Service Center, Mumbai');
  const [cost, setCost] = useState<number>(8500);
  const [notes, setNotes] = useState<string>('Brake pads replaced, engine oil change, and RTO fitness check.');
  const [rtoFitnessVerified, setRtoFitnessVerified] = useState<boolean>(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = vehicles.find(item => item.id === selectedVehicleId);
    if (!v) return;

    const newLog: MaintenanceLog = {
      id: `maint-${Date.now()}`,
      vehicleId: v.id,
      vehiclePlate: v.licensePlate,
      serviceType,
      workshopName,
      odometer: v.odometer,
      cost: Number(cost),
      startDate: new Date().toISOString().split('T')[0],
      status: 'in_progress',
      notes,
      rtoFitnessVerified,
    };

    onAddLog(newLog);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'light' ? 'border-slate-200' : 'border-neutral-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-xl font-extrabold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Car Servicing & Fitness Certificate Ledger</h2>
            <span className={`font-mono text-xs px-2 py-0.5 rounded border ${
              theme === 'light' ? 'text-slate-700 bg-slate-100 border-slate-200' : 'text-neutral-400 bg-neutral-900 border-neutral-800'
            }`}>
              {maintenanceLogs.length} Records
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>
            Admin desk: Keep track of workshop visits, oil change, brake work, and commercial RTO fitness certificates.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Service Record</span>
        </button>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${
        theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-neutral-900/40 border-neutral-800'
      }`}>
        <table className="w-full text-left text-xs">
          <thead className={`font-semibold border-b ${
            theme === 'light' ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
          }`}>
            <tr>
              <th className="py-2.5 px-3">Car Plate</th>
              <th className="py-2.5 px-3">Service Done</th>
              <th className="py-2.5 px-3">Workshop Name</th>
              <th className="py-2.5 px-3">Cost (₹)</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">RTO Fitness</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className={`divide-y font-mono text-[11px] ${
            theme === 'light' ? 'divide-slate-100' : 'divide-neutral-800/80'
          }`}>
            {maintenanceLogs.map(m => (
              <tr key={m.id} className={theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-neutral-800/40'}>
                <td className={`py-3 px-3 font-semibold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>{m.vehiclePlate || 'N/A'}</td>
                <td className="py-3 px-3 font-sans">
                  <div className={`font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{m.serviceType || 'Routine Maintenance'}</div>
                  <div className={`text-[10px] font-mono ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>At: {(m.odometer || 0).toLocaleString()} km</div>
                </td>
                <td className={`py-3 px-3 font-sans ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>{m.workshopName || 'Authorized Workshop'}</td>
                <td className={`py-3 px-3 font-bold ${theme === 'light' ? 'text-slate-800' : 'text-neutral-300'}`}>₹{(m.cost || 0).toLocaleString()}</td>
                <td className={`py-3 px-3 ${theme === 'light' ? 'text-slate-500' : 'text-neutral-400'}`}>{m.startDate || 'Recent'}</td>
                <td className="py-3 px-3">
                  {m.rtoFitnessVerified ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-sans font-semibold">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      <span>Certified</span>
                    </span>
                  ) : (
                    <span className={`text-[10px] font-sans ${theme === 'light' ? 'text-slate-500' : 'text-neutral-500'}`}>Mechanical</span>
                  )}
                </td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    m.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                  }`}>
                    {m.status === 'completed' ? 'Finished' : 'In Workshop'}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  {m.status !== 'completed' ? (
                    <button
                      type="button"
                      onClick={() => onCompleteLog(m.id)}
                      className={`px-2.5 py-1 rounded font-bold text-[10px] transition-colors cursor-pointer shadow-sm ${
                        theme === 'light'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600'
                          : 'bg-neutral-800 hover:bg-emerald-500 hover:text-neutral-950 text-neutral-300'
                      }`}
                    >
                      Mark Finished
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onRevertLog?.(m.id)}
                      title="Click to undo: return vehicle to In Workshop status"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-medium text-[10px] transition-all cursor-pointer border ${
                        theme === 'light'
                          ? 'border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-800 shadow-sm'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300'
                      }`}
                    >
                      <RotateCcw className="h-3 w-3 text-amber-400" />
                      <span>Ready for rent</span>
                      <span className="text-[9px] text-amber-400/90 font-semibold">(Undo)</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-neutral-900 border-neutral-800 text-neutral-100'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              theme === 'light' ? 'border-slate-100' : 'border-neutral-800'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                <Wrench className="h-4 w-4 text-emerald-600" />
                <span>Add Car Servicing Record</span>
              </div>
              <button onClick={() => setShowAddModal(false)} className={`transition-colors ${theme === 'light' ? 'text-slate-400 hover:text-slate-800' : 'text-neutral-400 hover:text-white'}`}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className={`block mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Select Car</label>
                <select
                  value={selectedVehicleId}
                  onChange={e => setSelectedVehicleId(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900'
                      : 'border-neutral-800 bg-neutral-950 text-white focus:border-emerald-500'
                  }`}
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.licensePlate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Service Type</label>
                <input
                  type="text"
                  required
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                  placeholder="e.g. 10,000 km Service / Brake pads"
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900'
                      : 'border-neutral-800 bg-neutral-950 text-white focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Workshop Name & Location</label>
                <input
                  type="text"
                  required
                  value={workshopName}
                  onChange={e => setWorkshopName(e.target.value)}
                  placeholder="e.g. MASS Service Center, Andheri East"
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900'
                      : 'border-neutral-800 bg-neutral-950 text-white focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Bill Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={cost}
                  onChange={e => setCost(Number(e.target.value))}
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900'
                      : 'border-neutral-800 bg-neutral-950 text-white focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${theme === 'light' ? 'text-slate-600' : 'text-neutral-400'}`}>Mechanic Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 focus:outline-none ${
                    theme === 'light'
                      ? 'border-slate-300 bg-white text-slate-900'
                      : 'border-neutral-800 bg-neutral-950 text-white focus:border-emerald-500'
                  }`}
                />
              </div>

              <label className={`flex items-center gap-2 pt-1 cursor-pointer ${theme === 'light' ? 'text-slate-700' : 'text-neutral-300'}`}>
                <input
                  type="checkbox"
                  checked={rtoFitnessVerified}
                  onChange={e => setRtoFitnessVerified(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600"
                />
                <span>Commercial RTO Fitness Passed</span>
              </label>

              <div className={`flex justify-end gap-2 pt-3 border-t ${
                theme === 'light' ? 'border-slate-100' : 'border-neutral-800'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-3 py-1.5 rounded-lg border font-semibold ${
                    theme === 'light'
                      ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                >
                  Save Service Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
