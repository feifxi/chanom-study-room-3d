'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GIFTS, GRACE_DAYS, PLUS_PLANS, REMIND_DAYS, type PayMethod, type PlanId } from '@connecta/shared';
import { useMe } from '@/features/account/useMe';
import { api } from '@/lib/api/client';

/**
 * Your Connecta Plus (docs/features/15-plus.md). Signed in, it's the API's (`/api/billing`: your plan, its date,
 * renewal, receipts and gifts you sent; paying goes through /checkout, Stripe or its local
 * stand-in), and grace is the 7 days after your Plus date. Signed out, it's Free.
 *
 * States (Test tools can switch them in development):
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
  /** Real Stripe: a card plan can be changed on Stripe's billing page */
  stripe: boolean;
}

/** Signed out, or before the API answers */
const FREE: Billing = {
  state: 'free',
  plan: 'monthly',
  method: 'card',
  date: '',
  graceLeft: 0,
  receipts: [],
  giftsSent: [],
  stripe: false,
};

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const BILLING_KEY = ['billing'] as const;
const DAY_MS = 86_400_000;

export function usePlus(): Billing {
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
  if (!signedUp) return FREE;
  const plus = real?.plus ?? me.plus;
  // Your rooms keep Plus space for 7 days after the date
  const graceEnds = me.plusUntil ? Date.parse(me.plusUntil) + GRACE_DAYS * DAY_MS : 0;
  return {
    state: plus ? (real && !real.renews ? 'cancelled' : 'active') : graceEnds > now ? 'grace' : 'free',
    graceLeft: Math.max(1, Math.ceil((graceEnds - now) / DAY_MS)),
    plan: (real?.plan as PlanId | null) ?? 'monthly',
    method: real?.method ?? 'card',
    date: me.plusUntil ? formatDay(me.plusUntil) : '',
    receipts: (real?.receipts ?? []).map((r) => ({ ...r, at: formatDay(r.at) })),
    giftsSent: (real?.giftsSent ?? []).map((g) => ({ to: g.to.name, months: g.months, at: formatDay(g.at) })),
    stripe: real?.stripe ?? false,
  };
}

/** Cancel: Plus stays until the paid period ends (your tabs refresh on the live `plus` event) */
export async function cancelPlus() {
  const { error } = await api.POST('/api/billing/cancel');
  if (error) toast.error((error as { message?: string }).message ?? 'Couldn’t cancel. Try again?');
  return !error;
}
/**
 * Stripe's billing page, to change the card: in a new tab, so a Settings dialog over a 3D room never
 * leaves the room. The tab opens on the click (before the API answers) so popup blockers allow it.
 */
export async function manageBilling() {
  const tab = window.open('', '_blank');
  const { data, error } = await api.POST('/api/billing/manage');
  if (!data) {
    tab?.close();
    toast.error((error as { message?: string } | undefined)?.message ?? 'Couldn’t open the billing page. Try again?');
    return;
  }
  if (tab) {
    tab.opener = null;
    tab.location.href = data.url;
  } else window.location.assign(data.url);
}

export async function resumePlus() {
  const { error } = await api.POST('/api/billing/resume');
  if (error) toast.error((error as { message?: string }).message ?? 'Couldn’t turn renewal on. Try again?');
  return !error;
}

/** Test tools: jump between the states (the API's dev-only switch; it runs the reminders and grace at once) */
export function setPlusState(s: PlusState) {
  void api.POST('/api/plus/dev', { body: { state: s === 'active' ? 'plus' : s } });
}

/** Whether you have Plus perks right now (cancelled still does until the date). */
export const hasPlus = (b: Billing) => b.state === 'active' || b.state === 'cancelled';
