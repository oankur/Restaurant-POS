import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.auth?.type !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

export const requireOutlet = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.auth?.type !== 'outlet') return res.status(403).json({ message: 'Outlet access required' });
  next();
};

export const requireManager = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.auth?.type !== 'outlet' || req.auth.mode !== 'manager')
    return res.status(403).json({ message: 'Manager mode required' });
  next();
};

export const requireAdminOrManager = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.auth?.type === 'admin') return next();
  if (req.auth?.type === 'outlet' && req.auth.mode === 'manager') return next();
  return res.status(403).json({ message: 'Admin or manager access required' });
};
