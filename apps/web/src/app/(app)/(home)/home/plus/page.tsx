'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Check, ChevronDown, CreditCard, Crown, Gift, Minus, QrCode, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GiftPlusDialog } from '@/components/app/GiftPlusDialog';
import { SettingsDialog } from '@/components/app/SettingsDialog';
import { PLANS } from '@/features/place/model';
import { FUTURE_MAPS, ME } from '@/lib/mock';
import { useMyLook } from '@/lib/myLook';
import { hasPlus, PLUS_PLANS, REMIND_DAYS, usePlus, type PlanId } from '@/lib/plus';
import { cn } from '@/lib/utils';

const AvatarPreview = dynamic(() => import('@/features/avatar/AvatarPreview').then((m) => m.AvatarPreview), { ssr: false });

/** One row per benefit: what Free gets, what Plus gets. */
const ROWS: { group: string; rows: [string, string | boolean, string | boolean][] }[] = [
  {
    group: 'Rooms you own',
    rows: [
      ['People at once', `${PLANS.free.capacity}`, `${PLANS.plus.capacity} (Big maps)`],
      ['Members', `${PLANS.free.members}`, PLANS.plus.members.toLocaleString()],
      ['Basic maps (Library, Café, Rooftop)', true, true],
      ['Premium maps', false, true],
      ['Screen share', '720p', '1080p'],
      ['Rooms you can make / join', '10 / 100', '30 / 200'],
    ],
  },
  {
    group: 'You',
    rows: [
      ['Base outfits and accessories', true, true],
      ['Premium skins and pets', false, true],
      ['Animated name tag and profile banner', false, true],
      ['Uploads', '10 MB', '50 MB'],
    ],
  },
  {
    group: 'Study',
    rows: [
      ['Pomodoro, to-do and lo-fi music', true, true],
      ['AI question decks (Pick a Side)', '3 a day', '30 a day'],
    ],
  },
];

const FAQ: [string, string][] = [
  [
    'Do my friends need Plus too?',
    'No. A room follows its owner’s plan: if you have Plus, everyone inside your rooms gets the space and the maps. Friends can chip in by gifting you Plus.',
  ],
  [
    'Can I pay with PromptPay?',
    `Yes, for both plans. A card renews by itself. With PromptPay we send you a new QR in your Inbox and email ${REMIND_DAYS} days before the date; if you don’t pay, Plus simply ends.`,
  ],
  [
    'What happens to my rooms if Plus ends?',
    'Nothing is deleted. Your rooms keep their space for 7 more days, then go back to 25 people at once, and a Big or premium map switches to its basic version while everyone stays inside.',
  ],
  ['Can I cancel?', 'Any time, in Settings → Plus & billing. You keep Plus until the end of what you paid for.'],
  ['Refunds?', 'If something went wrong (charged twice, a bug), reply to your receipt email and the team will sort it out.'],
];

/**
 * Connecta Plus, laid out like the subscription pages people know (Discord Nitro, Spotify, Duolingo):
 * a hero that shows you with Plus, the perks as pictures rather than a table, two plans side by side
 * with the yearly one marked as the deal, gifting, the full comparison folded away, and a short FAQ.
 * One subscription for everything (no room boosts); a room follows its owner's plan.
 */
export default function PlusPage() {
  const plus = usePlus();
  const look = useMyLook().look;
  const [gift, setGift] = useState(false);
  const [billing, setBilling] = useState(false);
  const on = hasPlus(plus);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 p-5 sm:p-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-secondary via-peach to-lavender">
        <Sparkle className="top-8 left-[46%]" />
        <Sparkle className="top-[70%] left-[8%] size-3" />
        <Sparkle className="top-12 right-8 size-5" />
        <div className="grid items-center gap-4 p-6 sm:p-10 md:grid-cols-[1fr_17rem]">
          <div className="flex flex-col items-start gap-4">
            <span className="flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-xs font-black text-primary shadow-sm">
              <Crown className="size-3.5" />
              {plus.state === 'active'
                ? `You’re on Plus · ${PLUS_PLANS[plus.plan].label}`
                : plus.state === 'cancelled'
                  ? `Plus until ${plus.date}`
                  : plus.state === 'grace'
                    ? `Plus ended · rooms keep their space ${plus.graceLeft} more days`
                    : 'Connecta Plus'}
            </span>
            <h1 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">
              Bigger rooms
              <br />
              for your people.
              <br />
              <span className="text-primary">Cuter you.</span>
            </h1>
            <p className="max-w-md text-sm sm:text-base">
              Rooms, voice and chat stay free for everyone. Plus makes the rooms you run bigger and nicer for everyone inside, and dresses
              you up.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {on ? (
                <Button size="lg" variant="secondary" className="rounded-full bg-card font-extrabold" onClick={() => setBilling(true)}>
                  Plus & billing
                </Button>
              ) : (
                <Button asChild size="lg" className="rounded-full font-extrabold">
                  <a href="#plans">
                    <Crown /> Get Plus · from ฿74 a month
                  </a>
                </Button>
              )}
              <Button size="lg" variant="ghost" className="rounded-full font-extrabold" onClick={() => setGift(true)}>
                <Gift /> Gift it
              </Button>
            </div>
          </div>
          <div className="relative mx-auto h-56 w-48 sm:h-72 sm:w-56 md:h-80 md:w-full">
            <div className="absolute inset-x-6 bottom-2 h-10 rounded-[50%] bg-card/50 blur-md" />
            <AvatarPreview look={look} />
            <span className="absolute top-6 -left-2 rounded-full bg-card px-2.5 py-1 text-xs font-black shadow-md">🐾 pets</span>
            <span className="absolute top-24 -right-1 rounded-full bg-card px-2.5 py-1 text-xs font-black shadow-md">100 people</span>
            <span className="absolute bottom-10 left-0 rounded-full bg-card px-2.5 py-1 text-xs font-black shadow-md">✨ {ME.name}</span>
          </div>
        </div>
      </section>

      {/* Perks as pictures */}
      <section className="flex flex-col gap-4">
        <SectionTitle eyebrow="What you get" title="Your whole room feels it" />
        <div className="grid auto-rows-[minmax(10rem,auto)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Perk
            className="bg-lavender text-lavender-ink lg:col-span-2 lg:row-span-2"
            title="Rooms for 100"
            text="Your rooms fit 100 at once on Big maps, and 1,000 members. Everyone inside gets it, only you pay."
          >
            <div className="mt-auto flex flex-col gap-3">
              <Dots n={25} label="Free" />
              <Dots n={100} label="Plus" strong />
            </div>
          </Perk>
          <Perk
            className="bg-peach text-peach-ink lg:col-span-2"
            title="Premium maps"
            text="New places for your room as they arrive, Big versions of every map."
          >
            <div className="mt-auto flex gap-2">
              {FUTURE_MAPS.slice(0, 4).map((m) => (
                <span key={m.name} title={m.name} className="grid size-12 place-items-center rounded-2xl bg-card/70 text-2xl shadow-sm">
                  {m.emoji}
                </span>
              ))}
            </div>
          </Perk>
          <Perk className="bg-mint text-mint-ink" title="Skins & pets" text="Premium outfits and a pet that follows you around.">
            <span className="mt-auto text-4xl">🐱🧥🎀</span>
          </Perk>
          <Perk className="bg-sky text-sky-ink" title="1080p sharing" text="Sharp slides and code when you share your screen.">
            <span className="mt-auto font-mono text-2xl font-black whitespace-nowrap">720p → 1080p</span>
          </Perk>
          <Perk className="bg-card" title="Animated name tag" text="A shimmering name above your head and a banner on your profile.">
            <span className="mt-auto w-fit rounded-full bg-foreground px-3 py-1 text-sm font-black">
              ✨ <span className="shimmer">{ME.name}</span>
            </span>
          </Perk>
          <Perk className="bg-card" title="30 AI decks a day" text="Turn your notes into Pick a Side questions for the whole room.">
            <span className="mt-auto text-3xl">🧠 × 30</span>
          </Perk>
          <Perk className="bg-card lg:col-span-2" title="Bigger uploads" text="Pictures and files up to 50 MB in chats.">
            <span className="mt-auto text-3xl">📎 50 MB</span>
          </Perk>
        </div>
      </section>

      {/* Plans */}
      <Plans current={on ? plus.plan : undefined} />

      {/* Gift */}
      <section className="flex flex-wrap items-center gap-4 rounded-[2rem] border bg-card p-5 sm:p-6">
        <span className="grid size-14 flex-none place-items-center rounded-2xl bg-secondary text-3xl">🎁</span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black">Gift Plus to whoever runs your room</p>
          <p className="text-sm text-muted-foreground">1, 3 or 12 months, with a note. It adds on top of any Plus they already have.</p>
        </div>
        <Button className="rounded-full font-extrabold" onClick={() => setGift(true)}>
          <Gift /> Gift Plus
        </Button>
      </section>

      <Compare />

      {/* FAQ */}
      <section className="flex flex-col gap-3">
        <SectionTitle eyebrow="Questions" title="Good to know" />
        <div className="flex flex-col divide-y rounded-[2rem] border bg-card">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-extrabold">
                {q}
                <ChevronDown className="size-4 flex-none transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="flex flex-wrap justify-center gap-x-5 gap-y-1 pb-4 text-xs font-bold text-muted-foreground">
        <span>✓ Never pay to win</span>
        <span>✓ No ads in rooms</span>
        <span>✓ Joining a room is always free</span>
        <span>✓ Cancel any time</span>
      </p>

      <GiftPlusDialog open={gift} onOpenChange={setGift} />
      <SettingsDialog open={billing} onOpenChange={setBilling} initialTab="plus" />
    </div>
  );
}

/** Two plans side by side; yearly is the deal. How you pay (card or PromptPay) is picked on the payment page. */
function Plans({ current }: { current?: PlanId }) {
  const cards: { id: PlanId; sub: string; tag?: string }[] = [
    { id: 'monthly', sub: 'Billed every month' },
    { id: 'yearly', sub: '≈ ฿74 a month, billed once a year', tag: '2 months free' },
  ];
  return (
    <section id="plans" className="flex scroll-mt-6 flex-col gap-4">
      <SectionTitle eyebrow="Plans" title={current ? 'Your plan' : 'Pick your plan'} />
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map(({ id, sub, tag }) => {
          const p = PLUS_PLANS[id];
          const best = id === 'yearly';
          const mine = current === id;
          return (
            <div
              key={id}
              className={cn(
                'relative flex flex-col gap-4 rounded-[2rem] border-2 bg-card p-6',
                best ? 'border-primary shadow-lg shadow-primary/10' : 'border-border',
              )}
            >
              {tag && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">
                  {tag}
                </span>
              )}
              <div>
                <p className="flex items-center gap-2 text-lg font-black">
                  {p.label}
                  {mine && <span className="rounded-full bg-secondary px-2 text-[11px] text-secondary-foreground">your plan</span>}
                </p>
                <p className="text-4xl font-black tracking-tight">
                  ฿{p.price}
                  <span className="text-base font-bold text-muted-foreground"> {p.per}</span>
                </p>
                <p className="text-sm text-muted-foreground">{sub}</p>
              </div>
              <ul className="flex flex-col gap-1.5 text-sm">
                {[
                  'Everything in Plus',
                  'Your rooms grow for everyone inside',
                  best ? 'Pay once, done for the year' : 'Cancel any time',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="size-4 flex-none text-primary" /> {t}
                  </li>
                ))}
              </ul>
              {mine ? (
                <Button disabled variant="secondary" size="lg" className="mt-auto rounded-full font-extrabold">
                  Current plan
                </Button>
              ) : (
                <Button asChild size="lg" variant={best ? 'default' : 'secondary'} className="mt-auto rounded-full font-extrabold">
                  <Link href={`/checkout?plan=${id}`}>{current ? `Switch to ${p.label}` : `Get ${p.label}`}</Link>
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CreditCard className="size-3.5" /> Card: renews by itself
        </span>
        <span className="flex items-center gap-1">
          <QrCode className="size-3.5" /> PromptPay: we send a QR before each renewal
        </span>
      </p>
    </section>
  );
}

function Compare() {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-3">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="mx-auto flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm font-extrabold hover:bg-muted"
      >
        Compare Free and Plus <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="overflow-hidden rounded-[2rem] border bg-card">
          <div className="grid grid-cols-[1fr_5.5rem_7rem] items-end gap-2 bg-muted/60 p-4 sm:grid-cols-[1fr_8rem_9rem]">
            <span />
            <span className="text-center font-black">Free</span>
            <span className="text-center font-black text-primary">Plus</span>
          </div>
          {ROWS.map((g) => (
            <div key={g.group}>
              <p className="bg-muted/30 px-4 py-1.5 text-[11px] font-black tracking-wider text-muted-foreground uppercase">{g.group}</p>
              {g.rows.map(([label, free, plus]) => (
                <div
                  key={label}
                  className="grid grid-cols-[1fr_5.5rem_7rem] items-center gap-2 border-t px-4 py-2.5 text-center text-sm sm:grid-cols-[1fr_8rem_9rem]"
                >
                  <span className="text-left font-semibold">{label}</span>
                  <Cell v={free} />
                  <Cell v={plus} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto size-5 text-primary" aria-label="Yes" />;
  if (v === false) return <Minus className="mx-auto size-4 text-muted-foreground" aria-label="No" />;
  return <span className="font-bold">{v}</span>;
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center">
      <p className="text-xs font-black tracking-wider text-primary uppercase">{eyebrow}</p>
      <h2 className="text-3xl font-black tracking-[-0.02em]">{title}</h2>
    </div>
  );
}

function Perk({ title, text, className, children }: { title: string; text: string; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-[2rem] border border-transparent p-5',
        className,
        className?.includes('bg-card') && 'border-border',
      )}
    >
      <p className="text-lg font-black">{title}</p>
      <p className="text-sm opacity-80">{text}</p>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

/** "25 vs 100" drawn as dots, so the size difference is felt rather than read. */
function Dots({ n, label, strong }: { n: number; label: string; strong?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-10 flex-none pt-0.5 text-xs font-black">{label}</span>
      <span className="flex flex-wrap gap-1 lg:gap-1.5">
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className={cn('size-2.5 rounded-full lg:size-3.5', strong ? 'bg-lavender-ink' : 'bg-lavender-ink/35')} />
        ))}
      </span>
    </div>
  );
}

function Sparkle({ className }: { className?: string }) {
  return <Sparkles className={cn('pointer-events-none absolute size-4 animate-pulse text-card', className)} aria-hidden />;
}
