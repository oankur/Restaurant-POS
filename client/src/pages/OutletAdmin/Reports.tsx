import { useEffect, useState } from 'react';
import { getOutletReport } from '../../api';
import { useAuthStore } from '../../store/authStore';

export default function OutletAdminReports() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const [report, setReport] = useState<any>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    getOutletReport(outletId, from || undefined, to || undefined).then(setReport);
  }, [outletId, from, to]);

  if (!report) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex items-center gap-3">
          <div>
            <label className="label text-xs">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: `₹${report.totalRevenue.toFixed(2)}` },
          { label: 'Total Orders', value: report.totalOrders },
          { label: 'Avg Order Value', value: `₹${report.avgOrderValue.toFixed(2)}` },
        ].map(({ label, value }) => (
          <div key={label} className="card">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-3">Top Selling Items</h3>
          <div className="space-y-2">
            {report.topItems.map((item: any, idx: number) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <div className="flex gap-3 text-gray-500">
                  <span>{item.count}x</span>
                  <span className="font-medium text-gray-800">₹{item.revenue.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Orders by Source</h3>
          <div className="space-y-2">
            {Object.entries(report.bySource).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  source === 'OFFLINE' ? 'bg-[#F7F5F2] text-gray-700' :
                  source === 'ZOMATO' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                }`}>{source}</span>
                <span className="font-medium">{count as number} orders</span>
              </div>
            ))}
          </div>

          <h3 className="font-semibold mt-4 mb-3">Orders by Type</h3>
          <div className="space-y-2">
            {Object.entries(report.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{type.replace('_', ' ')}</span>
                <span className="font-medium">{count as number} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
