'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { COMMON_CAPACITY, COMMON_COPIES, COMMON_FRIEND_SEATS, COMMON_ROOMS, MAPS } from '@/lib/mock';

/**
 * Common rooms (feature 14): Connecta's own rooms, one per template, with copies that open and close
 * by themselves. Their rules are fixed (text only, slow mode, no videos or Werewolf); the team only
 * watches the copies, sets how full they get, and can post a notice in all of them.
 */
export default function CommonRoomsAdmin() {
  const [capacity, setCapacity] = useState(COMMON_CAPACITY);
  const [friendSeats, setFriendSeats] = useState(COMMON_FRIEND_SEATS);
  const strangersUpTo = capacity - friendSeats;
  const [notice, setNotice] = useState('');

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <AdminTitle title="Common rooms" note="Run by Connecta · anyone welcome · text only" />

      <div className="grid gap-3 md:grid-cols-3">
        {COMMON_ROOMS.map((c) => {
          const map = MAPS.find((m) => m.id === c.mapId)!;
          const copies = COMMON_COPIES.filter((k) => k.mapId === c.mapId);
          return (
            <section key={c.id} className="rounded-3xl border bg-card p-4">
              <h2 className="font-black">
                {map.emoji} {c.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {c.here} here · {c.copies} copies open (demo shows {copies.length})
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {copies.map((k) => (
                  <li key={k.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-bold">{k.name.replace(/^.* Common Room /, 'Copy ')}</span>
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn('block h-full rounded-full', k.people >= strangersUpTo ? 'bg-tea' : 'bg-primary')}
                        style={{ width: `${Math.min(1, k.people / capacity) * 100}%` }}
                      />
                    </span>
                    <span className="w-12 text-right font-mono text-xs">
                      {k.people}/{capacity}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <section className="mt-6 grid gap-4 rounded-3xl border bg-card p-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="font-black">How full a copy gets</h2>
          <Num label="Seats in a copy" value={capacity} onChange={setCapacity} />
          <Num label="Kept for people joining a friend" value={friendSeats} onChange={setFriendSeats} />
          <p className="text-xs text-muted-foreground">
            Walk in places strangers until a copy has {strangersUpTo}, so the last {friendSeats} seats stay free for people joining a
            friend. A copy never holds more than {capacity}. A new copy opens when every copy has {strangersUpTo}; empty copies close.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-black">Rules (fixed for every Common room)</h2>
          <ul className="flex flex-wrap gap-1.5">
            {[
              'Text only, no voice',
              'No pictures',
              'No watch together',
              'No screen share',
              'No Werewolf',
              'Slow mode 3 s',
              'Links not clickable',
            ].map((r) => (
              <li key={r}>
                <Pill tone="info">{r}</Pill>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            5 reports in 30 min from different accounts puts someone out of Common rooms for 1 hour (Moderation).
          </p>
        </div>
      </section>

      <section className="mt-6 flex flex-col gap-2 rounded-3xl border bg-card p-4">
        <h2 className="font-black">Notice in every Common room</h2>
        <p className="text-xs text-muted-foreground">A banner at the top for everyone inside, e.g. maintenance or an event.</p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            maxLength={120}
            placeholder="“Quick restart at 03:00 for about a minute 🌙”"
            className="min-w-60 flex-1 rounded-full"
          />
          <Button
            disabled={!notice.trim()}
            className="rounded-full font-extrabold"
            onClick={() => {
              toast.success('Shown in all Common rooms for 10 minutes');
              setNotice('');
            }}
          >
            Post notice
          </Button>
        </div>
      </section>
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-bold">
      {label}
      <Input
        type="number"
        min={5}
        max={50}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || value)}
        className="w-20 rounded-xl text-right font-mono"
      />
    </label>
  );
}
