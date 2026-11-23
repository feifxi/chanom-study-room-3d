import { z } from 'zod';
import { LookSchema } from '../accounts/accounts.schemas.js';

export const ACCOUNT_FILTERS = ['all', 'reported', 'restricted', 'under18', 'plus'] as const;
export const ACCOUNT_ACTIONS = ['warn', 'suspend_1d', 'suspend_7d', 'ban', 'lift', 'reset_name'] as const;
export type AccountActionInput = (typeof ACCOUNT_ACTIONS)[number];

const status = z.enum(['active', 'warned', 'suspended', 'banned']);

/** An account in the admin site's list */
export const AdminAccountSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    handle: z.string().nullable(),
    look: LookSchema.nullable(),
    plus: z.boolean(),
    team: z.boolean(),
    status,
    /** A suspension's end */
    until: z.string().nullable(),
    /** Reports against them, all time */
    reports: z.number(),
    joinedAt: z.string(),
    lastSeenAt: z.string().nullable(),
  })
  .meta({ id: 'AdminAccount' });
export type AdminAccount = z.infer<typeof AdminAccountSchema>;

export const AdminAccountListSchema = z
  .object({ accounts: z.array(AdminAccountSchema), total: z.number() })
  .meta({ id: 'AdminAccountList' });
export type AdminAccountList = z.infer<typeof AdminAccountListSchema>;

export const AdminAccountQuerySchema = z.object({
  q: z.string().max(40).optional(),
  filter: z.enum(ACCOUNT_FILTERS).optional(),
});

/** One account, with how they sign in and what the team did before */
export const AdminAccountDetailSchema = AdminAccountSchema.extend({
  email: z.string(),
  signIn: z.array(z.string()),
  age: z.enum(['18+', 'under 18', 'unknown']),
  roomsOwned: z.number(),
  actions: z.array(z.object({ kind: z.string(), reason: z.string(), until: z.string().nullable(), by: z.string(), at: z.string() })),
}).meta({ id: 'AdminAccountDetail' });
export type AdminAccountDetail = z.infer<typeof AdminAccountDetailSchema>;

export const AccountActionBodySchema = z
  .object({
    kind: z.enum(ACCOUNT_ACTIONS),
    /** Emailed to them with the action; they reply to appeal */
    reason: z.string().trim().min(3).max(500),
  })
  .meta({ id: 'AccountActionBody' });

export const REPORT_DECISIONS = {
  person: ['warn', 'suspend_1d', 'suspend_7d', 'ban', 'dismiss'],
  message: ['delete', 'delete_warn', 'delete_suspend_1d', 'dismiss'],
  room: ['delist', 'close', 'close_suspend_owner', 'dismiss'],
} as const;
const ALL_DECISIONS = [...new Set(Object.values(REPORT_DECISIONS).flat())] as [string, ...string[]];
export type ReportDecision = (typeof REPORT_DECISIONS)[keyof typeof REPORT_DECISIONS][number];

/**
 * A case in the reports queue: every report about the same person, message or room, so the team
 * sees how many different accounts reported it and decides once.
 */
export const ReportCaseSchema = z
  .object({
    key: z.string(),
    kind: z.enum(['person', 'message', 'room']),
    /** Who or what: the person's name, the message's author, the room's name */
    name: z.string(),
    handle: z.string().nullable(),
    userId: z.string().nullable(),
    roomId: z.string().nullable(),
    reasons: z.array(z.string()),
    details: z.array(z.string()),
    reporters: z.number(),
    where: z.string().nullable(),
    firstAt: z.string(),
    lastAt: z.string(),
    urgent: z.boolean(),
    /** What the automatic steps already did */
    auto: z.string().nullable(),
    context: z.array(z.object({ by: z.string(), text: z.string(), flagged: z.boolean(), bubble: z.boolean() })),
    /** A room's own words, for room reports */
    room: z.object({ description: z.string(), rules: z.string() }).nullable(),
    history: z.array(z.string()),
    status: z.enum(['open', 'done']),
    outcome: z.string().nullable(),
    decidedBy: z.string().nullable(),
    decidedAt: z.string().nullable(),
  })
  .meta({ id: 'ReportCase' });
export type ReportCase = z.infer<typeof ReportCaseSchema>;

export const ReportCaseListSchema = z.object({ cases: z.array(ReportCaseSchema), open: z.number() }).meta({ id: 'ReportCaseList' });
export type ReportCaseList = z.infer<typeof ReportCaseListSchema>;

export const ReportCaseQuerySchema = z.object({ status: z.enum(['open', 'done']).optional() });

export const ReportDecideBodySchema = z
  .object({
    action: z.enum(ALL_DECISIONS),
    /** Emailed with an account action; kept with the decision. Not needed to dismiss */
    reason: z.string().trim().max(500).optional(),
  })
  .meta({ id: 'ReportDecideBody' });
