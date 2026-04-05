import { Response } from 'express';
import multer from 'multer';
import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import { MessageQueueService, addBlastJobs } from '../services/messageQueue.service';
import { parseCSV, ContactData } from '../utils/csvParser';
import { fetchSheetData, extractSpreadsheetId } from '../services/googleSheets.service';
import { TemplateEngine } from 'socket.io';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const campaignController = {
  // GET /api/v1/campaigns
  listCampaigns: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string | undefined;

      const where: any = { userId };

      if (status && status !== 'ALL') {
        where.status = status;
      }

      const skip = (page - 1) * limit;

      const [campaigns, total] = await Promise.all([
        prisma.campaign.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            instance: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.campaign.count({ where }),
      ]);

      res.json({
        campaigns,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('listCampaigns error:', error);
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  },

  // POST /api/v1/campaigns
  createCampaign: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { name, instanceId, messageTemplate, contactSource, contacts = [] } = req.body;

      if (!name || !instanceId || !messageTemplate || !contactSource) {
        return res.status(400).json({
          error: 'Missing required fields: name, instanceId, messageTemplate, contactSource',
        });
      }

      // Verify instance belongs to user and is connected
      const instance = await prisma.instance.findFirst({
        where: {
          id: instanceId,
          userId,
        },
      });

      if (!instance) {
        return res.status(404).json({ error: 'Instance not found' });
      }

      if (instance.status !== 'CONNECTED') {
        return res.status(400).json({ error: 'Instance must be connected to create campaign' });
      }

      // Check plan limits
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const maxCampaigns = user.plan === 'FREE'
        ? parseInt(process.env.FREE_PLAN_MAX_CAMPAIGNS || '2', 10)
        : Infinity;

      const activeCampaigns = await prisma.campaign.count({
        where: {
          userId,
          status: {
            in: ['RUNNING', 'PENDING'],
          },
        },
      });

      if (activeCampaigns >= maxCampaigns) {
        return res.status(403).json({
          error: 'Campaign limit reached',
          upgradeRequired: true,
        });
      }

      // Create campaign
      const campaign = await prisma.campaign.create({
        data: {
          userId,
          instanceId,
          name,
          messageTemplate,
          status: 'DRAFT',
          contactSource: contactSource === 'CSV' ? 'CSV' : 'GOOGLE_SHEETS',
          contactsCount: contacts.length,
        },
      });

      // Create contacts
      if (contacts.length > 0) {
        await prisma.contact.createMany({
          data: contacts.map((c: ContactData) => ({
            campaignId: campaign.id,
            phone: c.phone,
            name: c.name || undefined,
            variables: c.variables || null,
          })),
        });

        // Create message logs
        await prisma.messageLog.createMany({
          data: contacts.map((c: ContactData) => ({
            campaignId: campaign.id,
            contactPhone: c.phone,
            contactName: c.name,
            status: 'PENDING',
          })),
        });
      }

      res.status(201).json({ campaign });
    } catch (error) {
      console.error('createCampaign error:', error);
      return res.status(500).json({ error: 'Failed to create campaign' });
    }
  },

  // GET /api/v1/campaigns/:id
  getCampaign: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const campaign = await prisma.campaign.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          instance: true,
          contacts: {
            take: 5,
          },
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json({ campaign });
    } catch (error) {
      console.error('getCampaign error:', error);
      return res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  },

  // PUT /api/v1/campaigns/:id
  updateCampaign: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const { name, messageTemplate } = req.body;

      const campaign = await prisma.campaign.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      if (campaign.status !== 'DRAFT') {
        return res.status(400).json({ error: 'Cannot update campaign that is not in draft status' });
      }

      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(messageTemplate && { messageTemplate }),
        },
      });

      res.json({ campaign: updated });
    } catch (error) {
      console.error('updateCampaign error:', error);
      return res.status(500).json({ error: 'Failed to update campaign' });
    }
  },

  // DELETE /api/v1/campaigns/:id
  deleteCampaign: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const campaign = await prisma.campaign.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      await prisma.campaign.delete({
        where: { id },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('deleteCampaign error:', error);
      return res.status(500).json({ error: 'Failed to delete campaign' });
    }
  },

  // POST /api/v1/campaigns/:id/start
  startCampaign: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const campaign = await prisma.campaign.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          instance: true,
          contacts: true,
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      if (campaign.status === 'RUNNING') {
        return res.status(400).json({ error: 'Campaign is already running' });
      }

      if (campaign.contacts.length === 0) {
        return res.status(400).json({ error: 'Campaign has no contacts' });
      }

      // Update campaign status to RUNNING
      await prisma.campaign.update({
        where: { id },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // Add jobs to queue
      await addBlastJobs(
        campaign.id,
        campaign.contacts,
        campaign.instanceId,
        userId,
        campaign.messageTemplate,
        false // delayVariation toggled via UI
      );

      res.json({ success: true, message: 'Campaign started' });
    } catch (error) {
      console.error('startCampaign error:', error);
      return res.status(500).json({ error: 'Failed to start campaign' });
    }
  },

  // POST /api/v1/campaigns/:id/pause
  pauseCampaign: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const campaign = await prisma.campaign.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      if (campaign.status !== 'RUNNING') {
        return res.status(400).json({ error: 'Only running campaigns can be paused' });
      }

      // Pause the queue
      await MessageQueueService.blastQueue.pause();

      await prisma.campaign.update({
        where: { id },
        data: { status: 'PAUSED' },
      });

      res.json({ success: true, message: 'Campaign paused' });
    } catch (error) {
      console.error('pauseCampaign error:', error);
      return res.status(500).json({ error: 'Failed to pause campaign' });
    }
  },

  // GET /api/v1/campaigns/:id/logs
  getCampaignLogs: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;

      // Verify campaign belongs to user
      const campaign = await prisma.campaign.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const skip = (page - 1) * limit;

      const where: any = { campaignId: id };
      if (status && status !== 'ALL') {
        where.status = status;
      }

      const [logs, total] = await Promise.all([
        prisma.messageLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.messageLog.count({ where }),
      ]);

      res.json({
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('getCampaignLogs error:', error);
      return res.status(500).json({ error: 'Failed to fetch campaign logs' });
    }
  },

  // GET /api/v1/campaigns/:id/export
  exportCampaignLogs: async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Verify campaign belongs to user
      const campaign = await prisma.campaign.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const logs = await prisma.messageLog.findMany({
        where: { campaignId: id },
        orderBy: { createdAt: 'asc' },
      });

      // Generate CSV
      const headers = ['phone', 'name', 'status', 'error', 'sentAt', 'renderedMessage'];
      const rows = logs.map((log) => [
        log.contactPhone,
        log.contactName || '',
        log.status,
        log.error || '',
        log.sentAt?.toISOString() || '',
        log.renderedMessage || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="campaign-${id}-report.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('exportCampaignLogs error:', error);
      return res.status(500).json({ error: 'Failed to export campaign logs' });
    }
  },

  // POST /api/v1/campaigns/upload-csv
  uploadCSV: async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file as { buffer: Buffer } | undefined;

      if (!file) {
        return res.status(400).json({ error: 'CSV file is required' });
      }

      const contacts = await parseCSV(file.buffer);

      if (contacts.length === 0) {
        return res.status(400).json({ error: 'No valid contacts found in CSV' });
      }

      res.json({
        success: true,
        totalCount: contacts.length,
        preview: contacts.slice(0, 5),
      });
    } catch (error: any) {
      console.error('uploadCSV error:', error);
      return res.status(400).json({
        error: error.message || 'Failed to parse CSV',
      });
    }
  },

  // POST /api/v1/campaigns/fetch-sheet
  fetchSheet: async (req: AuthRequest, res: Response) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'Google Sheets URL is required' });
      }

      const spreadsheetId = extractSpreadsheetId(url);
      if (!spreadsheetId) {
        return res.status(400).json({ error: 'Invalid Google Sheets URL' });
      }

      const contacts = await fetchSheetData(spreadsheetId);

      if (contacts.length === 0) {
        return res.status(400).json({ error: 'No contacts found in sheet' });
      }

      res.json({
        success: true,
        totalCount: contacts.length,
        preview: contacts.slice(0, 5),
      });
    } catch (error: any) {
      console.error('fetchSheet error:', error);
      return res.status(400).json({
        error: error.message || 'Failed to fetch Google Sheet',
      });
    }
  },
};
