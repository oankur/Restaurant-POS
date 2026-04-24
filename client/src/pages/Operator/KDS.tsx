import { useEffect, useState } from 'react';
import { getOrders, updateOrderStatus } from '../../api';
import { useAuthStore } from '../../store/authStore';
import { socket, joinOutlet } from '../../utils/socket';
import type { Order } from '../../types';
import toast from 'react-hot-toast';

const columns = [
  { status: 'PENDING', label: 'Pending', color: 'border-yellow-400 bg-yellow-50', headerColor: 'bg-yellow-400' },
  { status: 'CONFIRMED', label: 'Confirmed', color: 'border-blue-400 bg-blue-50', headerColor: 'bg-blue-400' },
  { status: 'PREPARING', label: 'Preparing', color: 'border-orange-400 bg-orange-50', headerColor: 'bg-orange-400' },
  { status: 'READY', label: 'Ready', color: 'border-green-400 bg-green-50', headerColor: 'bg-green-500' },
];


function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  return diff < 1 ? 'just now' : `${diff}m ago`;
}

export default function OperatorKDS() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const [orders, setOrders] = useState<Order[]>([]);

  const load = () => getOrders(outletId, { status: '' }).then((all) =>
    setOrders(all.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)))
  );

  useEffect(() => {
    joinOutlet(outletId);
    load();

    socket.on('new_order', (order: Order) => {
      setOrders((prev) => [order, ...prev]);
      toast.success(`🔔 New order: ${order.orderNumber}`);
    });
    socket.on('order_updated', (order: Order) => {
      if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
      } else {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      }
    });

    return () => { socket.off('new_order'); socket.off('order_updated'); };
  }, [outletId]);


  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Kitchen Display</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          Live
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-160px)]">
        {columns.map(({ status, label, color, headerColor }) => {
          const colOrders = orders.filter((o) => o.status === status);
          return (
            <div key={status} className={`flex flex-col rounded-xl border-2 overflow-hidden ${color}`}>
              <div className={`${headerColor} text-white px-4 py-2.5 flex items-center justify-between`}>
                <span className="font-semibold text-sm">{label}</span>
                <span className="text-sm font-bold bg-white/20 px-2 py-0.5 rounded-full">{colOrders.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {colOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">{order.orderNumber.split('-').pop()}</span>
                      <span className="text-xs text-gray-400">{timeAgo(order.createdAt)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      {order.type}{order.table ? ` • T${order.table.number}` : ''}
                      {order.source !== 'OFFLINE' && <span className={`ml-1 px-1.5 py-0.5 rounded text-white text-xs ${order.source === 'ZOMATO' ? 'bg-red-500' : 'bg-orange-500'}`}>{order.source}</span>}
                    </div>
                    <div className="space-y-1 mb-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="text-xs flex items-center gap-1.5">
                          <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded text-center font-bold leading-5">{item.quantity}</span>
                          <span className="text-gray-700">{item.itemName ?? item.menuItem?.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'DELIVERED').then(load)}
                        className="flex-1 text-xs py-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 font-medium transition-colors"
                      >
                        Delivered
                      </button>
                      <button
                        onClick={async () => { await updateOrderStatus(order.id, 'CANCELLED'); load(); }}
                        className="flex-1 text-xs py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
                {colOrders.length === 0 && <p className="text-xs text-center text-gray-400 pt-4">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
