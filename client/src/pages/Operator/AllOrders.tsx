import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, updateOrderStatus, cancelOrder } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { socket, joinOutlet } from '../../utils/socket';
import type { Order } from '../../types';
import toast from 'react-hot-toast';

type FilterTab = 'ALL' | 'OFFLINE_DELIVERED' | 'ZOMATO_DELIVERED' | 'SWIGGY_DELIVERED' | 'CANCELLED';

const TABS: { key: FilterTab; label: string; color: string; activeColor: string }[] = [
  { key: 'ALL',               label: 'All Orders',        color: 'bg-[#F7F5F2] text-gray-600',     activeColor: 'bg-primary-500 text-white' },
  { key: 'OFFLINE_DELIVERED', label: 'Offline (Delivered)', color: 'bg-[#F7F5F2] text-gray-600',   activeColor: 'bg-gray-700 text-white' },
  { key: 'ZOMATO_DELIVERED',  label: 'Zomato (Delivered)', color: 'bg-[#F7F5F2] text-gray-600',    activeColor: 'bg-red-500 text-white' },
  { key: 'SWIGGY_DELIVERED',  label: 'Swiggy (Delivered)', color: 'bg-[#F7F5F2] text-gray-600',    activeColor: 'bg-primary-500 text-white' },
  { key: 'CANCELLED',         label: 'Cancelled',          color: 'bg-[#F7F5F2] text-gray-600',    activeColor: 'bg-red-100 text-red-700' },
];

const statusBadge: Record<string, string> = {
  PENDING: 'badge-pending', CONFIRMED: 'badge-confirmed', PREPARING: 'badge-preparing',
  READY: 'badge-ready', DELIVERED: 'badge-delivered', CANCELLED: 'badge-cancelled',
};
const nextStatus: Record<string, string> = {
  PENDING: 'CONFIRMED', CONFIRMED: 'PREPARING', PREPARING: 'READY', READY: 'DELIVERED',
};
const sourceColors: Record<string, string> = {
  OFFLINE: 'bg-[#F7F5F2] text-gray-600',
  ZOMATO: 'bg-red-100 text-red-700',
  SWIGGY: 'bg-orange-100 text-orange-700',
};

function applyTabFilter(orders: Order[], tab: FilterTab): Order[] {
  switch (tab) {
    case 'ALL':               return orders;
    case 'OFFLINE_DELIVERED': return orders.filter((o) => o.source === 'OFFLINE'  && o.status === 'DELIVERED');
    case 'ZOMATO_DELIVERED':  return orders.filter((o) => o.source === 'ZOMATO'   && o.status === 'DELIVERED');
    case 'SWIGGY_DELIVERED':  return orders.filter((o) => o.source === 'SWIGGY'   && o.status === 'DELIVERED');
    case 'CANCELLED':         return orders.filter((o) => o.status === 'CANCELLED');
    default:                  return orders;
  }
}

export default function AllOrders() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [search, setSearch] = useState('');

  const load = () => getOrders(outletId).then(setOrders);

  useEffect(() => {
    joinOutlet(outletId);
    load();
    socket.on('new_order', (order: Order) => {
      setOrders((prev) => [order, ...prev]);
      toast.success(`New order: ${order.orderNumber}`, { icon: '🔔' });
    });
    socket.on('order_updated', (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    });
    return () => { socket.off('new_order'); socket.off('order_updated'); };
  }, [outletId]);

  const counts = useMemo(() => ({
    ALL:               orders.length,
    OFFLINE_DELIVERED: orders.filter((o) => o.source === 'OFFLINE' && o.status === 'DELIVERED').length,
    ZOMATO_DELIVERED:  orders.filter((o) => o.source === 'ZOMATO'  && o.status === 'DELIVERED').length,
    SWIGGY_DELIVERED:  orders.filter((o) => o.source === 'SWIGGY'  && o.status === 'DELIVERED').length,
    CANCELLED:         orders.filter((o) => o.status === 'CANCELLED').length,
  }), [orders]);

  const filtered = useMemo(() => {
    const byTab = applyTabFilter(orders, activeTab);
    if (!search) return byTab;
    const q = search.toLowerCase();
    return byTab.filter((o) =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.items.some((i) => (i.itemName ?? i.menuItem?.name ?? '').toLowerCase().includes(q))
    );
  }, [orders, activeTab, search]);

  const handleAccept = async (order: Order) => {
    await updateOrderStatus(order.id, nextStatus[order.status]);
    load();
  };
  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this order?')) return;
    await cancelOrder(id);
    load();
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F7F5F2]" style={{ height: '100%' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <h1 className="font-bold text-gray-900 text-lg">Orders</h1>
        <span className="text-sm text-gray-400">{filtered.length} records</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Live
        </div>
      </header>

      {/* Filter tabs */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-2 flex-shrink-0 overflow-x-auto">
        {TABS.map(({ key, label, activeColor }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === key ? activeColor : 'bg-[#F7F5F2] text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === key ? 'bg-white/25' : 'bg-gray-200 text-gray-500'
            }`}>
              {counts[key]}
            </span>
          </button>
        ))}

        <input
          className="input text-sm w-48 ml-auto flex-shrink-0"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-bold text-gray-900 text-sm">{order.orderNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sourceColors[order.source]}`}>{order.source}</span>
                    <span className={statusBadge[order.status]}>{order.status}</span>
                    <span className="text-xs text-gray-400">{order.type.replace('_', ' ')}</span>
                    {order.table && <span className="text-xs text-gray-500">• Table {order.table.number}</span>}
                  </div>
                  {order.customerName && (
                    <div className="text-xs text-gray-500 mb-1">{order.customerName}{order.customerPhone && ` • ${order.customerPhone}`}</div>
                  )}
                  <div className="text-xs text-gray-600 line-clamp-1">
                    {order.items.map((i) => `${i.quantity}× ${i.itemName ?? i.menuItem?.name}`).join(', ')}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-gray-900">₹{order.total.toFixed(2)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleTimeString()}</div>
                  <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Actions */}
              {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button
                    className="btn-primary text-xs py-1.5 px-4"
                    onClick={() => updateOrderStatus(order.id, 'DELIVERED').then(load)}
                  >
                    Delivered
                  </button>
                  <button
                    className="btn-secondary text-xs py-1.5 px-4 text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => handleCancel(order.id)}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {order.status === 'DELIVERED' && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button className="btn-secondary text-xs py-1.5" onClick={() => navigate(`/outlet/billing/${order.id}`)}>
                    {order.bill ? 'View Bill' : 'Generate Bill'}
                  </button>
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <div className="text-sm">No orders in this category</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
