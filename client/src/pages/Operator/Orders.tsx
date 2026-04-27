import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  getOrders, getMenu, getTables, createOrder, updateOrderStatus, cancelOrder, generateBill,
  getOutlet,
} from '../../api';
import { useAuthStore } from '../../store/authStore';
import { socket, joinOutlet } from '../../utils/socket';
import type { Order, MenuItem, Table, PaymentMode } from '../../types';
import { printKOT, printBill } from '../../utils/print';
import toast from 'react-hot-toast';

const CATEGORY_BG: Record<string, string> = {
  Starters: 'bg-green-100 text-green-800',
  'Main Course': 'bg-amber-100 text-amber-800',
  Beverages: 'bg-blue-100 text-blue-800',
  Desserts: 'bg-pink-100 text-pink-800',
  Breads: 'bg-yellow-100 text-yellow-800',
  'Rice & Biryani': 'bg-orange-100 text-orange-800',
  Soups: 'bg-teal-100 text-teal-800',
  Salads: 'bg-lime-100 text-lime-800',
  Other: 'bg-[#F7F5F2] text-gray-600',
};

// ─── Types ───────────────────────────────────────────────
interface CartItem { menuItem: MenuItem; quantity: number; }

const statusBadge: Record<string, string> = {
  PENDING: 'badge-pending', CONFIRMED: 'badge-confirmed',
  PREPARING: 'badge-preparing', READY: 'badge-ready',
  DELIVERED: 'badge-delivered', CANCELLED: 'badge-cancelled',
};


// ─── Component ───────────────────────────────────────────
export default function OperatorOrders() {
  const { session } = useAuthStore();
  const outletId = session?.type === 'outlet' ? session.outletId : '';
  const outletName = session?.type === 'outlet' ? session.outletName : '';

  // Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);

  // Cart / billing state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableId, setTableId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  // Tax settings
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(0.05);

  // UI state
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [orderTab, setOrderTab] = useState<'ALL' | 'ZOMATO' | 'SWIGGY'>('ALL');

  const load = useCallback(() => getOrders(outletId).then(setOrders), [outletId]);

  useEffect(() => {
    joinOutlet(outletId);
    Promise.all([load(), getMenu(outletId), getTables(outletId), getOutlet(outletId)]).then(([_, m, t, outlet]) => {
      setMenuItems(m);
      setTables(t);
      setTaxEnabled(outlet.taxEnabled);
      setTaxRate(outlet.taxRate);
    });
    socket.on('new_order', (order: Order) => {
      setOrders((prev) => [order, ...prev]);
      toast.success(`New ${order.source} order!`, { icon: '🔔' });
    });
    socket.on('order_updated', (order: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    });
    return () => { socket.off('new_order'); socket.off('order_updated'); };
  }, [outletId]);

  // ─── Cart helpers ─────────────────────────────────────
  const addToCart = (item: MenuItem) => {
    setLastOrder(null);
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) return prev.map((c) => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };
  const updateQty = (id: string, qty: number) => {
    if (qty < 1) setCart((prev) => prev.filter((c) => c.menuItem.id !== id));
    else setCart((prev) => prev.map((c) => c.menuItem.id === id ? { ...c, quantity: qty } : c));
  };
  const clearCart = () => {
    setCart([]); setTableId(''); setCustomerName(''); setCustomerPhone(''); setOrderNotes('');
  };

  const subtotal = useMemo(() => cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0), [cart]);
  const tax = taxEnabled ? subtotal * taxRate : 0;
  const total = subtotal + tax;

  // ─── Place order ─────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (!cart.length) return toast.error('Add items first');
    if (orderType === 'DINE_IN' && !tableId) return toast.error('Select a table');
    setPlacingOrder(true);
    try {
      const order = await createOrder({
        outletId,
        type: orderType,
        tableId: tableId || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        notes: orderNotes || null,
        items: cart.map((c) => ({ menuItemId: c.menuItem.id, quantity: c.quantity })),
      });
      toast.success('Order placed!');
      setLastOrder(order);
      clearCart();
      load();
      printKOT(order, outletName);
    } catch { toast.error('Failed to place order'); }
    finally { setPlacingOrder(false); }
  };

  // ─── Print bill directly ──────────────────────────
  const handlePrintBill = async (order: Order) => {
    try {
      const bill = await generateBill(order.id, paymentMode);
      printBill(order, bill);
      load();
    } catch { toast.error('Failed to generate bill'); }
  };

  // ─── Menu filtering ────────────────────────────────
  const categories = useMemo(() => ['All', ...new Set(menuItems.map((m) => m.category))], [menuItems]);
  const filteredMenu = useMemo(() => menuItems.filter((m) => {
    if (!m.isAvailable) return false;
    if (activeCategory !== 'All' && m.category !== activeCategory) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [menuItems, activeCategory, search]);

  // ─── Live orders filtering ─────────────────────────
  const liveOrders = useMemo(() => orders.filter((o) => {
    if (['DELIVERED', 'CANCELLED'].includes(o.status)) return false;
    if (orderTab === 'ZOMATO') return o.source === 'ZOMATO';
    if (orderTab === 'SWIGGY') return o.source === 'SWIGGY';
    return true;
  }), [orders, orderTab]);

  const availableTables = tables.filter((t) => t.status === 'AVAILABLE');

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this order?')) return;
    await cancelOrder(id);
    load();
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F7F5F2]" style={{ height: '100%' }}>
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div />
        <div className="font-bold text-gray-900 text-lg tracking-wide">The Highlander's Shawarma</div>
        <div />
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── CENTER: Menu + Live Orders ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Category tabs + search */}
          <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-0 flex-shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-primary-500 text-white'
                      : 'bg-[#F7F5F2] text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 bg-[#F7F5F2] flex-shrink-0">
            <input
              className="input text-sm max-w-md"
              placeholder="Search menu items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Menu Grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredMenu.map((item) => {
                const inCart = cart.find((c) => c.menuItem.id === item.id);
                const catStyle = CATEGORY_BG[item.category] || 'bg-[#F7F5F2] text-gray-600';
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-300 transition-all text-left"
                  >
                    <div className={`h-16 ${catStyle} flex items-center justify-between px-3 relative`}>
                      <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{item.category}</span>
                      {inCart && (
                        <span className="w-6 h-6 bg-primary-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <div className="font-medium text-gray-900 text-sm leading-tight line-clamp-1">{item.name}</div>
                      <div className="font-bold text-primary-500 text-sm mt-1">₹{item.price}</div>
                    </div>
                  </button>
                );
              })}
              {filteredMenu.length === 0 && (
                <div className="col-span-4 text-center text-gray-400 py-12 text-sm">No items found</div>
              )}
            </div>
          </div>

          {/* ── Live Orders ── */}
          <div className="bg-white border-t border-gray-200 flex-shrink-0" style={{ maxHeight: '260px' }}>
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm text-gray-800">Live Orders</span>
                <span className="ml-2 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{liveOrders.length}</span>
              </div>
              <div className="flex items-center gap-1">
                {(['ALL', 'ZOMATO', 'SWIGGY'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setOrderTab(tab)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      orderTab === tab
                        ? tab === 'ZOMATO' ? 'bg-red-500 text-white'
                          : tab === 'SWIGGY' ? 'bg-primary-500 text-white'
                          : 'bg-primary-500 text-white'
                        : 'bg-[#F7F5F2] text-gray-600'
                    }`}
                  >
                    {tab === 'ALL' ? 'All Orders' : tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto px-4 py-2" style={{ maxHeight: '200px' }}>
              <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
                {liveOrders.map((order) => (
                  <div key={order.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 w-52 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-gray-900">{order.orderNumber.slice(-6)}</span>
                      <div className="flex items-center gap-1">
                        {order.source !== 'OFFLINE' && (
                          <span className={`text-white text-xs px-1.5 py-0.5 rounded font-bold ${order.source === 'ZOMATO' ? 'bg-red-500' : 'bg-orange-500'}`}>
                            {order.source[0]}
                          </span>
                        )}
                        <span className={statusBadge[order.status]}>{order.status}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mb-1 truncate">
                      {order.type}{order.table ? ` • T${order.table.number}` : ''}
                    </div>
                    <div className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {order.items.map((i) => `${i.quantity}× ${i.itemName ?? i.menuItem?.name}`).join(', ')}
                    </div>
                    <div className="font-bold text-sm text-gray-900 mb-2">₹{order.total.toFixed(0)}</div>
                    <div className="flex gap-1.5">
                      {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'DELIVERED').then(load)}
                            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white text-xs py-1.5 rounded-lg font-medium transition-colors"
                          >
                            Delivered
                          </button>
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs py-1.5 rounded-lg font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {order.status === 'DELIVERED' && (
                        <button
                          onClick={() => handlePrintBill(order)}
                          className="flex-1 bg-gray-900 hover:bg-gray-700 text-white text-xs py-1.5 px-2 rounded-lg font-medium"
                        >
                          Print Bill
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {liveOrders.length === 0 && (
                  <div className="text-gray-400 text-sm py-4 px-2">No active orders</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Receipt & Billing ─── */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="font-semibold text-gray-800 text-sm">Receipt & Billing</span>
            {tableId && (
              <span className="text-xs bg-[#F7F5F2] text-gray-600 px-2 py-1 rounded-lg font-medium">
                Table {tables.find((t) => t.id === tableId)?.number}
              </span>
            )}
          </div>

          {/* Order type tabs */}
          <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
            <div className="flex gap-1 bg-[#F7F5F2] rounded-lg p-1">
              {(['DINE_IN', 'TAKEAWAY'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => { setOrderType(type); setTableId(''); }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    orderType === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {type === 'DINE_IN' ? 'Dine In' : 'Take Away'}
                </button>
              ))}
            </div>
          </div>

          {/* Table / Customer selector */}
          <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
            {orderType === 'DINE_IN' ? (
              <select className="input text-sm" value={tableId} onChange={(e) => setTableId(e.target.value)}>
                <option value="">Select table...</option>
                {availableTables.map((t) => (
                  <option key={t.id} value={t.id}>Table {t.number} ({t.capacity} seats)</option>
                ))}
              </select>
            ) : (
              <div className="space-y-1.5">
                <input className="input text-sm" placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                <input className="input text-sm" placeholder="Phone number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                <span className="text-3xl mb-2">🛒</span>
                <span>Tap items to add</span>
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 grid grid-cols-12 text-xs text-gray-500 font-medium">
                  <span className="col-span-2">Qty</span>
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-right">Price</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>
                {/* Items */}
                <div className="divide-y divide-gray-50">
                  {cart.map((c) => (
                    <div key={c.menuItem.id} className="px-4 py-2.5 grid grid-cols-12 items-center text-sm">
                      <div className="col-span-2 flex items-center gap-1">
                        <button className="w-5 h-5 bg-[#F7F5F2] rounded text-xs flex items-center justify-center hover:bg-gray-200" onClick={() => updateQty(c.menuItem.id, c.quantity - 1)}>−</button>
                        <span className="text-xs font-bold w-4 text-center">{c.quantity}</span>
                        <button className="w-5 h-5 bg-primary-500 text-white rounded text-xs flex items-center justify-center hover:bg-primary-600" onClick={() => updateQty(c.menuItem.id, c.quantity + 1)}>+</button>
                      </div>
                      <span className="col-span-6 text-xs text-gray-700 truncate px-1">{c.menuItem.name}</span>
                      <span className="col-span-2 text-right text-xs text-gray-500">₹{c.menuItem.price}</span>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <span className="text-xs font-medium">₹{(c.menuItem.price * c.quantity).toFixed(0)}</span>
                        <button onClick={() => updateQty(c.menuItem.id, 0)} className="text-gray-300 hover:text-red-400 text-xs leading-none">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Notes */}
                <div className="px-4 py-2">
                  <input className="input text-xs" placeholder="Add note (optional)..." value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
                </div>
              </>
            )}
          </div>

          {/* Totals + CTA */}
          <div className="border-t border-gray-100 px-4 py-4 flex-shrink-0">
            {/* Totals */}
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Sub Total</span><span>₹{subtotal.toFixed(2)}</span>
              </div>
              {taxEnabled && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>GST ({(taxRate * 100).toFixed(0)}%)</span><span>₹{tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="font-bold text-gray-900">Total Amount</span>
                <span className="font-bold text-xl text-primary-500">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment mode */}
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1.5 font-medium">Payment Mode</div>
              <div className="flex gap-1.5">
                {(['CASH', 'CARD', 'UPI'] as PaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPaymentMode(mode)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      paymentMode === mode ? 'bg-gray-900 text-white' : 'bg-[#F7F5F2] text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2">
              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder || !cart.length}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
              >
                {placingOrder ? 'Placing...' : 'Place Order'}
              </button>
              <button
                onClick={() => lastOrder && handlePrintBill(lastOrder)}
                disabled={!lastOrder}
                className="w-full border-2 border-gray-800 text-gray-800 hover:bg-[#F7F5F2] disabled:opacity-40 disabled:cursor-not-allowed py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                Print Bill
              </button>
              {cart.length > 0 && (
                <button onClick={clearCart} className="w-full text-gray-400 hover:text-gray-600 text-xs py-1 transition-colors">
                  Clear cart
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
