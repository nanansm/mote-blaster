import { Request, Response, NextFunction } from 'express';
import cookie from 'cookie';
import { verifyAccessToken } from '../utils/jwt';
import { Subscription } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    plan: string;
    subscription?: Subscription;
  };
}

function getTokenFromRequest(req: Request): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // Fallback to cookies
  const cookies = cookie.parse(req.headers.cookie || '');
  return cookies.access_token || null;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  (req as AuthRequest).user = decoded;
  next();
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);

  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded) {
      (req as AuthRequest).user = decoded;
    }
  }

  next();
}
