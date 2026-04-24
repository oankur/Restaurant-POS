import { useEffect, useState } from 'react';
import { getOutlets, getAllReports } from '../../api';

export default function SuperAdminDashboard() {
  const [summary, setSummary] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOutlets(), getAllReports()]).then(([o, r]) => {
      setOutlets(o);
      setSummary(r);
      setLoading(false);
    });
  }, []);

  const totalRevenue = summary.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalOrders = summary.reduce((sum, s) => sum + s.totalOrders, 0);

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Outlets', value: outlets.length },
          { label: 'Active Outlets', value: outlets.filter((o) => o.isActive).length },
          { label: 'Total Orders', value: totalOrders },
          { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(0)}` },
        ].map(({ label, value }) => (
          <div key={label} className="card">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Outlet Performance</h2>
        <div className="space-y-3">
          {summary.map((s) => (
            <div key={s.outlet.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-800">{s.outlet.name}</div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-gray-500">{s.totalOrders} orders</span>
                <span className="font-semibold text-gray-900">₹{s.totalRevenue.toFixed(0)}</span>
              </div>
            </div>
          ))}
          {summary.length === 0 && <p className="text-gray-400 text-sm">No data yet</p>}
        </div>
      </div>
    </div>
  );
}
