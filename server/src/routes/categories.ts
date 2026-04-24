import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdminOrManager } from '../middleware/roleCheck';

const router = Router();
router.use(authenticate);

router.get('/:outletId', async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { outletId: req.params.outletId },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', requireAdminOrManager, async (req: AuthRequest, res: Response) => {
  const { name, outletId } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Category name is required' });
  const targetOutlet = outletId || req.auth!.outletId;
  try {
    const category = await prisma.category.create({
      data: { name: name.trim(), outletId: targetOutlet },
    });
    res.status(201).json(category);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Category already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', requireAdminOrManager, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Category name is required' });
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name: name.trim() },
    });
    res.json(category);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Category already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', requireAdminOrManager, async (req: AuthRequest, res: Response) => {
  try {
    const category = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const itemCount = await prisma.menuItem.count({
      where: { outletId: category.outletId, category: category.name },
    });
    if (itemCount > 0) {
      return res.status(400).json({ message: `Cannot delete — ${itemCount} menu item${itemCount > 1 ? 's' : ''} use this category` });
    }

    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: 'Category deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
