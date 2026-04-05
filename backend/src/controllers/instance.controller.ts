import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import { wppConnectService } from '../services/wppconnect.service';

export const instanceController = {
  // GET /api/v1/instances
  listInstances: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const instances = await prisma.instance.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ instances });
    } catch (error) {
      console.error('listInstances error:', error);
      return res.status(500).json({ error: 'Failed to fetch instances' });
    }
  },

  // POST /api/v1/instances
  createInstance: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { name } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Instance name is required' });
      }

      // Check plan limits
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const maxInstances = user.plan === 'FREE'
        ? parseInt(process.env.FREE_PLAN_MAX_INSTANCES || '1', 10)
        : 5;

      const existingCount = await prisma.instance.count({
        where: { userId },
      });

      if (existingCount >= maxInstances) {
        return res.status(403).json({
          error: 'Instance limit reached',
          upgradeRequired: true,
        });
      }

      // Create instance first
      const instance = await prisma.instance.create({
        data: {
          userId,
          name,
        },
      });

      // Update with proper session name following spec: uid_{userId}_iid_{instanceId}
      const sessionName = `uid_${userId}_iid_${instance.id}`;
      await prisma.instance.update({
        where: { id: instance.id },
        data: { sessionName },
      });

      res.status(201).json({ ...instance, sessionName });
    } catch (error) {
      console.error('createInstance error:', error);
      return res.status(500).json({ error: 'Failed to create instance' });
    }
  },

  // GET /api/v1/instances/:id
  getInstance: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!instance) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      // Get status from WPPConnect
      const wppStatus = await wppConnectService.getSessionStatus(instance.sessionName);

      res.json({
        instance: {
          ...instance,
          wppStatus,
        },
      });
    } catch (error) {
      console.error('getInstance error:', error);
      return res.status(500).json({ error: 'Failed to fetch instance' });
    }
  },

  // POST /api/v1/instances/:id/connect
  connectInstance: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!instance) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      // Update status to CONNECTING
      await prisma.instance.update({
        where: { id },
        data: { status: 'CONNECTING' },
      });

      // Start WPPConnect session
      const result = await wppConnectService.startSession(instance.sessionName);

      // If QR code is available, set status to QR_CODE
      if (result.qrCode) {
        await prisma.instance.update({
          where: { id },
          data: { status: 'QR_CODE' },
        });

        return res.json({
          instance: {
            ...instance,
            status: 'QR_CODE',
          },
          qrCode: result.qrCode,
        });
      }

      res.json({
        instance: {
          ...instance,
          status: 'CONNECTING',
        },
      });
    } catch (error) {
      console.error('connectInstance error:', error);
      return res.status(500).json({ error: 'Failed to connect instance' });
    }
  },

  // GET /api/v1/instances/:id/qr
  getQRCode: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!instance) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      const qrCode = await wppConnectService.getQRCode(instance.sessionName);

      res.json({ qrCode });
    } catch (error) {
      console.error('getQRCode error:', error);
      return res.status(500).json({ error: 'Failed to fetch QR code' });
    }
  },

  // DELETE /api/v1/instances/:id
  deleteInstance: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const instance = await prisma.instance.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!instance) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      // Close and delete WPPConnect session
      try {
        await wppConnectService.closeSession(instance.sessionName);
      } catch (e) {
        console.error('Error closing WPPConnect session:', e);
      }

      // Delete from DB
      await prisma.instance.delete({
        where: { id },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('deleteInstance error:', error);
      return res.status(500).json({ error: 'Failed to delete instance' });
    }
  },
};
