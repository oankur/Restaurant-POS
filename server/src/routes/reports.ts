import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleCheck';

const router = Router();
router.use(authenticate);

router.get('/outlet/:outletId', async (req: AuthRequest, res: Response) => {
  const { from, to } = req.query;
  const fromDate = from ? new Date(from as string) : new Date(new Date().setDate(new Date().getDate() - 30));
  const toDate = to ? new Date(to as string) : new Date();
  toDate.setHours(23, 59, 59, 999);

  try {
    const orders = await prisma.order.findMany({
      where: {
        outletId: req.params.outletId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: { items: { include: { menuItem: true } }, bill: true },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const bySource = orders.reduce((acc: any, o) => { acc[o.source] = (acc[o.source] || 0) + 1; return acc; }, {});
    const byType = orders.reduce((acc: any, o) => { acc[o.type] = (acc[o.type] || 0) + 1; return acc; }, {});

    const topItems: Record<string, { name: string; count: number; revenue: number }> = {};
    orders.forEach((o) => {
      o.items.forEach((i) => {
        const name = i.menuItem.name;
        if (!topItems[name]) topItems[name] = { name, count: 0, revenue: 0 };
        topItems[name].count += i.quantity;
        topItems[name].revenue += i.price * i.quantity;
      });
    });
    const topItemsList = Object.values(topItems).sort((a, b) => b.count - a.count).slice(0, 10);

    const dailyRevenue: Record<string, number> = {};
    orders.forEach((o) => {
      const day = o.createdAt.toISOString().split('T')[0];
      dailyRevenue[day] = (dailyRevenue[day] || 0) + o.total;
    });

    res.json({ totalRevenue, totalOrders, avgOrderValue, bySource, byType, topItems: topItemsList, dailyRevenue });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const outlets = await prisma.outlet.findMany({ where: { isActive: true } });
    const summary = await Promise.all(
      outlets.map(async (outlet) => {
        const orders = await prisma.order.findMany({
          where: { outletId: outlet.id, status: { not: 'CANCELLED' } },
        });
        return {
          outlet: { id: outlet.id, name: outlet.name },
          totalOrders: orders.length,
          totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
        };
      })
    );
    res.json(summary);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
