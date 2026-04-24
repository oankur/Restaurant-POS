import { useEffect, useState } from 'react';
import { getOrders, getMenu, getTables, simulateOrder } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { socket, joinOutlet } from '../../utils/socket';
import type { Order } from '../../types';
import toast from 'react-hot-toast';

export default function OutletAdminDashboard() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuCount, setMenuCount] = useState(0);
  const [tableCount, setTableCount] = useState(0);

  useEffect(() => {
    joinOutlet(outletId);
    Promise.all([
      getOrders(outletId),
      getMenu(outletId),
      getTables(outletId),
    ]).then(([o, m, t]) => {
      setOrders(o);
      setMenuCount(m.length);
      setTableCount(t.length);
    });

    socket.on('new_order', (order: Order) => {
      setOrders((prev) => [order, ...prev]);
      toast.success(`New ${order.source} order: ${order.orderNumber}`);
    });

    return () => { socket.off('new_order'); };
  }, [outletId]);

  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === today);
  const todayRevenue = todayOrders.filter((o) => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.total, 0);
  const activeOrders = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));

  const handleSimulate = async (source: 'ZOMATO' | 'SWIGGY') => {
    try {
      await simulateOrder(outletId, source);
      toast.success(`Simulated ${source} order!`);
    } catch {
      toast.error('Failed to simulate order');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Today's Orders", value: todayOrders.length },
          { label: 'Active Orders', value: activeOrders.length },
          { label: 'Menu Items', value: menuCount },
          { label: "Today's Revenue", value: `₹${todayRevenue.toFixed(0)}` },
        ].map(({ label, value }) => (
          <div key={label} className="card">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold mb-3">Simulate Online Order (Test)</h2>
        <div className="flex gap-3">
          <button className="btn-secondary text-red-600 border-red-200" onClick={() => handleSimulate('ZOMATO')}>Simulate Zomato Order</button>
          <button className="btn-secondary text-orange-600 border-orange-200" onClick={() => handleSimulate('SWIGGY')}>Simulate Swiggy Order</button>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Active Orders</h2>
        <div className="space-y-3">
          {activeOrders.slice(0, 8).map((o) => (
            <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
              <div>
                <span className="font-medium">{o.orderNumber}</span>
                <span className="ml-2 text-gray-500">{o.type} • {o.source}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge-${o.status.toLowerCase()}`}>{o.status}</span>
                <span className="font-medium">₹{o.total.toFixed(0)}</span>
              </div>
            </div>
          ))}
          {activeOrders.length === 0 && <p className="text-gray-400 text-sm">No active orders</p>}
        </div>
      </div>
    </div>
  );
}
