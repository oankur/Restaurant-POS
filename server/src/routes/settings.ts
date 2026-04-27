import { Router, Response } from 'express';
import { prisma } from '../index';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: 'global' } })
      ?? await prisma.globalSettings.create({ data: { id: 'global', taxEnabled: true } });
    res.json(settings);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/', async (req: AuthRequest, res: Response) => {
  if (req.auth?.type !== 'outlet' || req.auth?.mode !== 'manager') {
    return res.status(403).json({ message: 'Manager access required' });
  }
  const { taxEnabled } = req.body;
  if (typeof taxEnabled !== 'boolean') {
    return res.status(400).json({ message: 'taxEnabled must be a boolean' });
  }
  try {
    const settings = await prisma.globalSettings.upsert({
      where: { id: 'global' },
      update: { taxEnabled },
      create: { id: 'global', taxEnabled },
    });
    res.json(settings);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
