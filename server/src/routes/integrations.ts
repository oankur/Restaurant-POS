import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { getIO } from '../socket';

const router = Router();

const generateOrderNumber = () =>
  `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

async function createDeliveryOrder(
  outletId: string,
  source: string,
  items: Array<{ name: string; price: number; quantity: number; notes?: string }>,
  customerName: string,
  customerPhone: string,
  externalId: string,
) {
  const outlet = await prisma.outlet.findUnique({ where: { id: outletId }, select: { taxRate: true, taxEnabled: true } });
  const taxRate = outlet?.taxEnabled !== false ? (outlet?.taxRate ?? 0.05) : 0;

  const orderItems = items.map((item) => ({
    itemName: item.name,
    quantity: item.quantity,
    price: item.price,
    notes: item.notes,
  }));

  const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      type: 'DELIVERY',
      source,
      outletId,
      customerName,
      customerPhone,
      externalId,
      subtotal,
      tax,
      total,
      items: { create: orderItems },
    },
    include: { items: { include: { menuItem: true } } },
  });
}

// Zomato webhook (receives orders from Zomato)
// Expected payload: { outletId, customerName, customerPhone, externalId, items: [{ name, price, quantity }] }
router.post('/zomato/webhook', async (req: Request, res: Response) => {
  const { outletId, items, customerName, customerPhone, externalId } = req.body;
  try {
    const order = await createDeliveryOrder(outletId, 'ZOMATO', items, customerName, customerPhone, externalId);
    getIO().to(outletId).emit('new_order', order);
    res.status(201).json({ success: true, orderId: order.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Swiggy webhook (receives orders from Swiggy)
// Expected payload: { outletId, customerName, customerPhone, externalId, items: [{ name, price, quantity }] }
router.post('/swiggy/webhook', async (req: Request, res: Response) => {
  const { outletId, items, customerName, customerPhone, externalId } = req.body;
  try {
    const order = await createDeliveryOrder(outletId, 'SWIGGY', items, customerName, customerPhone, externalId);
    getIO().to(outletId).emit('new_order', order);
    res.status(201).json({ success: true, orderId: order.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Simulate an incoming Zomato/Swiggy order (for testing)
router.post('/simulate/:outletId', async (req: Request, res: Response) => {
  const { outletId } = req.params;
  const { source } = req.body;
  try {
    const simulatedItems = [
      { name: 'Chicken Shawarma', price: 160, quantity: 2 },
      { name: 'Garlic Sauce', price: 40, quantity: 1 },
    ];
    const order = await createDeliveryOrder(
      outletId,
      source || 'ZOMATO',
      simulatedItems,
      'Test Customer',
      '+91 9000000000',
      `EXT-${Date.now()}`,
    );
    getIO().to(outletId).emit('new_order', order);
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
