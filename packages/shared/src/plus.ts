/**
 * Connecta Plus's prices (spec 15): ฿89 a month or ฿890 a year, card or PromptPay. A card renews by
 * itself; PromptPay can't be charged without you, so it renews by a reminder (Plus part 4).
 */
export const PLUS_PLANS = {
  monthly: { label: 'Monthly', price: 89, months: 1, per: 'a month' },
  yearly: { label: 'Yearly', price: 890, months: 12, per: 'a year' },
} as const;
export type PlanId = keyof typeof PLUS_PLANS;
export const PLAN_IDS = Object.keys(PLUS_PLANS) as PlanId[];
export const PAY_METHODS = ['card', 'promptpay'] as const;
export type PayMethod = (typeof PAY_METHODS)[number];
/** Days before the date that a PromptPay renewal reminder goes out */
export const REMIND_DAYS = 3;
/** Days your rooms keep Plus space and maps after Plus ends */
export const GRACE_DAYS = 7;
