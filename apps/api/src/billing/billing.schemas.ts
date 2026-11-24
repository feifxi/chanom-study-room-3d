import { GIFT_MONTHS, GIFT_NOTE_MAX, PAY_METHODS, PLAN_IDS } from '@connecta/shared';
import { PersonSchema } from '../rooms/rooms.schemas.js';
import { z } from 'zod';

export const ReceiptSchema = z.object({
  id: z.string(),
  at: z.string(),
  what: z.string(),
  /** Baht */
  amount: z.number().int(),
  method: z.enum(PAY_METHODS),
});

/** One receipt to print or save as a PDF (/receipt/<id>) */
export const ReceiptDetailSchema = ReceiptSchema.extend({
  /** Who paid: the account's name and email */
  name: z.string(),
  email: z.string().nullable(),
  refundedAt: z.string().nullable(),
}).meta({ id: 'ReceiptDetail' });
export type ReceiptDetail = z.infer<typeof ReceiptDetailSchema>;

/** Stripe's billing page for a card subscriber */
export const ManageSchema = z.object({ url: z.string() }).meta({ id: 'Manage' });

/** Settings → Plus & billing (docs/features/15-plus.md) */
export const BillingSchema = z
  .object({
    plus: z.boolean(),
    /** Plus runs until then (null: never had it) */
    until: z.string().nullable(),
    plan: z.enum(PLAN_IDS as [string, ...string[]]).nullable(),
    method: z.enum(PAY_METHODS).nullable(),
    /** Renews on the date (a card by itself, PromptPay by reminder); false once cancelled */
    renews: z.boolean(),
    receipts: z.array(ReceiptSchema),
    /** Gift Plus you gave, newest first */
    giftsSent: z.array(z.object({ to: PersonSchema, months: z.number().int(), at: z.string() })),
    /** Real Stripe (false: the local stand-in payment page) */
    stripe: z.boolean(),
  })
  .meta({ id: 'Billing' });
export type Billing = z.infer<typeof BillingSchema>;

export const CheckoutBodySchema = z
  .object({ plan: z.enum(PLAN_IDS as [string, ...string[]]), method: z.enum(PAY_METHODS) })
  .meta({ id: 'CheckoutBody' });

/** Where to pay: Stripe's page, or null for the local stand-in (pay with the checkout id) */
export const CheckoutStartSchema = z.object({ checkoutId: z.string(), url: z.string().nullable() }).meta({ id: 'CheckoutStart' });
export type CheckoutStart = z.infer<typeof CheckoutStartSchema>;

/** Gift Plus: a friend (by @handle), how long, an optional note, and how you pay */
export const GiftBodySchema = z
  .object({
    handle: z.string().max(40),
    months: z
      .number()
      .int()
      .refine((m) => GIFT_MONTHS.includes(m as never), 'Pick 1, 3 or 12 months'),
    note: z.string().trim().max(GIFT_NOTE_MAX).optional(),
    method: z.enum(PAY_METHODS),
  })
  .meta({ id: 'GiftBody' });
export type GiftBody = z.infer<typeof GiftBodySchema>;
