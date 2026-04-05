import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import type { AuthRequest } from './auth.middleware';

export async function checkPlanLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = user.plan;

    // Attach plan and subscription info to request for use in controllers
    authReq.user = {
      ...authReq.user!,
      plan,
      subscription: user.subscription ?? undefined,
    };

    next();
  } catch (error) {
    console.error('Plan limit check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export function requireProPlan(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest;
  if (authReq.user?.plan !== 'PRO') {
    return res.status(403).json({
      error: 'This feature requires a Pro plan',
      upgradeRequired: true,
    });
  }
  next();
}
