import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { getOutletReport } from '../../api';
import { socket, joinOutlet, leaveOutlet } from '../../utils/socket';

type OrderItem = {
  id: string;
  itemName?: string | null;
  menuItem?: { name: string } | null;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  source: string;
  total: number;
  subtotal: number;
  tax: number;
  createdAt: string;
  customerName?: string | null;
  table?: { number: number } | null;
  items: OrderItem[];
};

type DayEntry = {
  OFFLINE: { revenue: number; count: number };
  ZOMATO:  { revenue: number; count: number };
  SWIGGY:  { revenue: number; count: number };
  total: number;
  orders: number;
};

type ReportData = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  revenueBySource: Record<string, number>;
  ordersBySource: Record<string, Order[]>;
  dailyBreakdown: Record<string, DayEntry>;
};

type Preset = 'today' | 'week' | 'month';

function localDate(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function getDateRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const to = localDate(now);
  if (preset === 'today') return { from: to, to };
  const d = new Date(now);
  d.setDate(d.getDate() - (preset === 'week' ? 6 : 29));
  return { from: localDate(d), to };
}

function fmt(v: number) {
  return `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDateLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'Today';
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const label = order.table ? `Table ${order.table.number}` : order.customerName || '—';

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-xs font-mono text-gray-500 w-36 flex-shrink-0">{order.orderNumber}</span>
        <span className="text-xs text-gray-400 w-36 flex-shrink-0">{fmtTime(order.createdAt)}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
          order.type === 'DINE_IN' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
        }`}>
          {order.type === 'DINE_IN' ? 'Dine In' : 'Take Away'}
        </span>
        <span className="text-xs text-gray-500 flex-1 truncate">{label}</span>
        <span className="text-sm font-semibold text-gray-800 flex-shrink-0">{fmt(order.total)}</span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-xs text-gray-600">
              <span>
                {item.quantity}× {item.menuItem?.name ?? item.itemName ?? 'Item'}
              </span>
              <span>{fmt(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-xs text-gray-500">
            <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Tax</span><span>{fmt(order.tax)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-gray-800">
            <span>Total</span><span>{fmt(order.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceSection({
  label, color, dotColor, revenue, orders,
}: {
  label: string;
  color: string;
  dotColor: string;
  revenue: number;
  orders: Order[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className={`font-semibold text-sm flex-shrink-0 ${color}`}>{label}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-6 text-sm">
          <span className="text-gray-500">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
          <span className="font-bold text-gray-800 w-24 text-right">{fmt(revenue)}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ml-2 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-2">
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No orders in this period.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 pb-2 text-xs text-gray-400 font-medium uppercase tracking-wide">
                <span className="w-36">Order #</span>
                <span className="w-36">Time</span>
                <span className="w-20">Type</span>
                <span className="flex-1">Customer / Table</span>
                <span>Total</span>
                <span className="w-4" />
              </div>
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function OutletReports() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : null;
  const outletName = session?.type === 'outlet' ? session.outletName : '';
  const [preset, setPreset] = useState<Preset>('today');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(() => {
    if (!outletId) return;
    const { from, to } = getDateRange(preset);
    setLoading(true);
    getOutletReport(outletId, from, to)
      .then(setData)
      .finally(() => setLoading(false));
  }, [preset, outletId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (!outletId) return;
    joinOutlet(outletId);
    socket.on('new_order', fetchReport);
    socket.on('order_updated', fetchReport);
    return () => {
      socket.off('new_order', fetchReport);
      socket.off('order_updated', fetchReport);
      leaveOutlet(outletId);
    };
  }, [outletId, fetchReport]);

  const presets: { key: Preset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Last 7 Days' },
    { key: 'month', label: 'Last 30 Days' },
  ];

  const sources = [
    { key: 'OFFLINE', label: 'Offline', color: 'text-gray-700', dotColor: 'bg-gray-400' },
    { key: 'ZOMATO',  label: 'Zomato',  color: 'text-red-500',  dotColor: 'bg-red-400'  },
    { key: 'SWIGGY',  label: 'Swiggy',  color: 'text-orange-500', dotColor: 'bg-orange-400' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">{outletName}</p>
          </div>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {presets.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  preset === key
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Loading…</div>
        ) : !data ? null : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total Revenue', value: fmt(data.totalRevenue), sub: 'All sources' },
                { label: 'Total Orders', value: data.totalOrders.toString(), sub: 'Excl. cancelled' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Source breakdown */}
            <div className="space-y-3">
              {sources.map(({ key, label, color, dotColor }) => (
                <SourceSection
                  key={key}
                  label={label}
                  color={color}
                  dotColor={dotColor}
                  revenue={data.revenueBySource?.[key] ?? 0}
                  orders={data.ordersBySource?.[key] ?? []}
                />
              ))}
            </div>

            {/* Daily breakdown table */}
            {data.dailyBreakdown && (() => {
              const todayStr = localDate(new Date());
              const rows = Object.entries(data.dailyBreakdown).sort(([a], [b]) => b.localeCompare(a));
              return (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-700">
                      {preset === 'today' ? 'Today\'s Breakdown' : preset === 'week' ? 'Day-wise Breakdown' : 'Date-wise Breakdown'}
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                          <th className="text-left px-5 py-2.5 font-medium">Date</th>
                          <th className="text-right px-4 py-2.5 font-medium text-gray-500">Offline</th>
                          <th className="text-right px-4 py-2.5 font-medium text-red-400">Zomato</th>
                          <th className="text-right px-4 py-2.5 font-medium text-orange-400">Swiggy</th>
                          <th className="text-right px-4 py-2.5 font-medium">Orders</th>
                          <th className="text-right px-5 py-2.5 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows.map(([date, day]) => (
                          <tr key={date} className={`hover:bg-gray-50 transition-colors ${date === todayStr ? 'bg-primary-50/40' : ''}`}>
                            <td className="px-5 py-3 font-medium text-gray-800">
                              {fmtDateLabel(date, todayStr)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {day.OFFLINE.count > 0 ? (
                                <span>{fmt(day.OFFLINE.revenue)}<span className="text-xs text-gray-400 ml-1">({day.OFFLINE.count})</span></span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {day.ZOMATO.count > 0 ? (
                                <span>{fmt(day.ZOMATO.revenue)}<span className="text-xs text-gray-400 ml-1">({day.ZOMATO.count})</span></span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {day.SWIGGY.count > 0 ? (
                                <span>{fmt(day.SWIGGY.revenue)}<span className="text-xs text-gray-400 ml-1">({day.SWIGGY.count})</span></span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-500">{day.orders}</td>
                            <td className="px-5 py-3 text-right font-semibold text-gray-800">{day.total > 0 ? fmt(day.total) : <span className="text-gray-300 font-normal">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-800">
                          <td className="px-5 py-3">Total</td>
                          <td className="px-4 py-3 text-right">{fmt(data.revenueBySource?.OFFLINE ?? 0)}</td>
                          <td className="px-4 py-3 text-right">{fmt(data.revenueBySource?.ZOMATO ?? 0)}</td>
                          <td className="px-4 py-3 text-right">{fmt(data.revenueBySource?.SWIGGY ?? 0)}</td>
                          <td className="px-4 py-3 text-right">{data.totalOrders}</td>
                          <td className="px-5 py-3 text-right text-primary-600">{fmt(data.totalRevenue)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
