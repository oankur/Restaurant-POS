import { useEffect, useState } from 'react';
import { getAllReports, getOutletReport, getOutlets } from '../../api';
import type { Outlet } from '../../types';

export default function SuperAdminReports() {
  const [summary, setSummary] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    Promise.all([getAllReports(), getOutlets()]).then(([r, o]) => {
      setSummary(r);
      setOutlets(o);
    });
  }, []);

  useEffect(() => {
    if (selected) getOutletReport(selected).then(setReport);
    else setReport(null);
  }, [selected]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {summary.map((s) => (
          <div key={s.outlet.id} className="card cursor-pointer hover:border-primary-200 border-2" onClick={() => setSelected(s.outlet.id)}>
            <div className="font-semibold text-gray-800">{s.outlet.name}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">Orders</div><div className="font-medium">{s.totalOrders}</div>
              <div className="text-gray-500">Revenue</div><div className="font-semibold text-primary-600">₹{s.totalRevenue.toFixed(0)}</div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <select className="input w-auto" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">All Outlets</option>
              {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
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

          <div className="card">
            <h3 className="font-semibold mb-3">Top Items</h3>
            <div className="space-y-2">
              {report.topItems.map((item: any) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.name}</span>
                  <div className="flex gap-4 text-gray-500">
                    <span>{item.count} sold</span>
                    <span className="font-medium text-gray-800">₹{item.revenue.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">By Source</h3>
            <div className="flex gap-4 text-sm">
              {Object.entries(report.bySource).map(([source, count]) => (
                <div key={source} className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    source === 'OFFLINE' ? 'bg-[#F7F5F2] text-gray-700' :
                    source === 'ZOMATO' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>{source}</span>
                  <span className="text-gray-600">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
