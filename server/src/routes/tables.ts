import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdminOrManager, requireOutlet } from '../middleware/roleCheck';

const router = Router();
router.use(authenticate);

router.get('/:outletId', async (req: AuthRequest, res: Response) => {
  try {
    const tables = await prisma.table.findMany({
      where: { outletId: req.params.outletId },
      orderBy: { number: 'asc' },
    });
    res.json(tables);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', requireAdminOrManager, async (req: AuthRequest, res: Response) => {
  const { number, capacity, outletId } = req.body;
  const targetOutlet = outletId || req.auth!.outletId;
  try {
    const table = await prisma.table.create({
      data: { number: parseInt(number), capacity: parseInt(capacity), outletId: targetOutlet },
    });
    res.status(201).json(table);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', requireOutlet, async (req: AuthRequest, res: Response) => {
  const { status, number, capacity } = req.body;
  try {
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: { status, number: number ? parseInt(number) : undefined, capacity: capacity ? parseInt(capacity) : undefined },
    });
    res.json(table);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', requireAdminOrManager, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.table.delete({ where: { id: req.params.id } });
    res.json({ message: 'Table deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
