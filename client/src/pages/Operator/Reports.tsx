import { useEffect, useState } from 'react';
import { getOutletReport } from '../../api';
import { useAuthStore } from '../../store/authStore';

export default function OperatorReports() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const [report, setReport] = useState<any>(null);

  useEffect(() => { getOutletReport(outletId).then(setReport); }, [outletId]);

  if (!report) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-8 bg-[#F7F5F2] min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Reports</h1>
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
      <div className="card">
        <h3 className="font-semibold mb-4">Top Selling Items</h3>
        <div className="space-y-2">
          {report.topItems.map((item: any, idx: number) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                <span className="text-gray-700">{item.name}</span>
              </div>
              <div className="flex gap-3 text-gray-500">
                <span>{item.count}× sold</span>
                <span className="font-medium text-gray-800">₹{item.revenue.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
