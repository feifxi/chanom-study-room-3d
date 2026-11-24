'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { COMMON_CAPACITY_RANGE, COMMON_SAY_MS } from '@connecta/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MAPS } from '@/lib/maps';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { useAdminCommon, useCommonNotice, useCommonSeats, type AdminCommon } from '@/features/admin/useAdmin';
import { problem } from '@/features/rooms/useRooms';

const RULES = ['Text only, no voice', 'No pictures', 'No watch together', 'No screen share', `Slow mode ${COMMON_SAY_MS / 1000} s`];

/**
 * Common rooms (feature 14): Connecta's own rooms, one per template, with copies that open and close
 * by themselves. Their rules are fixed (text only, slow mode, no videos); the team watches the
 * copies, sets how full they get, and can post a notice in all of them.
 */
export default function CommonRoomsAdmin() {
  const { data } = useAdminCommon();
  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <AdminTitle title="Common rooms" note="Run by Connecta · anyone welcome · text only" />
      {data ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {data.types.map((c) => {
              const map = MAPS.find((m) => m.id === c.mapId);
              const strangersUpTo = data.capacity - data.friendSeats;
              return (
                <section key={c.id} className="rounded-3xl border bg-card p-4">
                  <h2 className="font-black">
                    {map?.emoji} {c.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {c.here} here · {c.copies.length} {c.copies.length === 1 ? 'copy' : 'copies'} open
                  </p>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {c.copies.map((k) => (
                      <li key={k.n} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate font-bold">Copy #{k.n}</span>
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <span
                            className={cn('block h-full rounded-full', k.people >= strangersUpTo ? 'bg-tea' : 'bg-primary')}
                            style={{ width: `${Math.min(1, k.people / data.capacity) * 100}%` }}
                          />
                        </span>
                        <span className="w-12 text-right font-mono text-xs">
                          {k.people}/{data.capacity}
                        </span>
                      </li>
                    ))}
                    {!c.copies.length && (
                      <li className="text-xs text-muted-foreground">Nobody here now. A copy opens when someone walks in.</li>
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
          <section className="mt-6 grid gap-4 rounded-3xl border bg-card p-4 md:grid-cols-2">
            <Seats key={`${data.capacity}:${data.friendSeats}`} data={data} />
            <div className="flex flex-col gap-2">
              <h2 className="font-black">Rules (fixed for every Common room)</h2>
              <ul className="flex flex-wrap gap-1.5">
                {RULES.map((r) => (
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
          <Notice data={data} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
    </div>
  );
}

function Seats({ data }: { data: AdminCommon }) {
  const [capacity, setCapacity] = useState(data.capacity);
  const [friendSeats, setFriendSeats] = useState(data.friendSeats);
  const save = useCommonSeats();
  const strangersUpTo = capacity - friendSeats;
  const changed = capacity !== data.capacity || friendSeats !== data.friendSeats;
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-black">How full a copy gets</h2>
      <Num
        label="Seats in a copy"
        value={capacity}
        min={COMMON_CAPACITY_RANGE.min}
        max={COMMON_CAPACITY_RANGE.max}
        onChange={setCapacity}
      />
      <Num label="Kept for people joining a friend" value={friendSeats} min={0} max={20} onChange={setFriendSeats} />
      <p className="text-xs text-muted-foreground">
        Walk in places strangers until a copy has {strangersUpTo}, so the last {friendSeats} seats stay free for people joining a friend. A
        copy never holds more than {capacity}. A new copy opens when every copy has {strangersUpTo}; empty copies close. People already
        inside stay.
      </p>
      {changed && (
        <Button
          disabled={save.isPending || strangersUpTo < 1}
          className="self-start rounded-full font-extrabold"
          onClick={() =>
            save.mutate(
              { capacity, friendSeats },
              { onSuccess: () => toast.success('Saved. Walking in uses it from now on.'), onError: (e) => toast.error(problem(e)) },
            )
          }
        >
          Save
        </Button>
      )}
    </div>
  );
}

function Notice({ data }: { data: AdminCommon }) {
  const [notice, setNotice] = useState('');
  const post = useCommonNotice();
  const until = data.notice && new Date(data.notice.until).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return (
    <section className="mt-6 flex flex-col gap-2 rounded-3xl border bg-card p-4">
      <h2 className="font-black">Notice in every Common room</h2>
      <p className="text-xs text-muted-foreground">
        A banner at the top for everyone inside for 10 minutes, e.g. maintenance or an event. A new one replaces it.
      </p>
      {data.notice && (
        <p className="rounded-2xl bg-primary/10 px-3 py-2 text-sm">
          <b>Showing until {until}:</b> {data.notice.text}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Input
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          maxLength={120}
          placeholder="“Quick restart at 03:00 for about a minute 🌙”"
          className="min-w-60 flex-1 rounded-full"
        />
        <Button
          disabled={!notice.trim() || post.isPending}
          className="rounded-full font-extrabold"
          onClick={() =>
            post.mutate(notice.trim(), {
              onSuccess: () => {
                toast.success('Shown in all Common rooms for 10 minutes');
                setNotice('');
              },
              onError: (e) => toast.error(problem(e)),
            })
          }
        >
          Post notice
        </Button>
      </div>
    </section>
  );
}

function Num({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-bold">
      {label}
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
        }}
        className="w-20 rounded-xl text-right font-mono"
      />
    </label>
  );
}
