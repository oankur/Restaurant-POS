import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const orderInclude = {
  items: { include: { menuItem: true } },
  table: true,
  outlet: true,
};

async function getDailySequence(orderId: string, outletId: string, orderCreatedAt: Date): Promise<number> {
  const dayStart = new Date(orderCreatedAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(orderCreatedAt);
  dayEnd.setHours(23, 59, 59, 999);
  const todaysOrders = await prisma.order.findMany({
    where: { outletId, createdAt: { gte: dayStart, lte: dayEnd } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  const position = todaysOrders.findIndex((o) => o.id === orderId) + 1;
  console.log('[dailySeq]', { orderId, dayStart, dayEnd, found: todaysOrders.map(o => o.id), position });
  return position > 0 ? position : todaysOrders.length;
}

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const bill = await prisma.bill.findUnique({
      where: { id: req.params.id },
      include: { order: { include: orderInclude } },
    });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    const dailySequence = await getDailySequence(bill.order.id, bill.order.outletId, bill.order.createdAt);
    res.json({ ...bill, dailySequence });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/order/:orderId', async (req: AuthRequest, res: Response) => {
  try {
    const bill = await prisma.bill.findUnique({
      where: { orderId: req.params.orderId },
      include: { order: { include: orderInclude } },
    });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    const dailySequence = await getDailySequence(bill.order.id, bill.order.outletId, bill.order.createdAt);
    res.json({ ...bill, dailySequence });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/generate/:orderId', async (req: AuthRequest, res: Response) => {
  const { paymentMode } = req.body;
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const existing = await prisma.bill.findUnique({
      where: { orderId: req.params.orderId },
      include: { order: { include: orderInclude } },
    });
    if (existing) {
      const dailySequence = await getDailySequence(existing.order.id, existing.order.outletId, existing.order.createdAt);
      return res.json({ ...existing, dailySequence });
    }

    const bill = await prisma.bill.create({
      data: {
        orderId: req.params.orderId,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        paymentMode: paymentMode || 'CASH',
        isPaid: true,
      },
      include: { order: { include: orderInclude } },
    });

    await prisma.order.update({ where: { id: req.params.orderId }, data: { status: 'DELIVERED' } });
    if (order.tableId) {
      await prisma.table.update({ where: { id: order.tableId }, data: { status: 'AVAILABLE' } });
    }

    const dailySequence = await getDailySequence(order.id, order.outletId, order.createdAt);
    res.status(201).json({ ...bill, dailySequence });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
