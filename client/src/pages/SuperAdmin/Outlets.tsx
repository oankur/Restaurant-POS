import { useEffect, useState } from 'react';
import { getOutlets, createOutlet, updateOutlet, deleteOutlet } from '../../api';
import type { Outlet } from '../../types';
import toast from 'react-hot-toast';

const emptyForm = { name: '', address: '', phone: '', username: '', password: '', managerPassword: '' };

export default function AdminOutlets() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<Outlet | null>(null);
  const [confirmName, setConfirmName] = useState('');

  const load = () => getOutlets().then(setOutlets);
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (o: Outlet) => {
    setEditing(o);
    setForm({ name: o.name, address: o.address, phone: o.phone, username: o.username, password: '', managerPassword: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        const data: any = { name: form.name, address: form.address, phone: form.phone };
        if (form.password) data.password = form.password;
        if (form.managerPassword) data.managerPassword = form.managerPassword;
        await updateOutlet(editing.id, data);
        toast.success('Outlet updated');
      } else {
        await createOutlet(form);
        toast.success('Outlet created');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (o: Outlet) => {
    await updateOutlet(o.id, { isActive: !o.isActive });
    toast.success(`Outlet ${o.isActive ? 'deactivated' : 'activated'}`);
    load();
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    if (confirmName !== confirmRemove.name) {
      toast.error('Outlet name does not match');
      return;
    }
    try {
      await deleteOutlet(confirmRemove.id);
      toast.success('Outlet permanently deleted');
      setConfirmRemove(null);
      setConfirmName('');
      load();
    } catch {
      toast.error('Failed to delete outlet');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Outlets</h1>
        <button className="btn-primary" onClick={openCreate}>Add Outlet</button>
      </div>

      <div className="grid gap-4">
        {outlets.map((o) => (
          <div key={o.id} className="card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{o.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${o.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {o.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{o.address}</p>
              <p className="text-sm text-gray-500">{o.phone}</p>
              <p className="text-xs text-gray-400 mt-1">
                Login: <span className="font-mono">{o.username}</span>
                {' · '}Tax: {(o.taxRate * 100).toFixed(0)}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-secondary text-sm" onClick={() => openEdit(o)}>Edit</button>
              <button className="btn-secondary text-sm" onClick={() => toggleActive(o)}>
                {o.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                onClick={() => { setConfirmRemove(o); setConfirmName(''); }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {outlets.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-12">No outlets yet. Add one to get started.</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-semibold text-lg mb-4">{editing ? 'Edit Outlet' : 'New Outlet'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="label">Outlet Name</label>
                <input className="input" placeholder="Main Branch" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" placeholder="123 Food Street" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input className="input" placeholder="+91 9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-gray-400 mb-2">Outlet Login Credentials</p>
                <div className="space-y-3">
                  <div>
                    <label className="label">Username</label>
                    <input
                      className="input"
                      placeholder="e.g. mainbranch"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                      required={!editing}
                      disabled={!!editing}
                    />
                  </div>
                  <div>
                    <label className="label">
                      Password{editing ? <span className="text-gray-400 font-normal ml-1">(leave blank to keep)</span> : null}
                    </label>
                    <input
                      className="input"
                      placeholder={editing ? 'Leave blank to keep current' : 'Outlet login password'}
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required={!editing}
                    />
                  </div>
                  <div>
                    <label className="label">
                      Manager Password{editing ? <span className="text-gray-400 font-normal ml-1">(leave blank to keep)</span> : null}
                    </label>
                    <input
                      className="input"
                      placeholder={editing ? 'Leave blank to keep current' : 'For manager mode switch'}
                      type="password"
                      value={form.managerPassword}
                      onChange={(e) => setForm({ ...form, managerPassword: e.target.value })}
                      required={!editing}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading ? 'Saving...' : editing ? 'Save' : 'Create Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-semibold text-lg text-red-600 mb-1">Permanently Delete Outlet?</h2>
            <p className="text-sm text-gray-500 mb-1">
              This will permanently delete <span className="font-semibold text-gray-800">{confirmRemove.name}</span> and all its data — menu, tables, orders, and bills. This cannot be undone.
            </p>
            <p className="text-sm text-gray-500 mt-3 mb-1">
              Type the outlet name to confirm:
            </p>
            <input
              className="input mb-4"
              placeholder={confirmRemove.name}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => { setConfirmRemove(null); setConfirmName(''); }}>Cancel</button>
              <button
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-medium py-2 px-4 rounded-xl transition"
                onClick={handleRemove}
                disabled={confirmName !== confirmRemove.name}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
