import { useEffect, useState } from 'react';
import { getOutlet, updateOutletSettings } from '../../api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function TaxSettings() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const isManager = session?.type === 'outlet' && session.mode === 'manager';

  const [taxRate, setTaxRate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (outletId) {
      getOutlet(outletId).then((o) => setTaxRate((o.taxRate * 100).toFixed(2)));
    }
  }, [outletId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Enter a valid tax rate between 0 and 100');
      return;
    }
    setLoading(true);
    try {
      await updateOutletSettings(outletId, rate / 100);
      toast.success('Tax rate updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-2">Tax</h1>
      <p className="text-sm text-gray-500 mb-8">Configure the tax rate for this outlet.</p>

      {!isManager && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-700">
          Switch to Manager mode to edit settings.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="label">GST / Tax Rate (%)</label>
          <div className="flex items-center gap-3">
            <input
              className="input w-32"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="5.00"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              disabled={!isManager}
            />
            <span className="text-sm text-gray-400">% applied to all orders</span>
          </div>
        </div>

        {isManager && (
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </form>
    </div>
  );
}
