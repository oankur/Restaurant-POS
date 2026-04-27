import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleCheck';

const router = Router();
router.use(authenticate);

const IST = '+05:30';

// Returns "YYYY-MM-DD" in IST from any Date (UTC-stored)
const istKey = (d: Date) => {
  const ist = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
};

router.get('/outlet/:outletId', async (req: AuthRequest, res: Response) => {
  const { from, to } = req.query;
  // Parse dates as IST midnight / end-of-day so the filter matches Indian calendar days
  const fromDate = from ? new Date(`${from as string}T00:00:00${IST}`) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate   = to   ? new Date(`${to   as string}T23:59:59.999${IST}`) : (() => {
    const key = istKey(new Date());
    return new Date(`${key}T23:59:59.999${IST}`);
  })();

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

    const revenueBySource: Record<string, number> = {};
    const ordersBySource: Record<string, typeof orders> = { OFFLINE: [], ZOMATO: [], SWIGGY: [] };
    orders.forEach((o) => {
      revenueBySource[o.source] = (revenueBySource[o.source] || 0) + o.total;
      if (!ordersBySource[o.source]) ordersBySource[o.source] = [];
      ordersBySource[o.source].push(o);
    });

    const topItems: Record<string, { name: string; count: number; revenue: number }> = {};
    orders.forEach((o) => {
      o.items.forEach((i) => {
        const name = i.menuItem?.name ?? i.itemName ?? 'Unknown Item';
        if (!topItems[name]) topItems[name] = { name, count: 0, revenue: 0 };
        topItems[name].count += i.quantity;
        topItems[name].revenue += i.price * i.quantity;
      });
    });
    const topItemsList = Object.values(topItems).sort((a, b) => b.count - a.count).slice(0, 10);

    type DayEntry = { OFFLINE: { revenue: number; count: number }; ZOMATO: { revenue: number; count: number }; SWIGGY: { revenue: number; count: number }; total: number; orders: number };
    const dailyBreakdown: Record<string, DayEntry> = {};
    // Walk IST calendar days from fromDate to toDate
    const cursor = new Date(fromDate);
    const endKey = istKey(toDate);
    while (istKey(cursor) <= endKey) {
      dailyBreakdown[istKey(cursor)] = { OFFLINE: { revenue: 0, count: 0 }, ZOMATO: { revenue: 0, count: 0 }, SWIGGY: { revenue: 0, count: 0 }, total: 0, orders: 0 };
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    orders.forEach((o) => {
      const key = istKey(o.createdAt);
      if (dailyBreakdown[key]) {
        const src = o.source as 'OFFLINE' | 'ZOMATO' | 'SWIGGY';
        dailyBreakdown[key][src].revenue += o.total;
        dailyBreakdown[key][src].count += 1;
        dailyBreakdown[key].total += o.total;
        dailyBreakdown[key].orders += 1;
      }
    });

    res.json({ totalRevenue, totalOrders, avgOrderValue, bySource, revenueBySource, ordersBySource, byType, topItems: topItemsList, dailyBreakdown });
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
