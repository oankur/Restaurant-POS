import { useEffect, useState } from 'react';
import { getTables, createTable, updateTable, deleteTable } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { Table } from '../../types';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 border-green-300 text-green-800',
  OCCUPIED: 'bg-red-100 border-red-300 text-red-800',
  RESERVED: 'bg-yellow-100 border-yellow-300 text-yellow-800',
};

export default function OutletAdminTables() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const [tables, setTables] = useState<Table[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ number: '', capacity: '' });

  const load = () => getTables(outletId).then(setTables);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTable({ number: parseInt(form.number), capacity: parseInt(form.capacity), outletId } as any);
      toast.success('Table added');
      setShowModal(false);
      load();
    } catch { toast.error('Error adding table'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this table?')) return;
    await deleteTable(id);
    toast.success('Table deleted');
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tables</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>Add Table</button>
      </div>

      <div className="grid grid-cols-4 xl:grid-cols-6 gap-4">
        {tables.map((table) => (
          <div key={table.id} className={`border-2 rounded-xl p-4 text-center ${statusColors[table.status]}`}>
            <div className="text-2xl font-bold">T{table.number}</div>
            <div className="text-xs mt-1">{table.capacity} seats</div>
            <div className="text-xs font-medium mt-2">{table.status}</div>
            <button className="mt-3 text-xs text-red-400 hover:text-red-600 font-medium" onClick={() => handleDelete(table.id)}>Remove</button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-semibold text-lg mb-4">Add Table</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="label">Table Number</label><input type="number" className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required /></div>
              <div><label className="label">Capacity (seats)</label><input type="number" className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
