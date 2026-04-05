import { Queue, Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../config/database';
import { wppConnectService } from './wppconnect.service';
import { renderTemplate } from '../utils/templateEngine';
import { normalizePhone } from '../utils/csvParser';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const blastQueue = new Queue('blast-queue', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 15000,
    },
  },
});

export async function addBlastJobs(
  campaignId: string,
  contacts: Array<{ phone: string; name?: string; variables?: Record<string, string> }>,
  instanceId: string,
  userId: string,
  template: string,
  delayVariation: boolean = false
) {
  const jobs = contacts.map((contact) => ({
    name: 'send-message',
    data: {
      campaignId,
      instanceId,
      userId,
      phone: contact.phone,
      name: contact.name,
      variables: contact.variables || {},
      messageTemplate: template,
      delayVariation,
    },
    opts: {} as any,
  }));

  // Add all jobs to queue with a staggered delay (10s minimum between messages)
  for (let i = 0; i < jobs.length; i++) {
    const delayMs = i * 10000; // 10 seconds per message

    if (delayVariation) {
      // Add random variation between 10-30 seconds
      const variation = Math.floor(Math.random() * 20000) + 10000; // 10-30s
      jobs[i].opts!.delay = delayMs + variation;
    } else {
      jobs[i].opts!.delay = delayMs;
    }
  }

  await blastQueue.addBulk(jobs);
}

export function createBlastWorker() {
  return new Worker(
    'blast-queue',
    async (job: Job) => {
      const { campaignId, instanceId, userId, phone, name, variables, messageTemplate, delayVariation } = job.data;

      // Check daily limit
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD in UTC

      const dailyUsage = await prisma.dailyUsage.upsert({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        create: {
          userId,
          date: new Date(today),
          sentCount: 0,
        },
        update: {},
      });

      // Check limit (FREE plan: 50 messages/day)
      const freeLimit = parseInt(process.env.FREE_PLAN_DAILY_LIMIT || '50', 10);
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.plan === 'FREE' && dailyUsage.sentCount >= freeLimit) {
        // Mark as skipped due to limit
        await prisma.messageLog.update({
          where: {
            campaignId_contactPhone: {
              campaignId,
              contactPhone: phone,
            },
          },
          data: {
            status: 'SKIPPED',
            error: 'Daily limit reached',
          },
        });

        // Update campaign counts
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            failedCount: {
              increment: 1,
            },
          },
        });

        return { skipped: true, reason: 'daily limit' };
      }

      // Render message
      const contactVars: Record<string, string> = {
        name: name || phone,
        phone,
        ...variables,
      };

      const renderedMessage = renderTemplate(messageTemplate, contactVars);

      // Ensure phone is in E.164 format
      const normalizedPhone = normalizePhone(phone);

      // Send via WPPConnect
      const result = await wppConnectService.sendMessage(
        `uid_${userId}_iid_${instanceId}`,
        normalizedPhone,
        renderedMessage
      );

      // Update message log
      await prisma.messageLog.update({
        where: {
          campaignId_contactPhone: {
            campaignId,
            contactPhone: phone,
          },
        },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          renderedMessage,
          error: result.error,
          sentAt: result.success ? new Date() : null,
        },
      });

      // Update campaign counts and daily usage
      if (result.success) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            sentCount: {
              increment: 1,
            },
          },
        });

        await prisma.dailyUsage.update({
          where: {
            userId_date: {
              userId,
              date: today,
            },
          },
          data: {
            sentCount: {
              increment: 1,
            },
          },
        });
      } else {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            failedCount: {
              increment: 1,
            },
          },
        });
      }

      // Check if campaign is complete
      await checkCampaignCompletion(campaignId);

      return { success: result.success, phone };
    },
    {
      connection,
      concurrency: 1, // Process one job at a time to enforce 10s delay
      limiter: {
        max: 1,
        duration: 10000, // 10 seconds
      },
    }
  );
}

async function checkCampaignCompletion(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      _count: {
        select: {
          contacts: true,
          messageLogs: {
            where: {
              status: {
                in: ['SENT', 'FAILED', 'SKIPPED'],
              },
            },
          },
        },
      },
    },
  });

  if (!campaign) return;

  const totalProcessed = campaign._count.messageLogs;
  const totalContacts = campaign._count.contacts;

  if (totalProcessed >= totalContacts) {
    const status =
      campaign.failedCount > 0 && campaign.sentCount === 0
        ? 'FAILED'
        : 'COMPLETED';

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status,
        completedAt: new Date(),
      },
    });
  }
}

export default { blastQueue, addBlastJobs, createBlastWorker };
