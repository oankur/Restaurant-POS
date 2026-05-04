import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdminOrManager } from '../middleware/roleCheck';

const router = Router();
router.use(authenticate);

router.get('/:outletId', async (req: AuthRequest, res: Response) => {
  try {
    const subCategories = await prisma.subCategory.findMany({
      where: { outletId: req.params.outletId },
      orderBy: { name: 'asc' },
    });
    res.json(subCategories);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', requireAdminOrManager, async (req: AuthRequest, res: Response) => {
  const { name, outletId } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Sub-category name is required' });
  const targetOutlet = outletId || req.auth!.outletId;
  try {
    const subCategory = await prisma.subCategory.create({
      data: { name: name.trim(), outletId: targetOutlet },
    });
    res.status(201).json(subCategory);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Sub-category already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', requireAdminOrManager, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Sub-category name is required' });
  try {
    const subCategory = await prisma.subCategory.update({
      where: { id: req.params.id },
      data: { name: name.trim() },
    });
    res.json(subCategory);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Sub-category already exists' });
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', requireAdminOrManager, async (req: AuthRequest, res: Response) => {
  try {
    const subCategory = await prisma.subCategory.findUnique({ where: { id: req.params.id } });
    if (!subCategory) return res.status(404).json({ message: 'Sub-category not found' });

    const itemCount = await prisma.menuItem.count({
      where: { outletId: subCategory.outletId, subCategory: subCategory.name },
    });
    if (itemCount > 0) {
      return res.status(400).json({ message: `Cannot delete — ${itemCount} menu item${itemCount > 1 ? 's' : ''} use this sub-category` });
    }

    await prisma.subCategory.delete({ where: { id: req.params.id } });
    res.json({ message: 'Sub-category deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
