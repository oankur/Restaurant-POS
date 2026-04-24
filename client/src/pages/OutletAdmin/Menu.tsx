import { useEffect, useState } from 'react';
import { getMenu, createMenuItem, updateMenuItem, deleteMenuItem, getCategories } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { MenuItem } from '../../types';
import toast from 'react-hot-toast';

const empty = { name: '', description: '', price: '', category: '' };

export default function OutletAdminMenu() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(empty);
  const [filterCat, setFilterCat] = useState('');

  const load = async () => {
    const [menuItems, cats] = await Promise.all([
      getMenu(outletId),
      getCategories(outletId),
    ]);
    setItems(menuItems);
    setCategories(cats.map((c) => c.name));
    if (!form.category && cats.length > 0) {
      setForm((f) => ({ ...f, category: f.category || cats[0].name }));
    }
  };
  useEffect(() => { if (outletId) load(); }, [outletId]);

  const openCreate = () => { setEditing(null); setForm({ ...empty, category: categories[0] || '' }); setShowModal(true); };
  const openEdit = (m: MenuItem) => { setEditing(m); setForm({ name: m.name, description: m.description || '', price: String(m.price), category: m.category }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateMenuItem(editing.id, { ...form, price: parseFloat(form.price) });
        toast.success('Item updated');
      } else {
        await createMenuItem({ ...form, price: parseFloat(form.price), outletId });
        toast.success('Item added');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const toggleAvailable = async (m: MenuItem) => {
    await updateMenuItem(m.id, { isAvailable: !m.isAvailable });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await deleteMenuItem(id);
    toast.success('Item deleted');
    load();
  };

  const allCats = [...new Set(items.map((i) => i.category))];
  const filtered = filterCat ? items.filter((i) => i.category === filterCat) : items;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Menu</h1>
        <button className="btn-primary" onClick={openCreate}>Add Item</button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!filterCat ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`} onClick={() => setFilterCat('')}>All</button>
        {allCats.map((cat) => (
          <button key={cat} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCat === cat ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`} onClick={() => setFilterCat(cat)}>{cat}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((item) => (
          <div key={item.id} className={`card ${!item.isAvailable ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <span className="text-xs text-primary-600 font-medium">{item.category}</span>
                <h3 className="font-semibold text-gray-900 mt-0.5">{item.name}</h3>
                {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
              </div>
              <span className="text-lg font-bold text-gray-900 ml-2">₹{item.price}</span>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => toggleAvailable(item)} className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-[#F7F5F2] text-gray-500'}`}>
                {item.isAvailable ? 'Available' : 'Unavailable'}
              </button>
              <span className="flex-1" />
              <button className="text-xs text-primary-500 hover:text-primary-700 font-medium" onClick={() => openEdit(item)}>Edit</button>
              <button className="text-xs text-red-400 hover:text-red-600 font-medium" onClick={() => handleDelete(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-semibold text-lg mb-4">{editing ? 'Edit Item' : 'Add Menu Item'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><label className="label">Price (₹)</label><input type="number" step="0.01" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
              <div>
                <label className="label">Category</label>
                {categories.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    No categories yet. Add categories first in the Categories section.
                  </p>
                ) : (
                  <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
