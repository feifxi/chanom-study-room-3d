'use client';

import { useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GIFTS, GRACE_DAYS, PLUS_PLANS, REMIND_DAYS, type PayMethod, type PlanId } from '@connecta/shared';
import { useMe } from '@/features/account/useMe';
import { api } from '@/lib/api/client';

/**
 * Your Connecta Plus (feature 15). Signed in, it's the API's (`/api/billing`: your plan, its date,
 * renewal, receipts and gifts you sent; paying goes through /checkout, Stripe or its local
 * stand-in), and grace is the 7 days after your Plus date. Signed out (the demo's pages), it's the
 * mock below.
 *
 * States, switchable from the Demo tab:
 * - `active`: Plus, renewing by card, or by a PromptPay reminder
 * - `cancelled`: still Plus until the end of the paid period, then grace
 * - `grace`: Plus ended; your rooms keep Plus space and maps for 7 days, then go back to Free
 * - `free`: never had it, or grace is over
 */
export type PlusState = 'active' | 'cancelled' | 'grace' | 'free';

// The prices live in @connecta/shared (the API charges them)
export { GIFTS, PLUS_PLANS, REMIND_DAYS, type PayMethod, type PlanId };

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

export const BILLING_KEY = ['billing'] as const;
const DAY_MS = 86_400_000;

export function usePlus(): Billing {
  const mock = useSyncExternalStore(
    subscribeStore,
    () => state,
    () => state,
  );
  const { data: me } = useMe();
  // The grace counts days, so the time the page opened is close enough
  const [now] = useState(Date.now);
  const signedUp = !!me?.signedUp;
  const { data: real } = useQuery({
    queryKey: BILLING_KEY,
    queryFn: async () => {
      const { data, response } = await api.GET('/api/billing');
      if (!data) throw new Error(`${response.status}`);
      return data;
    },
    enabled: signedUp,
  });
  if (!signedUp) return mock;
  const plus = real?.plus ?? me.plus;
  // Your rooms keep Plus space for 7 days after the date
  const graceEnds = me.plusUntil ? Date.parse(me.plusUntil) + GRACE_DAYS * DAY_MS : 0;
  return {
    ...mock,
    state: plus ? (real && !real.renews ? 'cancelled' : 'active') : graceEnds > now ? 'grace' : 'free',
    graceLeft: Math.max(1, Math.ceil((graceEnds - now) / DAY_MS)),
    plan: (real?.plan as PlanId | null) ?? 'monthly',
    method: real?.method ?? 'card',
    date: me.plusUntil ? formatDay(me.plusUntil) : mock.date,
    receipts: (real?.receipts ?? []).map((r) => ({ ...r, at: formatDay(r.at) })),
    giftsSent: (real?.giftsSent ?? []).map((g) => ({ to: g.to.name, months: g.months, at: formatDay(g.at) })),
  };
}

/** The Demo tab's switch: the API's dev-only Plus states (it runs the reminders and grace at once) */
function devPlus(state: 'plus' | 'cancelled' | 'grace' | 'free') {
  void api.POST('/api/plus/dev', { body: { state } });
}

/** Cancel: Plus stays until the paid period ends (your tabs refresh on the live `plus` event) */
export async function cancelPlus() {
  const { error } = await api.POST('/api/billing/cancel');
  if (error) toast.error((error as { message?: string }).message ?? 'Couldn’t cancel. Try again?');
  return !error;
}
export async function resumePlus() {
  const { error } = await api.POST('/api/billing/resume');
  if (error) toast.error((error as { message?: string }).message ?? 'Couldn’t turn renewal on. Try again?');
  return !error;
}

/** Demo tab: jump between the states. */
export function setPlusState(s: PlusState) {
  devPlus(s === 'active' ? 'plus' : s);
  set({ state: s, graceLeft: 5, date: s === 'cancelled' ? '13 Nov 2026' : state.date });
}

/** Whether you have Plus perks right now (cancelled still does until the date). */
export const hasPlus = (b: Billing) => b.state === 'active' || b.state === 'cancelled';
