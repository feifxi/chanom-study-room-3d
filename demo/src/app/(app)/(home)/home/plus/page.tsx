import { Check, Crown, Rocket, Sparkles } from 'lucide-react';
import { BOOST_LEVELS } from '@/features/place/model';
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
      'Make up to 10 rooms, join up to 100',
      'Rooms for 25 at once, proximity voice, room chat and DMs',
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
      'Make up to 30 rooms, join up to 200',
      'Uploads up to 50 MB',
      '2 boosts to put on any room (one friend with Plus = Level 1)',
    ],
  },
];

/** Plus (for you) and boosts (for a room), side by side so the difference is obvious. */
export default function PlusPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 p-5 sm:p-8">
      <header className="text-center">
        <p className="text-sm font-bold text-primary">You’re on Plus ✨</p>
        <h1 className="mt-1 text-4xl font-black tracking-[-0.03em]">Cuter for you. Bigger for your room.</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Plus is for you: looks, a pet, coins. Boosts are for a room: more people at once and nicer extras. Nothing here makes anyone
          stronger, and joining a room is always free.
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
            <h2 className="text-2xl font-black">Room boosts</h2>
            <p className="text-sm text-muted-foreground">
              ฿49 per boost per month. Anyone in a room can boost it; friends chip in together and the whole room levels up.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {BOOST_LEVELS.map((b, i) => (
            <div key={b.level} className="rounded-3xl border p-5">
              <div className="flex items-center justify-between">
                <p className="font-black">{b.level ? `Level ${b.level}` : 'Free'}</p>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
                  {b.boosts ? `${b.boosts} boosts` : 'no boosts'}
                </span>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {[`${b.capacity} people at once`, `${b.members.toLocaleString()} members`, ...b.perks].map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 flex-none text-primary" /> {perk}
                  </li>
                ))}
              </ul>
              {i === 1 && (
                <p className="mt-3 rounded-xl bg-mint px-3 py-1.5 text-xs font-bold text-mint-ink">Chanom Friends is here · 2 boosts</p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          About 100 people at once is the ceiling for any room: beyond that, voice and phones struggle. Members grow with each level, so a
          room never has far more members than could ever fit inside.
        </p>
      </section>
    </div>
  );
}
