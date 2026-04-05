export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  plan: 'FREE' | 'PRO';
  createdAt: string;
}

export interface Instance {
  id: string;
  userId: string;
  name: string;
  sessionName: string;
  phoneNumber?: string | null;
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_CODE' | 'CONNECTED' | 'ERROR';
  lastConnected?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  instanceId: string;
  name: string;
  messageTemplate: string;
  status: 'DRAFT' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  contactSource: 'CSV' | 'GOOGLE_SHEETS';
  contactsCount: number;
  sentCount: number;
  failedCount: number;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  instance?: {
    id: string;
    name: string;
  };
}

export interface Contact {
  id: string;
  campaignId: string;
  phone: string;
  name?: string | null;
  variables?: Record<string, string> | null;
  createdAt: string;
}

export interface ContactData {
  phone: string;
  name?: string;
  [key: string]: string | undefined;
}

export interface MessageLog {
  id: string;
  campaignId: string;
  contactPhone: string;
  contactName?: string | null;
  renderedMessage?: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  error?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  xenditSubscriptionId: string;
  xenditCustomerId: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'UNPAID';
  planName: string;
  amount: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  sentCount: number;
  failedCount: number;
  activeInstances: number;
  activeCampaigns: number;
  dailySentCount: number;
  dailyRemaining: number | null;
}

export type Plan = 'FREE' | 'PRO';
