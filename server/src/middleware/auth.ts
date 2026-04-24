import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthPayload {
  type: 'outlet' | 'admin';
  // outlet session
  outletId?: string;
  outletName?: string;
  mode?: 'operator' | 'manager';
  // admin session
  userId?: string;
  adminName?: string;
}

export interface AuthRequest extends Request {
  auth?: AuthPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    req.auth = jwt.verify(token, config.jwtSecret) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
