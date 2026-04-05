import { Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middlewares/auth.middleware';
import { xenditService } from '../services/xendit.service';

export const billingController = {
  // GET /api/v1/billing/plans
  getPlans: async (req: AuthRequest, res: Response) => {
    try {
      const proPrice = parseInt(process.env.XENDIT_PRO_PLAN_PRICE || '99000', 10);

      res.json({
        plans: [
          {
            id: 'FREE',
            name: 'Free',
            price: 0,
            currency: 'IDR',
            features: [
              '50 messages/day',
              '1 WhatsApp instance',
              '2 active campaigns',
              'Basic support',
            ],
          },
          {
            id: 'PRO',
            name: 'Pro',
            price: proPrice,
            currency: 'IDR',
            interval: 'month',
            features: [
              'Unlimited messages',
              '5 WhatsApp instances',
              'Unlimited campaigns',
              'Priority support',
              'Advanced analytics',
            ],
          },
        ],
      });
    } catch (error) {
      console.error('getPlans error:', error);
      return res.status(500).json({ error: 'Failed to fetch plans' });
    }
  },

  // GET /api/v1/billing/subscription
  getSubscription: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      res.json({ subscription });
    } catch (error) {
      console.error('getSubscription error:', error);
      return res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  },

  // POST /api/v1/billing/subscribe
  subscribe: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { planId } = req.body;

      if (planId !== 'PRO') {
        return res.status(400).json({ error: 'Invalid plan' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.plan === 'PRO') {
        return res.status(400).json({ error: 'User already on Pro plan' });
      }

      // Create or get Xendit customer
      let existingSub = await prisma.subscription.findUnique({
        where: { userId },
      });

      let customerId = existingSub?.xenditCustomerId;

      if (!customerId) {
        const customer = await xenditService.createCustomer(
          user.id,
          user.email,
          user.name
        );
        customerId = customer.id;
      }

      // Create recurring plan
      const plan = await xenditService.createRecurringPlan(customerId);

      // Create subscription
      const subscription = await xenditService.createSubscription(customerId, plan.id);

      // Save subscription to DB
      await prisma.subscription.create({
        data: {
          userId,
          xenditSubscriptionId: subscription.id,
          xenditCustomerId: customerId,
          status: 'UNPAID',
          planName: 'PRO',
          amount: parseInt(process.env.XENDIT_PRO_PLAN_PRICE || '99000', 10),
          currency: 'IDR',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      res.json({
        success: true,
        paymentUrl: subscription.invoice_url,
        subscriptionId: subscription.id,
      });
    } catch (error: any) {
      console.error('subscribe error:', error);
      return res.status(500).json({
        error: error.response?.data?.message || 'Failed to create subscription',
      });
    }
  },

  // POST /api/v1/billing/cancel
  cancelSubscription: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      if (subscription.status !== 'ACTIVE') {
        return res.status(400).json({ error: 'Cannot cancel inactive subscription' });
      }

      await xenditService.cancelSubscription(subscription.xenditSubscriptionId);

      await prisma.subscription.update({
        where: { userId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      res.json({ success: true, message: 'Subscription cancelled' });
    } catch (error: any) {
      console.error('cancelSubscription error:', error);
      return res.status(500).json({
        error: error.response?.data?.message || 'Failed to cancel subscription',
      });
    }
  },

  // GET /api/v1/billing/invoices
  getInvoices: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        return res.json({ invoices: [] });
      }

      // Fetch invoices from Xendit
      // Note: Xendit API integration would require additional endpoints
      // For now, return subscription info
      res.json({
        invoices: [
          {
            id: subscription.xenditSubscriptionId,
            status: subscription.status,
            amount: subscription.amount,
            currency: subscription.currency,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            createdAt: subscription.createdAt,
          },
        ],
      });
    } catch (error) {
      console.error('getInvoices error:', error);
      return res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  },

  // POST /api/v1/billing/webhook
  webhook: async (req: Response, res: Response) => {
    try {
      const token = req.headers['x-callback-token'] as string;

      if (!xenditService.verifyWebhookToken(token)) {
        return res.status(400).json({ error: 'Invalid webhook token' });
      }

      const { event, data } = req.body;

      console.log('Xendit webhook:', event, data);

      switch (event) {
        case 'invoice.paid':
          await handleInvoicePaid(data);
          break;

        case 'invoice.expired':
          await handleInvoiceExpired(data);
          break;

        case 'subscription.cancelled':
          await handleSubscriptionCancelled(data);
          break;

        default:
          console.log(`Unhandled webhook event: ${event}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('webhook error:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  },
};

async function handleInvoicePaid(data: any) {
  const subscriptionId = data.subscription_id;

  const subscription = await prisma.subscription.findFirst({
    where: { xenditSubscriptionId: subscriptionId },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        currentPeriodStart: new Date(data.period_start_date),
        currentPeriodEnd: new Date(data.period_end_date),
      },
    });

    await prisma.user.update({
      where: { id: subscription.userId },
      data: { plan: 'PRO' },
    });
  }
}

async function handleInvoiceExpired(data: any) {
  const subscriptionId = data.subscription_id;

  const subscription = await prisma.subscription.findFirst({
    where: { xenditSubscriptionId: subscriptionId },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'EXPIRED',
      },
    });

    // Downgrade to FREE after grace period (could use a paid job)
    await prisma.user.update({
      where: { id: subscription.userId },
      data: { plan: 'FREE' },
    });
  }
}

async function handleSubscriptionCancelled(data: any) {
  const subscriptionId = data.subscription_id;

  const subscription = await prisma.subscription.findFirst({
    where: { xenditSubscriptionId: subscriptionId },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
  }
}
