import type { Order, Bill } from '../types';

function printInIframe(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;';
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  };
}

const baseStyle = `
  @page { size: 80mm auto; margin: 5mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',monospace; font-size:12px; width:70mm; margin:0 auto; }
  @media print { body { margin:0; padding:0; } }
  h1 { text-align:center; font-size:15px; letter-spacing:1px; }
  .sub { text-align:center; font-size:11px; color:#555; margin-bottom:4px; }
  .divider { border-top:1px dashed #000; margin:6px 0; }
  .row { display:flex; justify-content:space-between; padding:2px 0; }
  .bold { font-weight:bold; }
  .center { text-align:center; }
  .lg { font-size:14px; }
`;

export function printKOT(order: Order, outletName = '') {
  const html = `<!DOCTYPE html><html><head><title>KOT</title><style>${baseStyle}</style></head><body>
    <h1>** KOT **</h1>
    <p class="sub">Kitchen Order Ticket</p>
    ${outletName ? `<p class="sub">${outletName}</p>` : ''}
    <div class="divider"></div>
    <div class="row"><span class="bold">Order#</span><span>${order.orderNumber.slice(-8)}</span></div>
    <div class="row"><span class="bold">Type</span><span>${order.type.replace('_', ' ')}${order.table ? ` · T${order.table.number}` : ''}</span></div>
    <div class="row"><span class="bold">Source</span><span>${order.source}</span></div>
    <div class="row"><span class="bold">Time</span><span>${new Date().toLocaleTimeString()}</span></div>
    <div class="divider"></div>
    <div class="row bold"><span>Qty</span><span style="flex:1;padding-left:8px;">Item</span></div>
    <div class="divider"></div>
    ${order.items.map(i => `
      <div class="row">
        <span style="width:28px;">${i.quantity}x</span>
        <span style="flex:1;padding-left:8px;">${i.itemName ?? i.menuItem?.name}${i.notes ? `<br><span style="font-size:10px;color:#666;">${i.notes}</span>` : ''}</span>
      </div>`).join('')}
    ${order.notes ? `<div class="divider"></div><div class="row"><span class="bold">Note:</span><span>${order.notes}</span></div>` : ''}
    <div class="divider"></div>
    <p class="center" style="font-size:10px;margin-top:6px;">${new Date().toLocaleString()}</p>
  </body></html>`;
  printInIframe(html);
}

export function formatInvoiceId(order: Order, dailySequence?: number): string {
  const d = new Date(order.createdAt);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const seq = String(dailySequence ?? 1).padStart(3, '0');
  return `${dd}/${mm}/${yyyy}/${seq}`;
}


export function printBill(order: Order, bill: Bill) {
  const outletAddress = bill.order?.outlet?.address ?? order.outlet?.address ?? '';
  const invoiceId = formatInvoiceId(order, bill.dailySequence);

  const html = `<!DOCTYPE html><html><head><title>Bill</title><style>${baseStyle}</style></head><body>
    <h1>The Highlander's Shawarma</h1>
    <p class="sub">Customer Bill</p>
    ${outletAddress ? `<p class="sub">${outletAddress}</p>` : ''}
    <div class="divider"></div>
    <div class="row"><span class="bold">Invoice#</span><span style="font-size:10px;">${invoiceId}</span></div>
    <div class="row"><span class="bold">Date</span><span>${new Date(order.createdAt).toLocaleDateString()}</span></div>
    <div class="row"><span class="bold">Time</span><span>${new Date(order.createdAt).toLocaleTimeString()}</span></div>
    ${order.table ? `<div class="row"><span class="bold">Table</span><span>${order.table.number}</span></div>` : ''}
    ${order.customerName ? `<div class="row"><span class="bold">Customer</span><span>${order.customerName}</span></div>` : ''}
    <div class="divider"></div>
    <div class="row bold"><span style="flex:1">Item</span><span style="width:28px;text-align:center;">Qty</span><span style="width:55px;text-align:right;">Total</span></div>
    <div class="divider"></div>
    ${order.items.map(i => `
      <div class="row">
        <span style="flex:1">${i.itemName ?? i.menuItem?.name}</span>
        <span style="width:28px;text-align:center;">${i.quantity}</span>
        <span style="width:55px;text-align:right;">₹${(i.price * i.quantity).toFixed(0)}</span>
      </div>`).join('')}
    <div class="divider"></div>
    <div class="row"><span>Subtotal</span><span>₹${bill.subtotal.toFixed(2)}</span></div>
    <div class="row"><span>GST (5%)</span><span>₹${bill.tax.toFixed(2)}</span></div>
    <div class="divider"></div>
    <div class="row bold lg"><span>TOTAL</span><span>₹${bill.total.toFixed(2)}</span></div>
    <div class="divider"></div>
    <div class="row"><span>Payment Mode</span><span>${bill.paymentMode}</span></div>
    <p class="center" style="margin-top:10px;">Thank you! Visit again.</p>
  </body></html>`;
  printInIframe(html);
}
