import { Queue, Job, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../config/database';
import { wppConnectService } from './wppconnect.service';
import { renderTemplate } from '../utils/templateEngine';
import { normalizePhone } from '../utils/csvParser';

// Parse Redis URL manually agar maxRetriesPerRequest: null diterapkan dengan benar
function createRedisConnection() {
  const redisUrl = process.env.REDIS_URL!;
  const url = new URL(redisUrl);

  return new IORedis({
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    username: url.username || undefined,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
}

const connection = createRedisConnection();

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
  const jobs = contacts.map((contact, i) => {
    const baseDelay = i * 10000;
    const extraDelay = delayVariation
      ? Math.floor(Math.random() * 20000) + 10000
      : 0;

    return {
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
      opts: {
        delay: baseDelay + extraDelay,
      },
    };
  });

  await blastQueue.addBulk(jobs);
}

export function createBlastWorker() {
  const workerConnection = createRedisConnection();

  return new Worker(
    'blast-queue',
    async (job: Job) => {
      const { campaignId, instanceId, userId, phone, name, variables, messageTemplate } = job.data;

      const today = new Date().toISOString().split('T')[0];

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

      const freeLimit = parseInt(process.env.FREE_PLAN_DAILY_LIMIT || '50', 10);
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user?.plan === 'FREE' && dailyUsage.sentCount >= freeLimit) {
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

        await prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });

        return { skipped: true, reason: 'daily limit' };
      }

      const contactVars: Record<string, string> = {
        name: name || phone,
        phone,
        ...variables,
      };

      const renderedMessage = renderTemplate(messageTemplate, contactVars);
      const normalizedPhone = normalizePhone(phone);

      const result = await wppConnectService.sendMessage(
        `uid_${userId}_iid_${instanceId}`,
        normalizedPhone,
        renderedMessage
      );

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

      if (result.success) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { sentCount: { increment: 1 } },
        });

        await prisma.dailyUsage.update({
          where: {
            userId_date: { userId, date: today },
          },
          data: { sentCount: { increment: 1 } },
        });
      } else {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }

      await checkCampaignCompletion(campaignId);

      return { success: result.success, phone };
    },
    {
      connection: workerConnection,
      concurrency: 1,
      limiter: {
        max: 1,
        duration: 10000,
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
              status: { in: ['SENT', 'FAILED', 'SKIPPED'] },
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
      campaign.failedCount > 0 && campaign.sentCount === 0 ? 'FAILED' : 'COMPLETED';

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