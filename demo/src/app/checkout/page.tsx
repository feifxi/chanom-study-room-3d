'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, CreditCard, Gift, Loader2, Lock, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { userById } from '@/lib/mock';
import { GIFTS, OFFERS, sendGift, subscribe, type OfferId } from '@/lib/plus';

export default function CheckoutPage() {
  return (
    <Suspense>
      <Checkout />
    </Suspense>
  );
}

/**
 * Demo stand-in for Stripe's hosted Checkout (feature 15). The real app never shows a card form of
 * its own: "Continue to payment" opens Stripe's page, Stripe sends you back, and a webhook turns
 * Plus on. Plans renew by card only; PromptPay can't renew, so it buys packs; gifts take either.
 */
function Checkout() {
  const router = useRouter();
  const params = useSearchParams();
  const giftTo = params.get('gift');
  const offerId = (params.get('offer') ?? 'monthly') as OfferId;
  const offer = OFFERS[offerId] ?? OFFERS.monthly;
  const giftMonths = Number(params.get('months') ?? 1);
  const gift = giftTo ? (GIFTS.find((g) => g.months === giftMonths) ?? GIFTS[0]) : null;
  const friend = giftTo ? userById(giftTo) : null;
  const methods: ('card' | 'promptpay')[] = gift ? ['card', 'promptpay'] : [offer.method];
  const [method, setMethod] = useState(methods[0]!);
  const [step, setStep] = useState<'pay' | 'paying' | 'done'>('pay');
  const price = gift ? gift.price : offer.price;

  const pay = () => {
    setStep('paying');
    setTimeout(() => {
      setStep('done');
      if (gift && friend) sendGift(friend.name, gift.months, gift.price, method);
      else subscribe(offerId);
      setTimeout(() => {
        if (gift && friend) {
          toast.success(`Gift sent to ${friend.name} 🎁 They’ll find it in their DMs and Inbox.`);
          router.replace('/home/friends');
        } else {
          toast.success('Welcome to Plus ✨ Your rooms just got bigger.');
          router.replace('/home/plus');
        }
      }, 900);
    }, 1200);
  };

  return (
    <div className="min-h-dvh bg-muted/40">
      <p className="border-b border-dashed border-primary/60 bg-card px-4 py-1.5 text-center text-xs font-bold text-muted-foreground">
        Demo: in the real app this page is Stripe’s hosted payment page. Nothing is charged here.
      </p>
      <div className="mx-auto grid max-w-4xl gap-6 p-5 sm:p-10 md:grid-cols-2">
        {/* What you're buying */}
        <section className="flex flex-col gap-5">
          <Link href="/home/plus" className="flex w-fit items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to Connecta
          </Link>
          <Logo />
          {gift && friend ? (
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                <Gift className="size-4" /> Gift for {friend.name}
              </p>
              <p className="text-4xl font-black">฿{gift.price}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connecta Plus · {gift.months} month{gift.months > 1 && 's'}, paid once
              </p>
              {params.get('note') && <p className="mt-3 rounded-2xl bg-card p-3 text-sm italic">“{params.get('note')}”</p>}
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold text-muted-foreground">Connecta Plus · {offer.label}</p>
              <p className="text-4xl font-black">
                ฿{offer.price}
                <span className="text-base font-bold text-muted-foreground">
                  {offer.method === 'card' ? (offer.months === 12 ? ' a year' : ' a month') : ` for ${offer.months} months`}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {offer.method === 'card'
                  ? 'Renews by itself. Cancel any time in Settings → Plus & billing.'
                  : 'Paid once with PromptPay. It doesn’t renew: buy another pack when it ends.'}
              </p>
            </div>
          )}
        </section>

        {/* Paying */}
        <section className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm">
          {step === 'done' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-mint text-mint-ink">
                <Check className="size-7" />
              </span>
              <p className="text-lg font-black">Payment done</p>
              <p className="text-sm text-muted-foreground">Taking you back to Connecta…</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="co-email" className="text-sm font-bold">
                  Email for the receipt
                </label>
                <Input id="co-email" defaultValue="feifei@example.com" className="rounded-xl" />
              </div>

              {methods.length > 1 && (
                <div className="grid grid-cols-2 gap-2">
                  {methods.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      aria-pressed={method === m}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-2xl border-2 p-2.5 text-sm font-extrabold',
                        method === m ? 'border-primary bg-secondary/60' : 'border-transparent bg-muted/60 hover:border-border',
                      )}
                    >
                      {m === 'card' ? <CreditCard className="size-4" /> : <QrCode className="size-4" />}
                      {m === 'card' ? 'Card' : 'PromptPay'}
                    </button>
                  ))}
                </div>
              )}

              {method === 'card' ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-bold">Card</p>
                  <Input defaultValue="4242 4242 4242 4242" aria-label="Card number" className="rounded-xl font-mono" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input defaultValue="12 / 29" aria-label="Expiry" className="rounded-xl font-mono" />
                    <Input defaultValue="123" aria-label="CVC" className="rounded-xl font-mono" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted/60 p-4 text-center">
                  <FakeQr />
                  <p className="text-sm font-black">Scan with any Thai bank app · ฿{price}</p>
                  <p className="text-xs text-muted-foreground">The page moves on by itself once the bank confirms.</p>
                </div>
              )}

              <Button size="lg" className="rounded-full font-extrabold" onClick={pay} disabled={step === 'paying'}>
                {step === 'paying' ? (
                  <>
                    <Loader2 className="animate-spin" /> Paying…
                  </>
                ) : method === 'promptpay' ? (
                  'I’ve paid (demo)'
                ) : (
                  `Pay ฿${price}`
                )}
              </Button>
              <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                <Lock className="size-3" /> Card details go to Stripe, never to Connecta
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** A QR-looking pattern (not a real code): three corner squares and a fixed scatter of dots. */
function FakeQr() {
  const n = 25;
  const corner = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!corner(x, y) && (x * 7 + y * 13 + x * y) % 5 < 2) cells.push([x, y]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="white" />
      <rect x={x + 2} y={y + 2} width={3} height={3} />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${n + 2} ${n + 2}`} className="size-44 rounded-xl bg-white" aria-label="PromptPay QR (demo)">
      <g fill="#222">
        {finder(0, 0)}
        {finder(n - 7, 0)}
        {finder(0, n - 7)}
        {cells.map(([x, y]) => (
          <rect key={`${x}:${y}`} x={x} y={y} width={1} height={1} />
        ))}
      </g>
    </svg>
  );
}
