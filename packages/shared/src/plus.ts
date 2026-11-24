/**
 * Connecta Plus's prices (docs/features/15-plus.md): ฿89 a month or ฿890 a year, card or PromptPay. A card renews by
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

/** Gift Plus: one-off, any method; the months add on top of any Plus the friend has */
export const GIFTS = [
  { months: 1, price: 89 },
  { months: 3, price: 249 },
  { months: 12, price: 890 },
] as const;
export const GIFT_MONTHS = GIFTS.map((g) => g.months);
export const GIFT_NOTE_MAX = 120;
export const giftPrice = (months: number) => GIFTS.find((g) => g.months === months)?.price;
