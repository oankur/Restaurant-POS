import { useEffect, useState } from 'react';
import { getSubCategories, createSubCategory, updateSubCategory, deleteSubCategory, getMenu } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { SubCategory } from '../../types';
import toast from 'react-hot-toast';

export default function SubCategories() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const isManager = session?.type === 'outlet' && session.mode === 'manager';

  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const [subs, items] = await Promise.all([
      getSubCategories(outletId),
      getMenu(outletId),
    ]);
    setSubCategories(subs);
    const counts: Record<string, number> = {};
    items.forEach((i) => { if (i.subCategory) counts[i.subCategory] = (counts[i.subCategory] || 0) + 1; });
    setItemCounts(counts);
  };

  useEffect(() => { if (outletId) load(); }, [outletId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await createSubCategory(newName.trim(), outletId);
      setNewName('');
      toast.success('Sub-category added');
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
      await updateSubCategory(id, editName.trim());
      setEditingId(null);
      toast.success('Sub-category renamed');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (sub: SubCategory) => {
    try {
      await deleteSubCategory(sub.id);
      toast.success('Sub-category deleted');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cannot delete');
    }
  };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-1">Sub-Categories / Combo Types</h1>
      <p className="text-sm text-gray-500 mb-6">Manage sub-categories (e.g. Half, Full, Combo) used for your outlet's menu items.</p>

      {!isManager && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-700">
          Switch to Manager mode to edit sub-categories.
        </div>
      )}

      {isManager && (
        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            className="input flex-1"
            placeholder="New sub-category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit" className="btn-primary px-4" disabled={adding || !newName.trim()}>
            Add
          </button>
        </form>
      )}

      <div className="space-y-2">
        {subCategories.map((sub) => (
          <div key={sub.id} className="card flex items-center gap-3">
            {editingId === sub.id ? (
              <>
                <input
                  className="input flex-1 py-1.5 text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(sub.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                />
                <button className="btn-primary text-sm px-3 py-1.5" onClick={() => handleRename(sub.id)}>Save</button>
                <button className="btn-secondary text-sm px-3 py-1.5" onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{sub.name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {itemCounts[sub.name] ? `${itemCounts[sub.name]} item${itemCounts[sub.name] > 1 ? 's' : ''}` : 'no items'}
                  </span>
                </div>
                {isManager && (
                  <div className="flex gap-2">
                    <button
                      className="text-xs text-primary-500 hover:text-primary-700 font-medium"
                      onClick={() => { setEditingId(sub.id); setEditName(sub.name); }}
                    >
                      Rename
                    </button>
                    <button
                      className="text-xs text-red-400 hover:text-red-600 font-medium"
                      onClick={() => handleDelete(sub)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        {subCategories.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No sub-categories yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}
