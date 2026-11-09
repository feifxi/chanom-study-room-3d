import { Check, Crown, Gift, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLANS } from '@/features/place/model';

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

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto size-5 text-primary" aria-label="Yes" />;
  if (v === false) return <Minus className="mx-auto size-4 text-muted-foreground" aria-label="No" />;
  return <span className="font-bold">{v}</span>;
}

/**
 * One subscription for everything (decided 2026-11-09): no room boosts. A room follows its owner's
 * plan, so whoever runs the room pays once and everyone inside gets the bigger room and the maps.
 */
export default function PlusPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-5 sm:p-8">
      <header className="text-center">
        <p className="text-sm font-bold text-primary">You’re on Plus ✨</p>
        <h1 className="mt-1 text-4xl font-black tracking-[-0.03em]">One plan. Cuter you, bigger rooms.</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Rooms, voice and chat are free. Plus adds looks, premium maps, room space and more AI. Nothing here makes anyone stronger, and
          joining a room is always free.
        </p>
      </header>

      <div className="overflow-hidden rounded-[2rem] border">
        <div className="grid grid-cols-[1fr_5.5rem_7rem] items-end gap-2 bg-gradient-to-br from-secondary via-peach to-lavender p-4 sm:grid-cols-[1fr_8rem_9rem]">
          <span />
          <span className="text-center">
            <span className="block font-black">Free</span>
            <span className="text-xs text-muted-foreground">฿0</span>
          </span>
          <span className="text-center">
            <Crown className="mx-auto size-5 text-primary" />
            <span className="block font-black">Plus</span>
            <span className="text-xs text-muted-foreground">฿99 / month</span>
          </span>
        </div>
        {ROWS.map((g) => (
          <div key={g.group}>
            <p className="bg-muted/60 px-4 py-1.5 text-[11px] font-black tracking-wider text-muted-foreground uppercase">{g.group}</p>
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

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="rounded-full font-extrabold">
          Manage plan
        </Button>
        <Button variant="outline" className="rounded-full font-extrabold">
          <Gift /> Gift Plus to a friend
        </Button>
      </div>

      <section className="grid gap-3 text-sm sm:grid-cols-2">
        <p className="rounded-3xl bg-muted/60 p-4">
          <span className="block font-black">Your rooms follow your plan</span>
          Everyone inside gets the room space and the maps; only the owner pays. Friends can chip in by gifting Plus.
        </p>
        <p className="rounded-3xl bg-muted/60 p-4">
          <span className="block font-black">If Plus ends</span>
          Nothing is deleted. After 7 days your rooms go back to 25 at once, and a premium or Big map moves to its basic version (live, no
          one has to leave).
        </p>
      </section>
    </div>
  );
}
