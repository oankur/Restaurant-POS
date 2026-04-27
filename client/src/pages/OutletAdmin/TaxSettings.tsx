import { useEffect, useState } from 'react';
import { getOutlet, updateOutletSettings } from '../../api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function TaxSettings() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const isManager = session?.type === 'outlet' && session.mode === 'manager';

  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!outletId) return;
    getOutlet(outletId).then((outlet) => {
      setTaxRate((outlet.taxRate * 100).toFixed(2));
      setTaxEnabled(outlet.taxEnabled);
    });
  }, [outletId]);

  const handleToggle = async () => {
    if (!isManager) return;
    const next = !taxEnabled;
    setTaxEnabled(next);
    try {
      await updateOutletSettings(outletId, { taxEnabled: next });
      toast.success(`Tax ${next ? 'enabled' : 'disabled'} for this outlet`);
    } catch {
      setTaxEnabled(!next);
      toast.error('Failed to update tax setting');
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Enter a valid rate between 0 and 100');
      return;
    }
    setLoading(true);
    try {
      await updateOutletSettings(outletId, { taxRate: rate / 100 });
      toast.success('Tax rate updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-1">Tax</h1>
      <p className="text-sm text-gray-500 mb-8">These settings apply to this outlet only.</p>

      {!isManager && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-700">
          Switch to Manager mode to edit settings.
        </div>
      )}

      <div className="space-y-6">
        {/* Toggle */}
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Tax System</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {taxEnabled ? 'Tax is applied to new orders at this outlet' : 'No tax on orders at this outlet'}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={!isManager}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
              taxEnabled ? 'bg-primary-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                taxEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Rate */}
        <form onSubmit={handleSaveRate} className={`space-y-4 transition-opacity ${taxEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
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
              <span className="text-sm text-gray-400">% on orders at this outlet</span>
            </div>
          </div>
          {isManager && (
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Rate'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
