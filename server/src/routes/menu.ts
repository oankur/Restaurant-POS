import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdminOrManager } from '../middleware/roleCheck';

const router = Router();
router.use(authenticate);

router.get('/:outletId', async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.menuItem.findMany({
      where: { outletId: req.params.outletId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(items);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', requireAdminOrManager, async (req: AuthRequest, res: Response) => {
  const { name, description, price, category, outletId } = req.body;
  const targetOutlet = outletId || req.auth!.outletId;
  try {
    const item = await prisma.menuItem.create({
      data: { name, description, price: parseFloat(price), category, outletId: targetOutlet },
    });
    res.status(201).json(item);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', requireAdminOrManager, async (req: AuthRequest, res: Response) => {
  const { name, description, price, category, isAvailable } = req.body;
  try {
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { name, description, price: price ? parseFloat(price) : undefined, category, isAvailable },
    });
    res.json(item);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', requireAdminOrManager, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.menuItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Item deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
