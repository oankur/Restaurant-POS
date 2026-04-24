import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { config } from '../config';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { loginType, username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  try {
    if (loginType === 'admin') {
      const user = await prisma.user.findUnique({ where: { email: username.toLowerCase() } });
      if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid credentials' });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

      const token = jwt.sign(
        { type: 'admin', userId: user.id, adminName: user.name },
        config.jwtSecret,
        { expiresIn: '24h' }
      );
      return res.json({ token, session: { type: 'admin', userId: user.id, adminName: user.name } });
    }

    if (loginType === 'outlet') {
      const outlet = await prisma.outlet.findUnique({ where: { username: username.toLowerCase() } });
      if (!outlet || !outlet.isActive) return res.status(401).json({ message: 'Invalid credentials' });
      const valid = await bcrypt.compare(password, outlet.password);
      if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

      const payload = { type: 'outlet', outletId: outlet.id, outletName: outlet.name, mode: 'operator' };
      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
      return res.json({ token, session: payload });
    }

    return res.status(400).json({ message: 'Invalid login type' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Switch to manager mode within current outlet session
router.post('/manager-login', authenticate, async (req: AuthRequest, res: Response) => {
  const { password } = req.body;
  if (req.auth?.type !== 'outlet') return res.status(403).json({ message: 'Not an outlet session' });

  try {
    const outlet = await prisma.outlet.findUnique({ where: { id: req.auth.outletId } });
    if (!outlet) return res.status(404).json({ message: 'Outlet not found' });

    const valid = await bcrypt.compare(password, outlet.managerPassword);
    if (!valid) return res.status(403).json({ message: 'Invalid manager password' });

    const payload = { type: 'outlet', outletId: outlet.id, outletName: outlet.name, mode: 'manager' };
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });
    res.json({ token, session: payload });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// Return to operator mode from manager mode
router.post('/exit-manager', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.auth?.type !== 'outlet') return res.status(403).json({ message: 'Not an outlet session' });

  const payload = { type: 'outlet', outletId: req.auth.outletId, outletName: req.auth.outletName, mode: 'operator' };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
  res.json({ token, session: payload });
});

router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json(req.auth);
});

// Update admin credentials (username and/or password)
router.put('/admin/credentials', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.auth?.type !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  const { currentPassword, newUsername, newPassword } = req.body;
  if (!currentPassword) return res.status(400).json({ message: 'Current password is required' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(403).json({ message: 'Current password is incorrect' });

    const data: any = {};
    if (newUsername?.trim()) { data.email = newUsername.trim().toLowerCase(); data.name = newUsername.trim(); }
    if (newPassword?.trim()) data.password = await bcrypt.hash(newPassword.trim(), 10);

    if (!Object.keys(data).length) return res.status(400).json({ message: 'No changes provided' });

    await prisma.user.update({ where: { id: user.id }, data });
    res.json({ message: 'Credentials updated' });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Username already taken' });
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
