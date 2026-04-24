import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin, requireAdminOrManager } from '../middleware/roleCheck';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (req.auth?.type === 'admin') {
      const outlets = await prisma.outlet.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, address: true, phone: true, isActive: true, username: true, taxRate: true, createdAt: true },
      });
      return res.json(outlets);
    }
    if (req.auth?.type === 'outlet') {
      const outlet = await prisma.outlet.findUnique({
        where: { id: req.auth.outletId },
        select: { id: true, name: true, address: true, phone: true, isActive: true, username: true, taxRate: true, createdAt: true },
      });
      return res.json(outlet ? [outlet] : []);
    }
    res.status(403).json({ message: 'Access denied' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const outlet = await prisma.outlet.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, address: true, phone: true, isActive: true, username: true, taxRate: true, createdAt: true },
    });
    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });
    res.json(outlet);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, address, phone, username, password, managerPassword } = req.body;
  if (!username?.trim() || !password?.trim() || !managerPassword?.trim()) {
    return res.status(400).json({ message: 'Username, password, and manager password are required' });
  }
  try {
    const outlet = await prisma.outlet.create({
      data: {
        name,
        address,
        phone,
        username: username.trim().toLowerCase(),
        password: await bcrypt.hash(password, 10),
        managerPassword: await bcrypt.hash(managerPassword, 10),
      },
      select: { id: true, name: true, address: true, phone: true, isActive: true, username: true, taxRate: true, createdAt: true },
    });
    res.status(201).json(outlet);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Username already taken' });
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const { name, address, phone, isActive, password, managerPassword } = req.body;
  try {
    const data: any = { name, address, phone, isActive };
    if (password?.trim()) data.password = await bcrypt.hash(password, 10);
    if (managerPassword?.trim()) data.managerPassword = await bcrypt.hash(managerPassword, 10);
    const outlet = await prisma.outlet.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, address: true, phone: true, isActive: true, username: true, taxRate: true, createdAt: true },
    });
    res.json(outlet);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update tax rate — allowed for outlet manager (own outlet) or admin
router.put('/:id/settings', async (req: AuthRequest, res: Response) => {
  const { taxRate } = req.body;
  const auth = req.auth!;

  if (auth.type === 'outlet') {
    if (auth.mode !== 'manager') return res.status(403).json({ message: 'Manager mode required' });
    if (auth.outletId !== req.params.id) return res.status(403).json({ message: 'Not your outlet' });
  } else if (auth.type !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const outlet = await prisma.outlet.update({
      where: { id: req.params.id },
      data: { taxRate: parseFloat(taxRate) },
      select: { id: true, name: true, taxRate: true },
    });
    res.json(outlet);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  try {
    await prisma.$transaction(async (tx) => {
      // Collect order IDs to delete bills first (no cascade from order → bill)
      const orders = await tx.order.findMany({ where: { outletId: id }, select: { id: true } });
      const orderIds = orders.map((o) => o.id);

      await tx.bill.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { outletId: id } }); // cascades to OrderItems
      await tx.menuItem.deleteMany({ where: { outletId: id } });
      await tx.table.deleteMany({ where: { outletId: id } });
      await tx.outlet.delete({ where: { id } });
    });
    res.json({ message: 'Outlet permanently deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
