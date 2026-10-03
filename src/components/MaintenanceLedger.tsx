import React, { useState } from 'react';
import { MaintenanceLog, Vehicle } from '../types/rental';
import { 
  Wrench, 
  Plus, 
  ShieldCheck, 
  X 
} from 'lucide-react';

interface MaintenanceLedgerProps {
  maintenanceLogs: MaintenanceLog[];
  vehicles: Vehicle[];
  onAddLog: (newLog: MaintenanceLog) => void;
  onCompleteLog: (maintenanceId: string) => void;
}

export const MaintenanceLedger: React.FC<MaintenanceLedgerProps> = ({
  maintenanceLogs,
  vehicles,
  onAddLog,
  onCompleteLog,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Car Servicing & Fitness Certificate Ledger</h2>
            <span className="font-mono text-xs text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
              {maintenanceLogs.length} Records
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Admin desk: Keep track of workshop visits, oil change, brake work, and commercial RTO fitness certificates.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Service Record</span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-950 text-neutral-400 font-semibold border-b border-neutral-800">
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
          <tbody className="divide-y divide-neutral-800/80 font-mono text-[11px]">
            {maintenanceLogs.map(m => (
              <tr key={m.id} className="hover:bg-neutral-800/40">
                <td className="py-3 px-3 font-semibold text-emerald-400">{m.vehiclePlate}</td>
                <td className="py-3 px-3 font-sans">
                  <div className="text-white font-medium">{m.serviceType}</div>
                  <div className="text-[10px] text-neutral-500 font-mono">At: {m.odometer.toLocaleString()} km</div>
                </td>
                <td className="py-3 px-3 text-neutral-300 font-sans">{m.workshopName}</td>
                <td className="py-3 px-3 text-neutral-300 font-bold">₹{m.cost.toLocaleString()}</td>
                <td className="py-3 px-3 text-neutral-400">{m.startDate}</td>
                <td className="py-3 px-3">
                  {m.rtoFitnessVerified ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-sans">
                      <ShieldCheck className="h-3 w-3" />
                      <span>Certified</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-500 font-sans">Mechanical</span>
                  )}
                </td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    m.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {m.status === 'completed' ? 'Finished' : 'In Workshop'}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  {m.status !== 'completed' ? (
                    <button
                      onClick={() => onCompleteLog(m.id)}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-emerald-500 hover:text-neutral-950 text-neutral-300 font-medium text-[10px] transition-colors"
                    >
                      Mark Finished
                    </button>
                  ) : (
                    <span className="text-neutral-500 text-[10px] font-sans">Ready for rent</span>
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
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Wrench className="h-4 w-4 text-emerald-400" />
                <span>Add Car Servicing Record</span>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Select Car</label>
                <select
                  value={selectedVehicleId}
                  onChange={e => setSelectedVehicleId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.licensePlate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Service Type</label>
                <input
                  type="text"
                  required
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                  placeholder="e.g. 10,000 km Service / Brake pads"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Workshop Name & Location</label>
                <input
                  type="text"
                  required
                  value={workshopName}
                  onChange={e => setWorkshopName(e.target.value)}
                  placeholder="e.g. MASS Service Center, Andheri East"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Bill Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={cost}
                  onChange={e => setCost(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Mechanic Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rtoFitnessVerified}
                  onChange={e => setRtoFitnessVerified(e.target.checked)}
                  className="rounded border-neutral-800 text-emerald-500"
                />
                <span>Commercial RTO Fitness Passed</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold"
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
