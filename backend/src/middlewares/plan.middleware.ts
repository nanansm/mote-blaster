import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../config/database';

export async function checkPlanLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      include: {
        subscription: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const plan = user.plan;

    // Attach plan info to request for use in controllers
    req.user = {
      ...req.user!,
      plan,
      subscription: user.subscription,
    };

    next();
  } catch (error) {
    console.error('Plan limit check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export function requireProPlan(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.plan !== 'PRO') {
    return res.status(403).json({
      error: 'This feature requires a Pro plan',
      upgradeRequired: true,
    });
  }
  next();
}
