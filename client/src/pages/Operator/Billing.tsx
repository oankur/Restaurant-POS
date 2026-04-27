import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder, generateBill, getBillByOrder } from '../../api';
import type { Order, Bill, PaymentMode } from '../../types';
import { printBill, formatInvoiceId } from '../../utils/print';
import toast from 'react-hot-toast';

export default function BillingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    getOrder(orderId).then((o) => {
      setOrder(o);
      if (o.bill) {
        getBillByOrder(orderId).then(setBill);
      }
    });
  }, [orderId]);

  const handleGenerate = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const b = await generateBill(orderId, paymentMode);
      setBill(b);
      getOrder(orderId).then(setOrder);
      toast.success('Bill generated!');
    } catch { toast.error('Failed to generate bill'); }
    finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!order || !bill) return;
    printBill(order, bill);
  };

  if (!order) return <div className="p-8 text-gray-400">Loading...</div>;

  const outletAddress = bill?.order?.outlet?.address ?? order.outlet?.address ?? '';
  const invoiceId = bill ? formatInvoiceId(order, bill.dailySequence) : null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#F7F5F2]" style={{ height: '100%' }}>
      {/* Header bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <button className="text-sm text-gray-500 hover:text-gray-800 font-medium" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="font-bold text-gray-900">Bill</h1>
      </header>

      <div className="flex-1 overflow-y-auto flex flex-col items-center py-8 px-4">
        {/* Receipt card */}
        <div className="bg-white shadow-md rounded-lg w-full max-w-xs font-mono text-xs">
          <div className="p-5">
            {/* Brand header */}
            <div className="text-center mb-3">
              <div className="font-bold text-sm tracking-wide">The Highlander's Shawarma</div>
              <div className="text-gray-500 text-xs mt-0.5">Customer Bill</div>
              {outletAddress && <div className="text-gray-500 text-xs mt-0.5">{outletAddress}</div>}
            </div>

            <div className="border-t border-dashed border-gray-400 my-3" />

            {/* Invoice details */}
            <div className="space-y-1">
              {invoiceId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice#</span>
                  <span className="font-medium">{invoiceId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
              </div>
              {order.table && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Table</span>
                  <span>{order.table.number}</span>
                </div>
              )}
              {order.customerName && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer</span>
                  <span>{order.customerName}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-400 my-3" />

            {/* Items header */}
            <div className="flex justify-between font-bold mb-1">
              <span className="flex-1">Item</span>
              <span className="w-7 text-center">Qty</span>
              <span className="w-14 text-right">Total</span>
            </div>
            <div className="border-t border-dashed border-gray-400 mb-2" />

            {/* Items */}
            <div className="space-y-1">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="flex-1 truncate pr-1">{item.itemName ?? item.menuItem?.name}</span>
                  <span className="w-7 text-center">{item.quantity}</span>
                  <span className="w-14 text-right">₹{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-400 my-3" />

            {/* Totals */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>₹{order.subtotal.toFixed(2)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">GST</span>
                  <span>₹{order.tax.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span>₹{order.total.toFixed(2)}</span>
            </div>

            {bill && (
              <>
                <div className="border-t border-dashed border-gray-400 my-3" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment</span>
                  <span className="font-medium">{bill.paymentMode}</span>
                </div>
              </>
            )}

            <div className="border-t border-dashed border-gray-400 mt-3 mb-2" />
            <div className="text-center text-gray-400 text-xs">Thank you! Visit again.</div>
          </div>
        </div>

        {/* Generate bill panel */}
        {!bill && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mt-4 w-full max-w-xs">
            <div className="text-sm font-medium mb-3">Generate Bill</div>
            <div className="flex gap-2 items-center">
              <select
                className="input text-sm flex-1"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
              </select>
              <button className="btn-primary text-sm px-4" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        )}

        {/* Print button */}
        {bill && (
          <button className="btn-primary mt-4 w-full max-w-xs" onClick={handlePrint}>
            Print Receipt
          </button>
        )}
      </div>
    </div>
  );
}
