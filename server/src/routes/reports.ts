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
    const ordersBySource: Record<string, typeof orders> = { OFFLINE: [], ZOMATO: [], SWIGGY: [], TOING: [] };
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

    type DayEntry = { OFFLINE: { revenue: number; count: number }; ZOMATO: { revenue: number; count: number }; SWIGGY: { revenue: number; count: number }; TOING: { revenue: number; count: number }; total: number; orders: number };
    const dailyBreakdown: Record<string, DayEntry> = {};
    // Walk IST calendar days from fromDate to toDate
    const cursor = new Date(fromDate);
    const endKey = istKey(toDate);
    while (istKey(cursor) <= endKey) {
      dailyBreakdown[istKey(cursor)] = { OFFLINE: { revenue: 0, count: 0 }, ZOMATO: { revenue: 0, count: 0 }, SWIGGY: { revenue: 0, count: 0 }, TOING: { revenue: 0, count: 0 }, total: 0, orders: 0 };
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    orders.forEach((o) => {
      const key = istKey(o.createdAt);
      if (dailyBreakdown[key]) {
        const src = o.source as 'OFFLINE' | 'ZOMATO' | 'SWIGGY' | 'TOING';
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

router.get('/super', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { period, from, to } = req.query;

  const todayKey = istKey(new Date());
  let fromDate: Date, toDate: Date;

  if (period === 'today') {
    fromDate = new Date(`${todayKey}T00:00:00${IST}`);
    toDate   = new Date(`${todayKey}T23:59:59.999${IST}`);
  } else if (period === 'week') {
    const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const dow = ist.getDay();
    ist.setDate(ist.getDate() - (dow === 0 ? 6 : dow - 1));
    const mondayKey = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
    fromDate = new Date(`${mondayKey}T00:00:00${IST}`);
    toDate   = new Date(`${todayKey}T23:59:59.999${IST}`);
  } else if (period === 'month') {
    const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const firstKey = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-01`;
    fromDate = new Date(`${firstKey}T00:00:00${IST}`);
    toDate   = new Date(`${todayKey}T23:59:59.999${IST}`);
  } else if (from && to) {
    fromDate = new Date(`${from as string}T00:00:00${IST}`);
    toDate   = new Date(`${to   as string}T23:59:59.999${IST}`);
  } else {
    fromDate = new Date(`${todayKey}T00:00:00${IST}`);
    toDate   = new Date(`${todayKey}T23:59:59.999${IST}`);
  }

  try {
    const orders = await prisma.order.findMany({
      where: { status: { not: 'CANCELLED' }, createdAt: { gte: fromDate, lte: toDate } },
      include: {
        items: { include: { menuItem: true } },
        bill: { select: { paymentMode: true, isPaid: true } },
        outlet: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    type SourceBucket = { count: number; revenue: number };
    type SourceMap = { OFFLINE: SourceBucket; ZOMATO: SourceBucket; SWIGGY: SourceBucket; TOING: SourceBucket };
    const emptySource = (): SourceMap => ({
      OFFLINE: { count: 0, revenue: 0 },
      ZOMATO:  { count: 0, revenue: 0 },
      SWIGGY:  { count: 0, revenue: 0 },
      TOING:   { count: 0, revenue: 0 },
    });

    // Grand totals
    const grandBySource = emptySource();
    orders.forEach((o) => {
      const s = o.source as keyof SourceMap;
      grandBySource[s].count   += 1;
      grandBySource[s].revenue += o.total;
    });
    const onlineCount   = grandBySource.ZOMATO.count   + grandBySource.SWIGGY.count   + grandBySource.TOING.count;
    const onlineRevenue = grandBySource.ZOMATO.revenue + grandBySource.SWIGGY.revenue + grandBySource.TOING.revenue;

    // Per-outlet
    const outletMap: Record<string, any> = {};
    orders.forEach((o) => {
      const oid = o.outlet.id;
      if (!outletMap[oid]) {
        outletMap[oid] = { id: oid, name: o.outlet.name, totalRevenue: 0, totalOrders: 0, bySource: emptySource(), recentOrders: [] };
      }
      const entry = outletMap[oid];
      entry.totalRevenue += o.total;
      entry.totalOrders  += 1;
      const s = o.source as keyof SourceMap;
      entry.bySource[s].count   += 1;
      entry.bySource[s].revenue += o.total;
      if (entry.recentOrders.length < 15) {
        entry.recentOrders.push({
          id: o.id, orderNumber: o.orderNumber, source: o.source, type: o.type,
          total: o.total, status: o.status, createdAt: o.createdAt,
          paymentMode: o.bill?.paymentMode ?? null,
          items: o.items.map((i) => ({ name: i.menuItem?.name ?? i.itemName ?? 'Unknown', quantity: i.quantity, price: i.price })),
        });
      }
    });

    // Daily time series
    type DaySeries = { date: string; totalRevenue: number; totalOrders: number; bySource: SourceMap };
    const dailyMap: Record<string, DaySeries> = {};
    const cursor = new Date(fromDate);
    const endKey  = istKey(toDate);
    while (istKey(cursor) <= endKey) {
      const key = istKey(cursor);
      dailyMap[key] = { date: key, totalRevenue: 0, totalOrders: 0, bySource: emptySource() };
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    orders.forEach((o) => {
      const key = istKey(o.createdAt);
      if (dailyMap[key]) {
        dailyMap[key].totalRevenue += o.total;
        dailyMap[key].totalOrders  += 1;
        const s = o.source as keyof SourceMap;
        dailyMap[key].bySource[s].count   += 1;
        dailyMap[key].bySource[s].revenue += o.total;
      }
    });
    const daily = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));

    // Weekly time series (Monday-anchored)
    const weekMap: Record<string, any> = {};
    orders.forEach((o) => {
      const ist = new Date(o.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const dow = ist.getDay();
      const mon = new Date(ist);
      mon.setDate(ist.getDate() - (dow === 0 ? 6 : dow - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      const monKey = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
      const sunKey = `${sun.getFullYear()}-${String(sun.getMonth() + 1).padStart(2, '0')}-${String(sun.getDate()).padStart(2, '0')}`;
      if (!weekMap[monKey]) {
        weekMap[monKey] = {
          startDate: monKey, endDate: sunKey,
          label: `${mon.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
          totalRevenue: 0, totalOrders: 0, bySource: emptySource(),
        };
      }
      weekMap[monKey].totalRevenue += o.total;
      weekMap[monKey].totalOrders  += 1;
      const s = o.source as keyof SourceMap;
      weekMap[monKey].bySource[s].count   += 1;
      weekMap[monKey].bySource[s].revenue += o.total;
    });
    const weekly = Object.values(weekMap).sort((a: any, b: any) => b.startDate.localeCompare(a.startDate));

    // Monthly time series
    const monthMap: Record<string, any> = {};
    orders.forEach((o) => {
      const ist = new Date(o.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const mk = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[mk]) {
        monthMap[mk] = {
          month: mk,
          label: ist.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          totalRevenue: 0, totalOrders: 0, bySource: emptySource(),
        };
      }
      monthMap[mk].totalRevenue += o.total;
      monthMap[mk].totalOrders  += 1;
      const s = o.source as keyof SourceMap;
      monthMap[mk].bySource[s].count   += 1;
      monthMap[mk].bySource[s].revenue += o.total;
    });
    const monthly = Object.values(monthMap).sort((a: any, b: any) => b.month.localeCompare(a.month));

    res.json({
      period: { from: istKey(fromDate), to: istKey(toDate) },
      grand: {
        totalRevenue: orders.reduce((s, o) => s + o.total, 0),
        totalOrders: orders.length,
        bySource: grandBySource,
        online: { count: onlineCount, revenue: onlineRevenue },
      },
      outlets: Object.values(outletMap),
      timeSeries: { daily, weekly, monthly },
    });
  } catch (err) {
    console.error(err);
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
