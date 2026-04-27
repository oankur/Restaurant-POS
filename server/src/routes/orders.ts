import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getIO } from '../socket';

const router = Router();
router.use(authenticate);

const generateOrderNumber = () =>
  `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

router.get('/outlet/:outletId', async (req: AuthRequest, res: Response) => {
  const { status, source, date } = req.query;
  try {
    const where: any = { outletId: req.params.outletId };
    if (status) where.status = status;
    if (source) where.source = source;
    if (date) {
      const d = new Date(date as string);
      where.createdAt = { gte: new Date(d.setHours(0, 0, 0, 0)), lte: new Date(d.setHours(23, 59, 59, 999)) };
    }
    const orders = await prisma.order.findMany({
      where,
      include: { items: { include: { menuItem: true } }, table: true, bill: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { menuItem: true } }, table: true, bill: true },
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const { outletId, type, tableId, items, customerName, customerPhone, notes, source } = req.body;
  try {
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId }, select: { taxRate: true, taxEnabled: true } });
    const taxRate = outlet?.taxEnabled !== false ? (outlet?.taxRate ?? 0.05) : 0;

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: items.map((i: any) => i.menuItemId) } },
    });

    const orderItems = items.map((item: any) => {
      const menuItem = menuItems.find((m) => m.id === item.menuItemId);
      return { menuItemId: item.menuItemId, quantity: item.quantity, price: menuItem!.price, notes: item.notes };
    });

    const subtotal = orderItems.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        type,
        outletId,
        tableId: tableId || null,
        customerName,
        customerPhone,
        notes,
        source: source || 'OFFLINE',
        subtotal,
        tax,
        total,
        items: { create: orderItems },
      },
      include: { items: { include: { menuItem: true } }, table: true },
    });

    if (tableId) {
      await prisma.table.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } });
    }

    getIO().to(outletId).emit('new_order', order);
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/status', async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { items: { include: { menuItem: true } }, table: true, bill: true },
    });

    if (status === 'DELIVERED' || status === 'CANCELLED') {
      if (order.tableId) {
        await prisma.table.update({ where: { id: order.tableId }, data: { status: 'AVAILABLE' } });
      }
    }

    getIO().to(order.outletId).emit('order_updated', order);
    res.json(order);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    getIO().to(order.outletId).emit('order_updated', { ...order, status: 'CANCELLED' });
    res.json({ message: 'Order cancelled' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
