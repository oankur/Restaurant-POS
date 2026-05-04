import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { getIO } from '../socket';

const router = Router();

const generateOrderNumber = () =>
  `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

async function getDailySequence(outletId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const count = await prisma.order.count({ where: { outletId, createdAt: { gte: start } } });
  return count + 1;
}

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

  const dailySequence = await getDailySequence(outletId);
  return prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      dailySequence,
      type: 'DELIVERY',
      status: 'PREPARING',
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

// Zomato webhook — payload contains zomato_restaurant_id, mapped to internal outlet
router.post('/zomato/webhook', async (req: Request, res: Response) => {
  const { zomato_restaurant_id, order_id, items, customer_name, customer_phone } = req.body;
  try {
    const outlet = await prisma.outlet.findUnique({ where: { zomatoOutletId: zomato_restaurant_id } });
    if (!outlet) return res.status(404).json({ message: `No outlet mapped to Zomato ID: ${zomato_restaurant_id}` });

    const order = await createDeliveryOrder(outlet.id, 'ZOMATO', items, customer_name, customer_phone, order_id);
    getIO().to(outlet.id).emit('new_order', order);
    getIO().to('super_admin').emit('order_activity', { outletId: outlet.id });
    res.status(201).json({ success: true, orderId: order.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Swiggy webhook — payload contains swiggy_restaurant_id, mapped to internal outlet
router.post('/swiggy/webhook', async (req: Request, res: Response) => {
  const { swiggy_restaurant_id, order_id, items, customer_name, customer_phone } = req.body;
  try {
    const outlet = await prisma.outlet.findUnique({ where: { swiggyOutletId: swiggy_restaurant_id } });
    if (!outlet) return res.status(404).json({ message: `No outlet mapped to Swiggy ID: ${swiggy_restaurant_id}` });

    const order = await createDeliveryOrder(outlet.id, 'SWIGGY', items, customer_name, customer_phone, order_id);
    getIO().to(outlet.id).emit('new_order', order);
    getIO().to('super_admin').emit('order_activity', { outletId: outlet.id });
    res.status(201).json({ success: true, orderId: order.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toing webhook — payload contains toing_restaurant_id, mapped to internal outlet
router.post('/toing/webhook', async (req: Request, res: Response) => {
  const { toing_restaurant_id, order_id, items, customer_name, customer_phone } = req.body;
  try {
    const outlet = await prisma.outlet.findUnique({ where: { toingOutletId: toing_restaurant_id } });
    if (!outlet) return res.status(404).json({ message: `No outlet mapped to Toing ID: ${toing_restaurant_id}` });

    const order = await createDeliveryOrder(outlet.id, 'TOING', items, customer_name, customer_phone, order_id);
    getIO().to(outlet.id).emit('new_order', order);
    getIO().to('super_admin').emit('order_activity', { outletId: outlet.id });
    res.status(201).json({ success: true, orderId: order.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Simulate an incoming Zomato/Swiggy/Toing order (for testing — uses internal outletId directly)
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
    getIO().to('super_admin').emit('order_activity', { outletId });
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
