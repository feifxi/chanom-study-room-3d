import { PAY_METHODS, PLAN_IDS } from '@connecta/shared';
import { z } from 'zod';

export const ReceiptSchema = z.object({
  id: z.string(),
  at: z.string(),
  what: z.string(),
  /** Baht */
  amount: z.number().int(),
  method: z.enum(PAY_METHODS),
});

/** Settings → Plus & billing (spec 15) */
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
