import axios from 'axios';

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY!;
const XENDIT_WEBHOOK_TOKEN = process.env.XENDIT_WEBHOOK_TOKEN!;
const XENDIT_PRO_PLAN_PRICE = parseInt(process.env.XENDIT_PRO_PLAN_PRICE || '99000');
const XENDIT_PRO_PLAN_NAME = process.env.XENDIT_PRO_PLAN_NAME || 'Mote Blaster Pro';

const xendit = axios.create({
  baseURL: 'https://api.xendit.co',
  auth: {
    username: XENDIT_SECRET_KEY,
    password: '',
  },
  headers: {
    'Content-Type': 'application/json',
  },
});

export class XenditService {
  async createCustomer(userId: string, email: string, name: string) {
    try {
      const response = await xendit.post('/customers', {
        reference_id: `user_${userId}`,
        email,
        name,
      });
      return response.data;
    } catch (error: any) {
      console.error('Xendit createCustomer error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createRecurringPlan(customerId: string) {
    try {
      const response = await xendit.post('/recurring_payment_plans', {
        name: XENDIT_PRO_PLAN_NAME,
        interval: 'MONTH',
        interval_count: 1,
        amount: XENDIT_PRO_PLAN_PRICE,
        currency: 'IDR',
        customer_id: customerId,
        invoice_auto_redirect: true,
        description: 'Monthly subscription for Mote Blaster Pro',
      });
      return response.data;
    } catch (error: any) {
      console.error('Xendit createRecurringPlan error:', error.response?.data || error.message);
      throw error;
    }
  }

  async createSubscription(customerId: string, planId: string) {
    try {
      const response = await xendit.post('/recurring_payments/subscriptions', {
        customer_id: customerId,
        plan_id: planId,
      });
      return response.data;
    } catch (error: any) {
      console.error('Xendit createSubscription error:', error.response?.data || error.message);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string) {
    try {
      const response = await xendit.post(`/recurring_payments/subscriptions/${subscriptionId}/cancel`);
      return response.data;
    } catch (error: any) {
      console.error('Xendit cancelSubscription error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getSubscription(subscriptionId: string) {
    try {
      const response = await xendit.get(`/recurring_payments/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error: any) {
      console.error('Xendit getSubscription error:', error.response?.data || error.message);
      throw error;
    }
  }

  verifyWebhookToken(token: string): boolean {
    return token === XENDIT_WEBHOOK_TOKEN;
  }
}

export const xenditService = new XenditService();
