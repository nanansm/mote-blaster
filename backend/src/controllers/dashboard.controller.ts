import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth.middleware';

export const dashboardController = {
  // GET /api/v1/dashboard/stats
  getStats: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      // Messages sent this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const sentCount = await prisma.messageLog.count({
        where: {
          campaign: {
            userId,
          },
          status: 'SENT',
          sentAt: {
            gte: startOfMonth,
          },
        },
      });

      const failedCount = await prisma.messageLog.count({
        where: {
          campaign: {
            userId,
          },
          status: 'FAILED',
          sentAt: {
            gte: startOfMonth,
          },
        },
      });

      const activeInstances = await prisma.instance.count({
        where: {
          userId,
          status: 'CONNECTED',
        },
      });

      const activeCampaigns = await prisma.campaign.count({
        where: {
          userId,
          status: {
            in: ['RUNNING', 'PENDING'],
          },
        },
      });

      // Daily usage for today
      const today = new Date().toISOString().split('T')[0];
      const dailyUsage = await prisma.dailyUsage.findUnique({
        where: {
          userId_date: {
            userId,
            date: new Date(today),
          },
        },
      });

      const dailySentCount = dailyUsage?.sentCount || 0;
      const dailyLimit = parseInt(process.env.FREE_PLAN_DAILY_LIMIT || '50', 10);
      const isPro = req.user!.plan === 'PRO';
      const dailyRemaining = isPro ? null : dailyLimit - dailySentCount;

      res.json({
        sentCount,
        failedCount,
        activeInstances,
        activeCampaigns,
        dailySentCount,
        dailyRemaining,
      });
    } catch (error) {
      console.error('getStats error:', error);
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
  },

  // GET /api/v1/dashboard/chart/daily?days=30
  getDailyChart: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const days = parseInt(req.query.days as string) || 30;

      const data: Array<{ date: string; sent: number; failed: number }> = [];

      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const sent = await prisma.messageLog.count({
          where: {
            campaign: {
              userId,
            },
            status: 'SENT',
            sentAt: {
              gte: new Date(dateStr),
              lt: new Date(dateStr + 'T23:59:59'),
            },
          },
        });

        const failed = await prisma.messageLog.count({
          where: {
            campaign: {
              userId,
            },
            status: 'FAILED',
            sentAt: {
              gte: new Date(dateStr),
              lt: new Date(dateStr + 'T23:59:59'),
            },
          },
        });

        data.push({ date: dateStr, sent, failed });
      }

      res.json({ data });
    } catch (error) {
      console.error('getDailyChart error:', error);
      return res.status(500).json({ error: 'Failed to fetch chart data' });
    }
  },

  // GET /api/v1/dashboard/chart/campaigns
  getCampaignChart: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const campaigns = await prisma.campaign.groupBy({
        by: ['status'],
        where: { userId },
        _count: {
          id: true,
        },
      });

      const statusMap: Record<string, number> = {};
      campaigns.forEach((c) => {
        statusMap[c.status] = c._count.id;
      });

      res.json({ data: statusMap });
    } catch (error) {
      console.error('getCampaignChart error:', error);
      return res.status(500).json({ error: 'Failed to fetch campaign data' });
    }
  },
};
