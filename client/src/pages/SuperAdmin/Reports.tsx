import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { getSuperReport, getOutletReport } from '../../api';
import { socket, joinSuperAdmin, leaveSuperAdmin } from '../../utils/socket';

type SourceBucket = { count: number; revenue: number };
type SourceMap = { OFFLINE: SourceBucket; ZOMATO: SourceBucket; SWIGGY: SourceBucket; TOING: SourceBucket };

type OrderDetail = {
  id: string; orderNumber: string; source: string; type: string;
  total: number; status: string; createdAt: string;
  paymentMode: string | null;
  items: { name: string; quantity: number; price: number }[];
};

type OutletData = {
  id: string; name: string;
  totalRevenue: number; totalOrders: number;
  bySource: SourceMap;
  recentOrders: OrderDetail[];
};

type DaySeries  = { date: string; totalRevenue: number; totalOrders: number; bySource: SourceMap };
type WeekSeries = { startDate: string; endDate: string; label: string; totalRevenue: number; totalOrders: number; bySource: SourceMap };
type MonthSeries= { month: string; label: string; totalRevenue: number; totalOrders: number; bySource: SourceMap };

type ReportData = {
  period: { from: string; to: string };
  grand: {
    totalRevenue: number; totalOrders: number;
    bySource: SourceMap;
    online: { count: number; revenue: number };
  };
  outlets: OutletData[];
  timeSeries: { daily: DaySeries[]; weekly: WeekSeries[]; monthly: MonthSeries[] };
};

type Period = 'today' | 'week' | 'month' | 'custom';
type TimeTab = 'daily' | 'weekly' | 'monthly';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const pct = (part: number, total: number) => total > 0 ? `${((part / total) * 100).toFixed(0)}%` : '0%';

const sourceColor = (s: string) =>
  s === 'ZOMATO'  ? 'bg-red-100 text-red-700' :
  s === 'SWIGGY'  ? 'bg-orange-100 text-orange-700' :
  s === 'TOING'   ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700';

const typeLabel = (t: string) =>
  t === 'DINE_IN' ? 'Dine In' : t === 'TAKEAWAY' ? 'Take Away' : 'Delivery';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function SourceRow({ label, color, bucket, totalOrders }: {
  label: string; color: string; bucket: SourceBucket; totalOrders: number;
}) {
  const barWidth = totalOrders > 0 ? (bucket.count / totalOrders) * 100 : 0;
  return (
    <div className="flex items-center gap-4">
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold w-20 text-center flex-shrink-0 ${color}`}>{label}</span>
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-700 font-medium">{bucket.count} orders</span>
          <span className="text-gray-500">{pct(bucket.count, totalOrders)}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-current transition-all duration-500"
            style={{ width: `${barWidth}%`, color: label === 'Zomato' ? '#dc2626' : label === 'Swiggy' ? '#ea580c' : label === 'Toing' ? '#9333ea' : '#6b7280' }}
          />
        </div>
      </div>
      <span className="text-sm font-semibold text-gray-800 w-24 text-right flex-shrink-0">{fmt(bucket.revenue)}</span>
    </div>
  );
}

function OutletCard({ outlet, from, to }: { outlet: OutletData; from: string; to: string }) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const online = outlet.bySource.ZOMATO.count + outlet.bySource.SWIGGY.count + outlet.bySource.TOING.count;
  const onlineRev = outlet.bySource.ZOMATO.revenue + outlet.bySource.SWIGGY.revenue + outlet.bySource.TOING.revenue;

  const downloadOutlet = async () => {
    setDownloading(true);
    try {
      const r = await getOutletReport(outlet.id, from, to);
      const wb = XLSX.utils.book_new();
      const label = from === to ? from : `${from}_to_${to}`;

      // Summary
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { 'Metric': 'Outlet',              'Value': outlet.name },
        { 'Metric': 'Period',              'Value': label },
        { 'Metric': 'Total Revenue (₹)',   'Value': r.totalRevenue },
        { 'Metric': 'Total Orders',        'Value': r.totalOrders },

        { 'Metric': 'Offline Orders',      'Value': r.bySource.OFFLINE ?? 0 },
        { 'Metric': 'Offline Revenue (₹)', 'Value': r.revenueBySource?.OFFLINE ?? 0 },
        { 'Metric': 'Zomato Orders',       'Value': r.bySource.ZOMATO ?? 0 },
        { 'Metric': 'Zomato Revenue (₹)',  'Value': r.revenueBySource?.ZOMATO ?? 0 },
        { 'Metric': 'Swiggy Orders',       'Value': r.bySource.SWIGGY ?? 0 },
        { 'Metric': 'Swiggy Revenue (₹)',  'Value': r.revenueBySource?.SWIGGY ?? 0 },
        { 'Metric': 'Toing Orders',        'Value': r.bySource.TOING ?? 0 },
        { 'Metric': 'Toing Revenue (₹)',   'Value': r.revenueBySource?.TOING ?? 0 },
        { 'Metric': 'Online Orders',       'Value': (r.bySource.ZOMATO ?? 0) + (r.bySource.SWIGGY ?? 0) + (r.bySource.TOING ?? 0) },
        { 'Metric': 'Online Revenue (₹)',  'Value': (r.revenueBySource?.ZOMATO ?? 0) + (r.revenueBySource?.SWIGGY ?? 0) + (r.revenueBySource?.TOING ?? 0) },
      ]), 'Summary');

      // Daily breakdown
      const dailyRows = Object.entries(r.dailyBreakdown ?? {}).map(([date, d]: [string, any]) => ({
        'Date': date,
        'Total Revenue (₹)': d.total,
        'Total Orders': d.orders,
        'Offline Orders': d.OFFLINE?.count ?? 0,
        'Offline Revenue (₹)': d.OFFLINE?.revenue ?? 0,
        'Zomato Orders': d.ZOMATO?.count ?? 0,
        'Zomato Revenue (₹)': d.ZOMATO?.revenue ?? 0,
        'Swiggy Orders': d.SWIGGY?.count ?? 0,
        'Swiggy Revenue (₹)': d.SWIGGY?.revenue ?? 0,
        'Toing Orders': d.TOING?.count ?? 0,
        'Toing Revenue (₹)': d.TOING?.revenue ?? 0,
        'Online Orders': (d.ZOMATO?.count ?? 0) + (d.SWIGGY?.count ?? 0) + (d.TOING?.count ?? 0),
        'Online Revenue (₹)': (d.ZOMATO?.revenue ?? 0) + (d.SWIGGY?.revenue ?? 0) + (d.TOING?.revenue ?? 0),
      })).sort((a, b) => b.Date.localeCompare(a.Date));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Daily');

      // Top items
      const itemRows = (r.topItems ?? []).map((i: any) => ({
        'Item': i.name,
        'Qty Sold': i.count,
        'Revenue (₹)': i.revenue,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), 'Top Items');

      XLSX.writeFile(wb, `${outlet.name.replace(/\s+/g, '_')}_${label}.xlsx`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-gray-900">{outlet.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">{outlet.totalOrders} orders</div>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900">{fmt(outlet.totalRevenue)}</div>
            <div className="text-xs text-gray-400">total revenue</div>
          </div>
          <button
            onClick={downloadOutlet}
            disabled={downloading}
            title="Download outlet report"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-0.5"
          >
            {downloading
              ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            }
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div className="bg-gray-50 rounded-lg p-2">
          <div className="text-gray-400 mb-0.5">Offline</div>
          <div className="font-semibold text-gray-800">{outlet.bySource.OFFLINE.count}</div>
          <div className="text-gray-500">{fmt(outlet.bySource.OFFLINE.revenue)}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-2">
          <div className="text-red-400 mb-0.5">Zomato</div>
          <div className="font-semibold text-red-700">{outlet.bySource.ZOMATO.count}</div>
          <div className="text-red-500">{fmt(outlet.bySource.ZOMATO.revenue)}</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-2">
          <div className="text-orange-400 mb-0.5">Swiggy</div>
          <div className="font-semibold text-orange-700">{outlet.bySource.SWIGGY.count}</div>
          <div className="text-orange-500">{fmt(outlet.bySource.SWIGGY.revenue)}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-2">
          <div className="text-purple-400 mb-0.5">Toing</div>
          <div className="font-semibold text-purple-700">{outlet.bySource.TOING.count}</div>
          <div className="text-purple-500">{fmt(outlet.bySource.TOING.revenue)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>Online (Zomato + Swiggy + Toing): <span className="font-medium text-gray-700">{online} orders / {fmt(onlineRev)}</span></span>
      </div>

      {outlet.recentOrders.length > 0 && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-full text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center gap-1 py-1 border-t border-gray-100 pt-2"
        >
          {expanded ? '▲ Hide' : '▼ View'} recent orders ({outlet.recentOrders.length})
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
          {outlet.recentOrders.map((o) => (
            <div key={o.id} className="border border-gray-100 rounded-lg p-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-gray-600">{o.orderNumber}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${sourceColor(o.source)}`}>{o.source}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500">
                <span>{typeLabel(o.type)}{o.paymentMode ? ` · ${o.paymentMode}` : ''}</span>
                <span className="font-semibold text-gray-800">{fmt(o.total)}</span>
              </div>
              <div className="text-gray-400 mt-1">
                {o.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimeSeriesTable({ data, tab }: { data: ReportData; tab: TimeTab }) {
  const rows: Array<{ label: string; totalRevenue: number; totalOrders: number; bySource: SourceMap }> =
    tab === 'daily'   ? data.timeSeries.daily.map((d) => ({ ...d, label: new Date(d.date + 'T12:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) })) :
    tab === 'weekly'  ? data.timeSeries.weekly.map((w)  => ({ ...w })) :
                        data.timeSeries.monthly.map((m) => ({ ...m }));

  if (!rows.length) return <div className="text-center text-gray-400 py-8 text-sm">No data for this period</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
            <th className="pb-2 font-medium">{tab === 'daily' ? 'Date' : tab === 'weekly' ? 'Week' : 'Month'}</th>
            <th className="pb-2 font-medium text-right">Revenue</th>
            <th className="pb-2 font-medium text-right">Orders</th>
            <th className="pb-2 font-medium text-right">Offline</th>
            <th className="pb-2 font-medium text-right">Zomato</th>
            <th className="pb-2 font-medium text-right">Swiggy</th>
            <th className="pb-2 font-medium text-right">Toing</th>
            <th className="pb-2 font-medium text-right">Online</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const online = r.bySource.ZOMATO.count + r.bySource.SWIGGY.count + r.bySource.TOING.count;
            return (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="py-2.5 text-gray-700">{r.label}</td>
                <td className="py-2.5 text-right font-semibold text-gray-900">{fmt(r.totalRevenue)}</td>
                <td className="py-2.5 text-right text-gray-700">{r.totalOrders}</td>
                <td className="py-2.5 text-right text-gray-600">{r.bySource.OFFLINE.count}</td>
                <td className="py-2.5 text-right text-red-600">{r.bySource.ZOMATO.count}</td>
                <td className="py-2.5 text-right text-orange-600">{r.bySource.SWIGGY.count}</td>
                <td className="py-2.5 text-right text-purple-600">{r.bySource.TOING.count}</td>
                <td className="py-2.5 text-right font-medium text-gray-700">{online}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function SuperAdminReports() {
  const [period, setPeriod]     = useState<Period>('today');
  const [customFrom, setFrom]   = useState('');
  const [customTo,   setTo]     = useState('');
  const [data,       setData]   = useState<ReportData | null>(null);
  const [loading,    setLoading] = useState(false);
  const [timeTab,    setTimeTab] = useState<TimeTab>('daily');
  const [live,       setLive]   = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = period === 'custom'
        ? { from: customFrom, to: customTo }
        : { period };
      const result = await getSuperReport(params);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!live) { leaveSuperAdmin(); return; }
    joinSuperAdmin();
    const handler = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(load, 800);
    };
    socket.on('order_activity', handler);
    return () => {
      socket.off('order_activity', handler);
      leaveSuperAdmin();
    };
  }, [live, load]);

  const downloadExcel = useCallback(() => {
    if (!data) return;

    const wb = XLSX.utils.book_new();
    const periodLabel = data.period.from === data.period.to ? data.period.from : `${data.period.from}_to_${data.period.to}`;

    // Summary sheet
    const summaryRows = [
      { 'Metric': 'Total Revenue (₹)',     'Value': data.grand.totalRevenue },
      { 'Metric': 'Total Orders',           'Value': data.grand.totalOrders },
      { 'Metric': 'Offline Orders',         'Value': data.grand.bySource.OFFLINE.count },
      { 'Metric': 'Offline Revenue (₹)',    'Value': data.grand.bySource.OFFLINE.revenue },
      { 'Metric': 'Online Orders',          'Value': data.grand.online.count },
      { 'Metric': 'Online Revenue (₹)',     'Value': data.grand.online.revenue },
      { 'Metric': 'Zomato Orders',          'Value': data.grand.bySource.ZOMATO.count },
      { 'Metric': 'Zomato Revenue (₹)',     'Value': data.grand.bySource.ZOMATO.revenue },
      { 'Metric': 'Swiggy Orders',          'Value': data.grand.bySource.SWIGGY.count },
      { 'Metric': 'Swiggy Revenue (₹)',     'Value': data.grand.bySource.SWIGGY.revenue },
      { 'Metric': 'Toing Orders',           'Value': data.grand.bySource.TOING.count },
      { 'Metric': 'Toing Revenue (₹)',      'Value': data.grand.bySource.TOING.revenue },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

    // Per-outlet sheet
    const outletRows = data.outlets.map((o) => ({
      'Outlet':            o.name,
      'Total Revenue (₹)': o.totalRevenue,
      'Total Orders':      o.totalOrders,
      'Offline Orders':    o.bySource.OFFLINE.count,
      'Offline Revenue (₹)': o.bySource.OFFLINE.revenue,
      'Zomato Orders':     o.bySource.ZOMATO.count,
      'Zomato Revenue (₹)': o.bySource.ZOMATO.revenue,
      'Swiggy Orders':     o.bySource.SWIGGY.count,
      'Swiggy Revenue (₹)': o.bySource.SWIGGY.revenue,
      'Toing Orders':      o.bySource.TOING.count,
      'Toing Revenue (₹)':  o.bySource.TOING.revenue,
      'Online Orders':     o.bySource.ZOMATO.count + o.bySource.SWIGGY.count + o.bySource.TOING.count,
      'Online Revenue (₹)': o.bySource.ZOMATO.revenue + o.bySource.SWIGGY.revenue + o.bySource.TOING.revenue,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(outletRows), 'Per Outlet');

    // Daily sheet
    const dailyRows = data.timeSeries.daily.map((d) => ({
      'Date':              d.date,
      'Total Revenue (₹)': d.totalRevenue,
      'Total Orders':      d.totalOrders,
      'Offline Orders':    d.bySource.OFFLINE.count,
      'Offline Revenue (₹)': d.bySource.OFFLINE.revenue,
      'Zomato Orders':     d.bySource.ZOMATO.count,
      'Zomato Revenue (₹)': d.bySource.ZOMATO.revenue,
      'Swiggy Orders':     d.bySource.SWIGGY.count,
      'Swiggy Revenue (₹)': d.bySource.SWIGGY.revenue,
      'Online Orders':     d.bySource.ZOMATO.count + d.bySource.SWIGGY.count,
      'Online Revenue (₹)': d.bySource.ZOMATO.revenue + d.bySource.SWIGGY.revenue,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Daily');

    // Weekly sheet
    const weeklyRows = data.timeSeries.weekly.map((w) => ({
      'Week':              w.label,
      'From':              w.startDate,
      'To':                w.endDate,
      'Total Revenue (₹)': w.totalRevenue,
      'Total Orders':      w.totalOrders,
      'Offline Orders':    w.bySource.OFFLINE.count,
      'Offline Revenue (₹)': w.bySource.OFFLINE.revenue,
      'Zomato Orders':     w.bySource.ZOMATO.count,
      'Zomato Revenue (₹)': w.bySource.ZOMATO.revenue,
      'Swiggy Orders':     w.bySource.SWIGGY.count,
      'Swiggy Revenue (₹)': w.bySource.SWIGGY.revenue,
      'Online Orders':     w.bySource.ZOMATO.count + w.bySource.SWIGGY.count,
      'Online Revenue (₹)': w.bySource.ZOMATO.revenue + w.bySource.SWIGGY.revenue,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(weeklyRows), 'Weekly');

    // Monthly sheet
    const monthlyRows = data.timeSeries.monthly.map((m) => ({
      'Month':             m.label,
      'Total Revenue (₹)': m.totalRevenue,
      'Total Orders':      m.totalOrders,
      'Offline Orders':    m.bySource.OFFLINE.count,
      'Offline Revenue (₹)': m.bySource.OFFLINE.revenue,
      'Zomato Orders':     m.bySource.ZOMATO.count,
      'Zomato Revenue (₹)': m.bySource.ZOMATO.revenue,
      'Swiggy Orders':     m.bySource.SWIGGY.count,
      'Swiggy Revenue (₹)': m.bySource.SWIGGY.revenue,
      'Online Orders':     m.bySource.ZOMATO.count + m.bySource.SWIGGY.count,
      'Online Revenue (₹)': m.bySource.ZOMATO.revenue + m.bySource.SWIGGY.revenue,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyRows), 'Monthly');

    XLSX.writeFile(wb, `reports_${periodLabel}.xlsx`);
  }, [data]);

  const periodButtons: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week',  label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: 'Custom' },
  ];

  const tabBtn = (tab: TimeTab, label: string) => (
    <button
      onClick={() => setTimeTab(tab)}
      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${timeTab === tab ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
    >{label}</button>
  );

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLive((p) => !p)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${live ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
          >
            <span className={`w-2 h-2 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            {live ? 'Live' : 'Paused'}
          </button>
          <button onClick={load} disabled={loading} className="btn-secondary text-sm px-3 py-1.5">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={downloadExcel}
            disabled={!data}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Excel
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {periodButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === key ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'}`}
          >{label}</button>
        ))}
        {period === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={customFrom} onChange={(e) => setFrom(e.target.value)} className="input text-sm py-1.5" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={customTo}   onChange={(e) => setTo(e.target.value)}   className="input text-sm py-1.5" />
          </div>
        )}
        {data && (
          <span className="ml-auto text-xs text-gray-400">
            {data.period.from === data.period.to ? data.period.from : `${data.period.from} → ${data.period.to}`}
          </span>
        )}
      </div>

      {!data && loading && (
        <div className="text-center text-gray-400 py-16 text-sm">Loading reports…</div>
      )}

      {data && (
        <>
          {/* Grand Totals */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Grand Totals</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Revenue" value={fmt(data.grand.totalRevenue)} />
              <StatCard label="Total Orders"  value={String(data.grand.totalOrders)} />
              <StatCard
                label="Offline Orders"
                value={String(data.grand.bySource.OFFLINE.count)}
                sub={fmt(data.grand.bySource.OFFLINE.revenue)}
              />
              <StatCard
                label="Online Orders"
                value={String(data.grand.online.count)}
                sub={`${fmt(data.grand.online.revenue)} (Zomato + Swiggy + Toing)`}
              />
            </div>
          </section>

          {/* Source Breakdown */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">By Source</h2>
            <div className="card space-y-4">
              <SourceRow label="Offline" color="bg-gray-100 text-gray-700" bucket={data.grand.bySource.OFFLINE} totalOrders={data.grand.totalOrders} />
              <SourceRow label="Zomato"  color="bg-red-100 text-red-700"       bucket={data.grand.bySource.ZOMATO}  totalOrders={data.grand.totalOrders} />
              <SourceRow label="Swiggy"  color="bg-orange-100 text-orange-700"  bucket={data.grand.bySource.SWIGGY}  totalOrders={data.grand.totalOrders} />
              <SourceRow label="Toing"   color="bg-purple-100 text-purple-700"  bucket={data.grand.bySource.TOING}   totalOrders={data.grand.totalOrders} />
            </div>
          </section>

          {/* Per Outlet */}
          {data.outlets.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Per Outlet <span className="font-normal text-gray-400 normal-case">({data.outlets.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.outlets
                  .sort((a, b) => b.totalRevenue - a.totalRevenue)
                  .map((outlet) => <OutletCard key={outlet.id} outlet={outlet} from={data.period.from} to={data.period.to} />)
                }
              </div>
            </section>
          )}

          {/* Time Series */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Time Series</h2>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {tabBtn('daily',   'Daily')}
                {tabBtn('weekly',  'Weekly')}
                {tabBtn('monthly', 'Monthly')}
              </div>
            </div>
            <div className="card">
              <TimeSeriesTable data={data} tab={timeTab} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
