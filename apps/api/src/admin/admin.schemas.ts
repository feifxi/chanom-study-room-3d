import { COMMON_CAPACITY_RANGE } from '@connecta/shared';
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

// ── Rooms ────────────────────────────────────────────────────────────────────────────────────

export const ROOM_FILTERS = ['all', 'listed', 'reported', 'closed'] as const;
export const ROOM_ACTIONS = ['delist', 'relist', 'close', 'reopen'] as const;

export const AdminRoomSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    emoji: z.string(),
    mapId: z.string(),
    visibility: z.enum(['private', 'request', 'open']),
    owner: z.object({ id: z.string(), name: z.string(), handle: z.string().nullable() }).nullable(),
    plus: z.boolean(),
    members: z.number(),
    inside: z.number(),
    capacity: z.number(),
    /** Open reports about the room itself */
    reports: z.number(),
    state: z.enum(['ok', 'delisted', 'closed']),
    createdAt: z.string(),
  })
  .meta({ id: 'AdminRoom' });
export type AdminRoom = z.infer<typeof AdminRoomSchema>;
export const AdminRoomListSchema = z.object({ rooms: z.array(AdminRoomSchema), total: z.number() }).meta({ id: 'AdminRoomList' });
export type AdminRoomList = z.infer<typeof AdminRoomListSchema>;
export const AdminRoomQuerySchema = z.object({ q: z.string().trim().max(60).optional(), filter: z.enum(ROOM_FILTERS).optional() });
export const RoomActionBodySchema = z
  .object({ kind: z.enum(ROOM_ACTIONS), reason: z.string().trim().min(3, 'Say why (it’s emailed to the owner)').max(500) })
  .meta({ id: 'RoomActionBody' });

// ── Common rooms and Moderation ──────────────────────────────────────────────────────────────

export const AdminCommonSchema = z
  .object({
    types: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        mapId: z.string(),
        here: z.number(),
        copies: z.array(z.object({ n: z.number(), name: z.string(), people: z.number() })),
      }),
    ),
    capacity: z.number(),
    friendSeats: z.number(),
    /** The notice showing in every Common room now, if any */
    notice: z.object({ text: z.string(), until: z.string() }).nullable(),
  })
  .meta({ id: 'AdminCommon' });
export type AdminCommon = z.infer<typeof AdminCommonSchema>;

export const CommonSeatsBodySchema = z
  .object({
    capacity: z.number().int().min(COMMON_CAPACITY_RANGE.min).max(COMMON_CAPACITY_RANGE.max),
    friendSeats: z.number().int().min(0).max(20),
  })
  .refine((b) => b.friendSeats < b.capacity, { message: 'Keep at least one seat for strangers', path: ['friendSeats'] })
  .meta({ id: 'CommonSeatsBody' });
export const CommonNoticeBodySchema = z.object({ text: z.string().trim().min(1).max(120) }).meta({ id: 'CommonNoticeBody' });

export const ModerationSchema = z
  .object({
    wordFilter: z.boolean(),
    reportSteps: z.boolean(),
    pictureCheck: z.boolean(),
    /** Whether OPENAI_API_KEY is set: without it the picture check can't run, switch or not */
    pictureCheckReady: z.boolean(),
    words: z.array(z.string()),
  })
  .meta({ id: 'Moderation' });
export type Moderation = z.infer<typeof ModerationSchema>;
export const ModerationBodySchema = z
  .object({ wordFilter: z.boolean().optional(), reportSteps: z.boolean().optional(), pictureCheck: z.boolean().optional() })
  .meta({ id: 'ModerationBody' });
export const WordBodySchema = z
  .object({ word: z.string().trim().toLowerCase().min(2, 'At least 2 characters').max(60) })
  .meta({ id: 'WordBody' });

// ── Overview, Money, Audit log (part 4) ──────────────────────────────────────────────────────

const StatSchema = z.object({ label: z.string(), value: z.string(), note: z.string(), warn: z.boolean() });

export const AuditRowSchema = z
  .object({
    id: z.string(),
    at: z.string(),
    /** The team member's name, or null for an automatic step */
    by: z.string().nullable(),
    /** "account.suspend", "room.close", "report.warn", "setting.word_add"… */
    action: z.string(),
    targetKind: z.string(),
    /** Who or what, as a person reads it: "Jod @jod.dev", "Chanom Friends", "the word list" */
    target: z.string(),
    reason: z.string(),
    details: z.string().nullable(),
  })
  .meta({ id: 'AuditRow' });
export type AuditRow = z.infer<typeof AuditRowSchema>;

export const AdminOverviewSchema = z
  .object({
    stats: z.array(StatSchema),
    health: z.array(z.object({ name: z.string(), status: z.enum(['ok', 'warn', 'down']), detail: z.string() })),
    /** The urgent open report cases, oldest first */
    urgent: z.array(
      z.object({
        key: z.string(),
        kind: z.string(),
        name: z.string(),
        reasons: z.array(z.string()),
        where: z.string().nullable(),
        reporters: z.number(),
        lastAt: z.string(),
      }),
    ),
    latest: z.array(AuditRowSchema),
  })
  .meta({ id: 'AdminOverview' });
export type AdminOverview = z.infer<typeof AdminOverviewSchema>;

export const REFUND_REASONS = ['Charged twice', 'Renewed by mistake (within 48 h)', 'A bug on our side', 'Something else'] as const;
export const PAYMENT_FILTERS = ['all', 'refunded', 'gifts'] as const;

export const AdminPaymentSchema = z
  .object({
    id: z.string(),
    at: z.string(),
    who: z.object({ id: z.string(), name: z.string(), handle: z.string().nullable() }).nullable(),
    what: z.string(),
    method: z.string(),
    amount: z.number(),
    status: z.enum(['paid', 'refunded']),
    refund: z.object({ reason: z.string(), at: z.string(), by: z.string() }).nullable(),
    /** Gifts can't be refunded once received */
    refundable: z.boolean(),
  })
  .meta({ id: 'AdminPayment' });
export type AdminPayment = z.infer<typeof AdminPaymentSchema>;

export const AdminMoneySchema = z
  .object({
    stats: z.array(StatSchema),
    /** Active plans by plan and method; monthly revenue counts a yearly plan over 12 months */
    mix: z.array(z.object({ plan: z.string(), people: z.number(), mrr: z.number() })),
    payments: z.array(AdminPaymentSchema),
    /** false: the local stand-in takes payments, so a refund only marks the payment */
    stripe: z.boolean(),
  })
  .meta({ id: 'AdminMoney' });
export type AdminMoney = z.infer<typeof AdminMoneySchema>;
export const AdminMoneyQuerySchema = z.object({ filter: z.enum(PAYMENT_FILTERS).optional() });
export const RefundBodySchema = z.object({ reason: z.enum(REFUND_REASONS) }).meta({ id: 'RefundBody' });

export const AuditQuerySchema = z.object({
  who: z.enum(['all', 'team', 'auto', 'rooms']).optional(),
  /** An entry's id: the page after it (older) */
  before: z.string().max(64).optional(),
});
export const AuditListSchema = z.object({ entries: z.array(AuditRowSchema), more: z.boolean() }).meta({ id: 'AuditList' });
export type AuditList = z.infer<typeof AuditListSchema>;
