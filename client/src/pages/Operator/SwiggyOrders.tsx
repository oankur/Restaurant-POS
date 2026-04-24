import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrders, updateOrderStatus, cancelOrder } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { socket, joinOutlet } from '../../utils/socket';
import type { Order } from '../../types';
import toast from 'react-hot-toast';

const statusBadge: Record<string, string> = {
  PENDING: 'badge-pending', CONFIRMED: 'badge-confirmed', PREPARING: 'badge-preparing',
  READY: 'badge-ready', DELIVERED: 'badge-delivered', CANCELLED: 'badge-cancelled',
};

export default function SwiggyOrders() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  const load = () => getOrders(outletId, { source: 'SWIGGY' }).then(setOrders);

  useEffect(() => {
    joinOutlet(outletId);
    load();
    socket.on('new_order', (order: Order) => {
      if (order.source === 'SWIGGY') { setOrders((prev) => [order, ...prev]); toast.success('New Swiggy order!'); }
    });
    socket.on('order_updated', (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    });
    return () => { socket.off('new_order'); socket.off('order_updated'); };
  }, [outletId]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F7F5F2]" style={{ height: '100%' }}>
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-sm">S</span>
        </div>
        <div>
          <h1 className="font-bold text-gray-900">Swiggy Orders</h1>
          <p className="text-xs text-gray-500">Real-time incoming orders</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Live
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3 max-w-3xl mx-auto">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{order.orderNumber}</span>
                    <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">SWIGGY</span>
                    <span className={statusBadge[order.status]}>{order.status}</span>
                  </div>
                  {order.customerName && <div className="text-sm text-gray-500 mt-0.5">{order.customerName} {order.customerPhone && `• ${order.customerPhone}`}</div>}
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900">₹{order.total.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
                {order.items.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{i.quantity}× {i.itemName ?? i.menuItem?.name}</span>
                    <span className="text-gray-500">₹{(i.price * i.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
                  <>
                    <button className="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                      onClick={async () => { await updateOrderStatus(order.id, 'DELIVERED'); load(); }}>
                      Delivered
                    </button>
                    <button className="flex-shrink-0 bg-[#F7F5F2] hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium"
                      onClick={async () => { if (!confirm('Cancel?')) return; await cancelOrder(order.id); load(); }}>
                      Cancel
                    </button>
                  </>
                )}
                {order.status === 'DELIVERED' && (
                  <button className="flex-shrink-0 border border-gray-200 hover:bg-gray-50 py-2 px-4 rounded-lg text-sm font-medium"
                    onClick={() => navigate(`/outlet/billing/${order.id}`)}>
                    Bill
                  </button>
                )}
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">🛵</div>
              <div>No Swiggy orders yet</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
