import { useEffect, useState } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory, getMenu } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { Category } from '../../types';
import toast from 'react-hot-toast';

export default function Categories() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const isManager = session?.type === 'outlet' && session.mode === 'manager';

  const [categories, setCategories] = useState<Category[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const [cats, items] = await Promise.all([
      getCategories(outletId),
      getMenu(outletId),
    ]);
    setCategories(cats);
    const counts: Record<string, number> = {};
    items.forEach((i) => { counts[i.category] = (counts[i.category] || 0) + 1; });
    setItemCounts(counts);
  };

  useEffect(() => { if (outletId) load(); }, [outletId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await createCategory(newName.trim(), outletId);
      setNewName('');
      toast.success('Category added');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setAdding(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateCategory(id, editName.trim());
      setEditingId(null);
      toast.success('Category renamed');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (cat: Category) => {
    try {
      await deleteCategory(cat.id);
      toast.success('Category deleted');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cannot delete');
    }
  };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-1">Dish Categories</h1>
      <p className="text-sm text-gray-500 mb-6">Manage the categories used for your outlet's menu items.</p>

      {!isManager && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-700">
          Switch to Manager mode to edit categories.
        </div>
      )}

      {/* Add new category */}
      {isManager && (
        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            className="input flex-1"
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="btn-primary px-4" disabled={adding || !newName.trim()}>
            Add
          </button>
        </form>
      )}

      {/* Category list */}
      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="card flex items-center gap-3">
            {editingId === cat.id ? (
              <>
                <input
                  className="input flex-1 py-1.5 text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(cat.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <button className="btn-primary text-sm px-3 py-1.5" onClick={() => handleRename(cat.id)}>Save</button>
                <button className="btn-secondary text-sm px-3 py-1.5" onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{cat.name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {itemCounts[cat.name] ? `${itemCounts[cat.name]} item${itemCounts[cat.name] > 1 ? 's' : ''}` : 'no items'}
                  </span>
                </div>
                {isManager && (
                  <div className="flex gap-2">
                    <button
                      className="text-xs text-primary-500 hover:text-primary-700 font-medium"
                      onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                    >
                      Rename
                    </button>
                    <button
                      className="text-xs text-red-400 hover:text-red-600 font-medium"
                      onClick={() => handleDelete(cat)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No categories yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}
