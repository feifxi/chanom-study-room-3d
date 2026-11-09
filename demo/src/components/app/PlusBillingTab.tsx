'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, Gift, QrCode, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cancelPlus, OFFERS, resumePlus, usePlus } from '@/lib/plus';

/**
 * Settings → Plus & billing (feature 15): your plan and its date, how you pay, cancel or turn renewal
 * back on, receipts and the gifts you've sent. No refund button: mistakes go to the team by replying
 * to the receipt email (they refund from the admin site).
 */
export function PlusBillingTab() {
  const plus = usePlus();
  const [confirm, setConfirm] = useState(false);
  const offer = OFFERS[plus.offer];
  const card = offer.method === 'card';

  const headline = {
    active: card
      ? `Renews on ${plus.date} · ฿${offer.price} ${offer.months === 12 ? 'a year' : 'a month'}`
      : `Until ${plus.date} · PromptPay pack`,
    cancelled: `Ends on ${plus.date}. It won’t renew.`,
    grace: `Ended. Your rooms keep Plus space and maps for ${plus.graceLeft} more days.`,
    free: 'You’re on Free.',
  }[plus.state];

  return (
    <div className="flex flex-col gap-5">
      <div
        className={cn(
          'rounded-3xl p-5',
          plus.state === 'active' || plus.state === 'cancelled' ? 'bg-gradient-to-br from-secondary via-peach to-lavender' : 'bg-muted',
        )}
      >
        <p className="text-sm font-bold text-muted-foreground">Your plan</p>
        <p className="text-2xl font-black">
          {plus.state === 'free' || plus.state === 'grace' ? 'Free' : `Connecta Plus ✨ · ${offer.label}`}
        </p>
        <p className="mt-1 text-sm">{headline}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {plus.state === 'active' && card && !confirm && (
            <Button variant="outline" size="sm" className="rounded-full bg-card/70 font-bold" onClick={() => setConfirm(true)}>
              Cancel Plus
            </Button>
          )}
          {plus.state === 'cancelled' && (
            <Button
              size="sm"
              className="rounded-full font-bold"
              onClick={() => {
                resumePlus();
                toast.success('Plus will renew again ✨');
              }}
            >
              Turn renewal back on
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="rounded-full bg-card/70 font-bold">
            <Link href="/home/plus">{plus.state === 'free' || plus.state === 'grace' ? 'Get Plus' : 'Change plan'}</Link>
          </Button>
        </div>
        {confirm && (
          <div className="mt-3 rounded-2xl bg-card p-3 text-sm">
            <p className="font-black">Cancel Plus?</p>
            <p className="text-muted-foreground">
              You keep Plus until {plus.date}. After that your rooms keep their space for 7 more days, then go back to 25 at once and Big or
              premium maps switch to their basic version. Nothing is deleted.
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="rounded-full font-bold"
                onClick={() => {
                  cancelPlus();
                  setConfirm(false);
                  toast(`Plus won’t renew. It stays on until ${plus.date}.`);
                }}
              >
                Cancel Plus
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full font-bold" onClick={() => setConfirm(false)}>
                Keep it
              </Button>
            </div>
          </div>
        )}
      </div>

      {plus.state !== 'free' && (
        <section className="flex items-center gap-3 rounded-2xl border p-3">
          {card ? <CreditCard className="size-5 text-primary" /> : <QrCode className="size-5 text-primary" />}
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-bold">{card ? 'Visa ···· 4242' : 'PromptPay'}</span>
            <span className="text-xs text-muted-foreground">
              {card ? 'Change it on the payment page (Stripe)' : 'Packs don’t renew: buy another when it ends'}
            </span>
          </span>
          {card && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full font-bold"
              onClick={() => toast('Demo: opens Stripe’s billing page to change the card')}
            >
              Change
            </Button>
          )}
        </section>
      )}

      <section className="flex flex-col gap-1.5">
        <p className="flex items-center gap-1.5 text-sm font-extrabold">
          <Receipt className="size-4" /> Receipts
        </p>
        {plus.receipts.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
        {plus.receipts.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
            <span className="w-24 flex-none text-xs text-muted-foreground">{r.at}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">{r.what}</span>
            <span className="font-mono text-xs">฿{r.amount}</span>
            <button onClick={() => toast('Demo: downloads the receipt PDF')} className="text-xs font-bold text-primary hover:underline">
              PDF
            </button>
          </div>
        ))}
      </section>

      {plus.giftsSent.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <p className="flex items-center gap-1.5 text-sm font-extrabold">
            <Gift className="size-4" /> Gifts you sent
          </p>
          {plus.giftsSent.map((g, i) => (
            <p key={i} className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
              {g.months} month{g.months > 1 && 's'} for <b>{g.to}</b> · {g.at}
            </p>
          ))}
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Charged by mistake? Reply to the receipt email and the team will sort it out. Rooms you own follow your plan.
      </p>
    </div>
  );
}
