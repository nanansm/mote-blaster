import {
  pgTable, pgEnum, text, integer, boolean,
  timestamp, date, json, unique,
} from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

// ── Enums ──────────────────────────────────────────────────────────

export const planEnum   = pgEnum('plan',   ['free', 'pro'])
export const roleEnum   = pgEnum('role',   ['user', 'owner'])

export const instanceStatusEnum = pgEnum('instance_status', [
  'disconnected', 'connecting', 'qr_code', 'connected', 'error',
])
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft', 'pending', 'running', 'completed', 'failed', 'paused',
])
export const messageStatusEnum = pgEnum('message_status', [
  'pending', 'sent', 'failed', 'skipped',
])
export const contactSourceEnum    = pgEnum('contact_source',    ['csv', 'google_sheets'])
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'cancelled', 'expired', 'unpaid',
])
export const recordingStatusEnum = pgEnum('recording_status', ['success', 'failed'])

// ── better-auth tables ─────────────────────────────────────────────
// NAMA TABEL HARUS SINGULAR: 'user', 'session', 'account', 'verification'
// better-auth case-sensitive!

export const users = pgTable('user', {
  id:            text('id').primaryKey().$defaultFn(() => createId()),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image:         text('image'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
  // Extended fields (didaftarkan di better-auth additionalFields)
  plan:          planEnum('plan').notNull().default('free'),
  role:          roleEnum('role').notNull().default('user'),
  proExpiresAt:  timestamp('pro_expires_at'),
})

export const sessions = pgTable('session', {
  id:        text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token:     text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
})

export const accounts = pgTable('account', {
  id:                    text('id').primaryKey(),
  accountId:             text('account_id').notNull(),
  providerId:            text('provider_id').notNull(),
  userId:                text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken:           text('access_token'),
  refreshToken:          text('refresh_token'),
  idToken:               text('id_token'),
  accessTokenExpiresAt:  timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope:                 text('scope'),
  password:              text('password'),  // untuk owner email+password
  createdAt:             timestamp('created_at').notNull(),
  updatedAt:             timestamp('updated_at').notNull(),
})

export const verifications = pgTable('verification', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at'),
  updatedAt:  timestamp('updated_at'),
})

// ── App tables ─────────────────────────────────────────────────────

export const instances = pgTable('instances', {
  id:            text('id').primaryKey().$defaultFn(() => createId()),
  userId:        text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:          text('name').notNull(),
  sessionName:   text('session_name').notNull().unique(),
  phoneNumber:   text('phone_number'),
  status:        instanceStatusEnum('status').notNull().default('disconnected'),
  lastConnected: timestamp('last_connected'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
})

export const campaigns = pgTable('campaigns', {
  id:              text('id').primaryKey().$defaultFn(() => createId()),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  instanceId:      text('instance_id').notNull().references(() => instances.id),
  name:            text('name').notNull(),
  messageTemplate: text('message_template').notNull(),
  status:          campaignStatusEnum('status').notNull().default('draft'),
  contactSource:   contactSourceEnum('contact_source').notNull(),
  contactsCount:   integer('contacts_count').notNull().default(0),
  sentCount:       integer('sent_count').notNull().default(0),
  failedCount:     integer('failed_count').notNull().default(0),
  startedAt:       timestamp('started_at'),
  completedAt:     timestamp('completed_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
})

export const contacts = pgTable('contacts', {
  id:         text('id').primaryKey().$defaultFn(() => createId()),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  phone:      text('phone').notNull(),
  name:       text('name'),
  variables:  json('variables').$type<Record<string, string>>(),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
})

export const messageLogs = pgTable('message_logs', {
  id:              text('id').primaryKey().$defaultFn(() => createId()),
  campaignId:      text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  contactPhone:    text('contact_phone').notNull(),
  contactName:     text('contact_name'),
  renderedMessage: text('rendered_message'),
  status:          messageStatusEnum('status').notNull().default('pending'),
  error:           text('error'),
  sentAt:          timestamp('sent_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
}, (t) => ({ uq: unique().on(t.campaignId, t.contactPhone) }))

export const dailyUsage = pgTable('daily_usage', {
  id:        text('id').primaryKey().$defaultFn(() => createId()),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date:      date('date').notNull(),  // YYYY-MM-DD dalam WIB (UTC+7)
  sentCount: integer('sent_count').notNull().default(0),
}, (t) => ({ uq: unique().on(t.userId, t.date) }))

export const subscriptions = pgTable('subscriptions', {
  id:                   text('id').primaryKey().$defaultFn(() => createId()),
  userId:               text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  xenditSubscriptionId: text('xendit_subscription_id').notNull().unique(),
  xenditCustomerId:     text('xendit_customer_id').notNull(),
  status:               subscriptionStatusEnum('status').notNull().default('active'),
  amount:               integer('amount').notNull(),  // dalam IDR
  currency:             text('currency').notNull().default('IDR'),
  currentPeriodStart:   timestamp('current_period_start').notNull(),
  currentPeriodEnd:     timestamp('current_period_end').notNull(),
  cancelledAt:          timestamp('cancelled_at'),
  createdAt:            timestamp('created_at').notNull().defaultNow(),
  updatedAt:            timestamp('updated_at').notNull().defaultNow(),
})

export const chatRecordingConfigs = pgTable('chat_recording_config', {
  id:            text('id').primaryKey().$defaultFn(() => createId()),
  userId:        text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  instanceId:    text('instance_id').notNull().references(() => instances.id, { onDelete: 'cascade' }),
  spreadsheetId: text('spreadsheet_id').notNull(),
  sheetName:     text('sheet_name').notNull().default('Sheet1'),
  isActive:      boolean('is_active').notNull().default(true),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
})

export const chatRecordingLogs = pgTable('chat_recording_logs', {
  id:         text('id').primaryKey().$defaultFn(() => createId()),
  configId:   text('config_id').notNull().references(() => chatRecordingConfigs.id, { onDelete: 'cascade' }),
  phone:      text('phone').notNull(),
  name:       text('name').notNull().default(''),
  message:    text('message').notNull(),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
  status:     recordingStatusEnum('status').notNull().default('success'),
})

export const aiAgents = pgTable('ai_agents', {
  id:             text('id').primaryKey().$defaultFn(() => createId()),
  userId:         text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  instanceId:     text('instance_id').notNull().references(() => instances.id, { onDelete: 'cascade' }),
  isActive:       boolean('is_active').default(false).notNull(),

  // LLM Config
  provider:       text('provider').notNull(),
  apiKey:         text('api_key').notNull(),   // AES-256-GCM encrypted
  model:          text('model').notNull(),

  // Prompt Config
  systemPrompt:   text('system_prompt').notNull().default(''),
  strictRules:    text('strict_rules').notNull().default(''),
  mediaReplyText: text('media_reply_text').notNull().default('Mohon maaf, saat ini saya hanya bisa membalas pesan teks.'),

  // Google Sheet config ID (references chatRecordingConfigs.id — nullable)
  sheetConfigId:  text('sheet_config_id'),

  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
})

export const aiAgentPausedChats = pgTable('ai_agent_paused_chats', {
  id:          text('id').primaryKey().$defaultFn(() => createId()),
  agentId:     text('agent_id').notNull().references(() => aiAgents.id, { onDelete: 'cascade' }),
  phoneNumber: text('phone_number').notNull(),
  pausedAt:    timestamp('paused_at').defaultNow().notNull(),
  resumeAt:    timestamp('resume_at').notNull(),
})

// ── Inferred types ─────────────────────────────────────────────────
export type User                = typeof users.$inferSelect
export type Instance            = typeof instances.$inferSelect
export type Campaign            = typeof campaigns.$inferSelect
export type Contact             = typeof contacts.$inferSelect
export type MessageLog          = typeof messageLogs.$inferSelect
export type Subscription        = typeof subscriptions.$inferSelect
export type ChatRecordingConfig = typeof chatRecordingConfigs.$inferSelect
export type ChatRecordingLog    = typeof chatRecordingLogs.$inferSelect
export type AiAgent             = typeof aiAgents.$inferSelect
export type AiAgentPausedChat   = typeof aiAgentPausedChats.$inferSelect
