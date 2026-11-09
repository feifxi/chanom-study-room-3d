'use client';

import { useSyncExternalStore } from 'react';

/**
 * Your Connecta Plus in the demo (feature 15). Stripe is mocked: the real app sends you to Stripe's
 * hosted Checkout and learns the result from a webhook; here the fake checkout page calls `subscribe`.
 *
 * States, switchable from the Demo tab:
 * - `active`: Plus, renewing (card) or running to the end of a PromptPay pack
 * - `cancelled`: still Plus until the end of the paid period, then grace
 * - `grace`: Plus ended; your rooms keep Plus space and maps for 7 days, then go back to Free
 * - `free`: never had it, or grace is over
 */
export type PlusState = 'active' | 'cancelled' | 'grace' | 'free';

/** What you can buy. Cards renew; PromptPay can't, so it buys fixed packs (decided 2026-11-10). */
export const OFFERS = {
  monthly: { label: 'Monthly', price: 89, months: 1, method: 'card', note: '฿89 a month, renews by itself' },
  yearly: { label: 'Yearly', price: 890, months: 12, method: 'card', note: '฿890 a year: two months free' },
  pack3: { label: '3 months', price: 249, months: 3, method: 'promptpay', note: 'Pay once with PromptPay, no renewal' },
  pack12: { label: '12 months', price: 890, months: 12, method: 'promptpay', note: 'Pay once with PromptPay, no renewal' },
} as const;
export type OfferId = keyof typeof OFFERS;

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
  method: 'card' | 'promptpay';
}

export interface Billing {
  state: PlusState;
  offer: OfferId;
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
  offer: 'monthly',
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

export const usePlus = () =>
  useSyncExternalStore(
    subscribeStore,
    () => state,
    () => state,
  );

const today = '10 Nov 2026';

/** After checkout succeeds (the webhook, in the real app). */
export function subscribe(offer: OfferId) {
  const o = OFFERS[offer];
  set({
    state: 'active',
    offer,
    date: o.months === 12 ? '10 Nov 2027' : o.months === 3 ? '10 Feb 2027' : '10 Dec 2026',
    receipts: [{ id: `r${Date.now()}`, at: today, what: `Plus · ${o.label}`, amount: o.price, method: o.method }, ...state.receipts],
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
  set({ state: s, graceLeft: 5, date: s === 'cancelled' ? '13 Nov 2026' : state.date });
}

/** Whether you have Plus perks right now (cancelled still does until the date). */
export const hasPlus = (b: Billing) => b.state === 'active' || b.state === 'cancelled';
