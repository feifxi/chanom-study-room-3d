import { Check, Crown, Rocket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '฿0',
    note: 'forever',
    tint: 'bg-muted',
    icon: Sparkles,
    perks: [
      'Make up to 10 servers, join up to 100',
      'Rooms, proximity voice, chats and DMs',
      'Base outfits and accessories',
      'Pomodoro, to-do and lo-fi music',
      'Image uploads up to 10 MB',
    ],
  },
  {
    id: 'plus',
    name: 'Connecta Plus',
    price: '฿99',
    note: 'per month',
    tint: 'bg-gradient-to-br from-secondary via-peach to-lavender',
    icon: Crown,
    current: true,
    perks: [
      'Plus-only outfits and a pet that follows you',
      '300 coins every month',
      'Animated name tag and profile banner',
      'Join up to 200 servers',
      'Uploads up to 50 MB',
      '1 server boost included',
    ],
  },
];

const BOOSTS = [
  { level: 'Level 1', boosts: 2, perks: ['5 rooms', '25 people per room', 'Premium room templates', 'Custom invite link'] },
  { level: 'Level 2', boosts: 7, perks: ['10 rooms', '40 people per room', 'Auto-open overflow rooms', 'HD screen share on the TV'] },
  {
    level: 'Level 3',
    boosts: 14,
    perks: ['20 rooms', '60 people per room', 'Server banner and animated icon', 'Bigger uploads for everyone'],
  },
];

/** Plus (for you) and Boosts (for a server), side by side so the difference is obvious. */
export default function PlusPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 p-5 sm:p-8">
      <header className="text-center">
        <p className="text-sm font-bold text-primary">You’re on Plus ✨</p>
        <h1 className="mt-1 text-4xl font-black tracking-[-0.03em]">Cuter for you. Bigger for your server.</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Plus is for you: looks, a pet, coins. Boosts are for a server: more rooms and more seats. Nothing here makes anyone stronger.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PLANS.map((p) => (
          <div key={p.id} className={cn('relative rounded-[2rem] p-6', p.tint, p.current && 'ring-[3px] ring-primary')}>
            {p.current && (
              <span className="absolute top-5 right-5 rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">
                Your plan
              </span>
            )}
            <p.icon className="size-7 text-primary" />
            <p className="mt-3 text-xl font-black">{p.name}</p>
            <p className="mt-1">
              <span className="text-4xl font-black">{p.price}</span> <span className="text-sm text-muted-foreground">{p.note}</span>
            </p>
            <ul className="mt-5 flex flex-col gap-2">
              {p.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm font-semibold">
                  <Check className="mt-0.5 size-4 flex-none text-primary" /> {perk}
                </li>
              ))}
            </ul>
            <Button className="mt-6 h-11 w-full rounded-2xl font-extrabold" variant={p.current ? 'outline' : 'default'}>
              {p.current ? 'Manage plan' : 'Stay on Free'}
            </Button>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end gap-3">
          <Rocket className="size-7 text-primary" />
          <div>
            <h2 className="text-2xl font-black">Server boosts</h2>
            <p className="text-sm text-muted-foreground">฿49 per boost per month. Members boost together; the whole server levels up.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {BOOSTS.map((b, i) => (
            <div key={b.level} className="rounded-3xl border p-5">
              <div className="flex items-center justify-between">
                <p className="font-black">{b.level}</p>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
                  {b.boosts} boosts
                </span>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {b.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 flex-none text-primary" /> {perk}
                  </li>
                ))}
              </ul>
              {i === 0 && (
                <p className="mt-3 rounded-xl bg-mint px-3 py-1.5 text-xs font-bold text-mint-ink">Chanom Friends is Level 1 · 2 boosts</p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Free servers: 3 rooms, 15 people per room.</p>
      </section>
    </div>
  );
}
