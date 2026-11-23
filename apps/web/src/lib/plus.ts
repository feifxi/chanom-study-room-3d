'use client';

import { useSyncExternalStore } from 'react';
import { useMe } from '@/features/account/useMe';
import { api } from '@/lib/api/client';

/**
 * Your Connecta Plus (feature 15). Whether you have it is real (the API's `plus` on your account);
 * paying, cancelling, receipts and grace are still the demo's until Plus parts 2–4 (Stripe). Until
 * then the fake checkout page and the Demo tab turn Plus on and off with the API's dev-only switch.
 *
 * States, switchable from the Demo tab:
 * - `active`: Plus, renewing by card, or by a PromptPay reminder
 * - `cancelled`: still Plus until the end of the paid period, then grace
 * - `grace`: Plus ended; your rooms keep Plus space and maps for 7 days, then go back to Free
 * - `free`: never had it, or grace is over
 */
export type PlusState = 'active' | 'cancelled' | 'grace' | 'free';

/**
 * Two plans, any way to pay (decided 2026-11-10). A card renews by itself; PromptPay can't be charged
 * without you, so it renews by reminder: a QR in your Inbox and email a few days before the date, and
 * if you don't pay, Plus ends and the grace starts, same as a failed card.
 */
export const PLUS_PLANS = {
  monthly: { label: 'Monthly', price: 89, months: 1, per: 'a month' },
  yearly: { label: 'Yearly', price: 890, months: 12, per: 'a year' },
} as const;
export type PlanId = keyof typeof PLUS_PLANS;
export type PayMethod = 'card' | 'promptpay';
/** Days before the date that a PromptPay renewal reminder goes out. */
export const REMIND_DAYS = 3;

/** Gifts are one-off, so any method works. */
export const GIFTS = [
  { months: 1, price: 89 },
  { months: 3, price: 249 },
  { months: 12, price: 890 },
] as const;

export interface Receipt {
  id: string;
  at: string;
  what: string;
  amount: number;
  method: PayMethod;
}

export interface Billing {
  state: PlusState;
  plan: PlanId;
  method: PayMethod;
  /** "Renews 7 Dec 2026", "Ends 13 Nov 2026"… */
  date: string;
  /** Days of grace left (state `grace`). */
  graceLeft: number;
  receipts: Receipt[];
  giftsSent: { to: string; months: number; at: string }[];
}

const EVENT = 'connecta-demo:plus';
let state: Billing = {
  state: 'active',
  plan: 'monthly',
  method: 'card',
  date: '7 Dec 2026',
  graceLeft: 7,
  receipts: [
    { id: 'r2', at: '7 Nov 2026', what: 'Plus · Monthly', amount: 89, method: 'card' },
    { id: 'r1', at: '7 Oct 2026', what: 'Plus · Monthly', amount: 89, method: 'card' },
  ],
  giftsSent: [],
};

function set(patch: Partial<Billing>) {
  state = { ...state, ...patch };
  window.dispatchEvent(new Event(EVENT));
}

function subscribeStore(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function usePlus(): Billing {
  const billing = useSyncExternalStore(
    subscribeStore,
    () => state,
    () => state,
  );
  const { data: me } = useMe();
  // Signed in: Plus on or off is the account's; the billing details are still the demo's
  if (!me?.signedUp) return billing;
  return {
    ...billing,
    state: me.plus ? (billing.state === 'cancelled' ? 'cancelled' : 'active') : billing.state === 'grace' ? 'grace' : 'free',
    date: me.plusUntil ? formatDay(me.plusUntil) : billing.date,
  };
}

/** Until Stripe (Plus part 2): Plus on or off for a month through the API's dev-only switch */
function devPlus(on: boolean) {
  void api.POST('/api/plus/dev', { body: { on } });
}

const today = '10 Nov 2026';

/** After checkout succeeds (the webhook, in the real app). */
export function subscribe(plan: PlanId, method: PayMethod) {
  devPlus(true);
  const o = PLUS_PLANS[plan];
  set({
    state: 'active',
    plan,
    method,
    date: o.months === 12 ? '10 Nov 2027' : '10 Dec 2026',
    receipts: [{ id: `r${Date.now()}`, at: today, what: `Plus · ${o.label}`, amount: o.price, method }, ...state.receipts],
  });
}

export function sendGift(to: string, months: number, price: number, method: 'card' | 'promptpay') {
  set({
    giftsSent: [{ to, months, at: today }, ...state.giftsSent],
    receipts: [
      { id: `r${Date.now()}`, at: today, what: `Gift for ${to} · ${months} month${months > 1 ? 's' : ''}`, amount: price, method },
      ...state.receipts,
    ],
  });
}

/** Cancel: Plus stays until the paid period ends. */
export const cancelPlus = () => set({ state: 'cancelled' });
export const resumePlus = () => set({ state: 'active' });

/** Demo tab: jump between the states. */
export function setPlusState(s: PlusState) {
  devPlus(s === 'active' || s === 'cancelled');
  set({ state: s, graceLeft: 5, date: s === 'cancelled' ? '13 Nov 2026' : state.date });
}

/** Whether you have Plus perks right now (cancelled still does until the date). */
export const hasPlus = (b: Billing) => b.state === 'active' || b.state === 'cancelled';
