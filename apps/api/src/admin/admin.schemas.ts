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
