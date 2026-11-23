'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { DAILY_RANK_CAP_MIN } from '@connecta/shared';
import { PersonFace } from '@/components/PersonFace';
import { Switch } from '@/components/ui/switch';
import type { Schemas } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { formatMinutes } from '@/lib/focus';
import { useMe } from '@/features/account/useMe';
import { useMyRooms } from '@/features/rooms/useRooms';
import { walkInHref } from '@/features/place/model';
import {
  lastRoomId,
  useMyFocus,
  useRanking,
  useShowOnEveryone,
  type MyFocus,
  type RankPeriod,
  type RankScope,
} from '@/features/focus/useFocusStats';

const NO_FOCUS: MyFocus = { today: 0, week: 0, dailyAverage: 0, days: [], subjects: [] };

/**
 * My focus: your own numbers (only you see them) and the rankings. No streaks, on purpose: a missed
 * day shouldn't feel like losing something. The room's "Today" ranking lives in the Study panel.
 */
export default function FocusPage() {
  const me = useMyFocus().data ?? NO_FOCUS;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-5 sm:p-8">
      <FocusHero week={me.week} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <section className="panel flex flex-col gap-4 p-5" aria-label="My numbers">
            <div className="grid grid-cols-3 gap-2">
              <Tile label="Today" value={formatMinutes(me.today)} />
              <Tile label="Last 7 days" value={formatMinutes(me.week)} />
              <Tile label="Daily average" value={formatMinutes(me.dailyAverage)} hint="days you focused" />
            </div>
            <WeekChart days={me.days} />
          </section>
          <Subjects subjects={me.subjects} />
        </div>
        <Rankings />
      </div>
    </div>
  );
}

/**
 * The week at a glance, said kindly: how much you did, where that puts you among friends, and a way
 * back into a study room. Never "you broke your streak" (there are no streaks).
 */
function FocusHero({ week }: { week: number }) {
  const { rows = [], me = null } = useRanking('friends', 'week').data ?? {};
  const myIndex = rows.findIndex((r) => r.minutes === me?.minutes && r.rank === me?.rank);
  const ahead = me?.rank && me.rank > 1 && myIndex > 0 ? rows[myIndex - 1] : null;
  const back = useBackToRoom();
  return (
    <section className="relative grid items-center gap-6 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-peach via-secondary to-lavender p-6 sm:p-8 md:grid-cols-[1fr_auto]">
      <span className="pointer-events-none absolute -right-4 -bottom-8 text-[9rem] opacity-20">🍅</span>
      <div>
        <p className="text-xs font-black tracking-wider uppercase">My focus · this week</p>
        <p className="mt-1 font-mono text-5xl font-black tracking-tight sm:text-6xl">{formatMinutes(week)}</p>
        <p className="mt-2 max-w-md text-sm">
          {me?.rank === 1
            ? 'You’re first among your friends this week 🏆'
            : ahead && me
              ? `#${me.rank} among friends. ${formatMinutes(ahead.minutes - me.minutes)} behind ${ahead.person.name}, nice and close.`
              : 'Every minute on your timer counts, in any room.'}
        </p>
        <p className="mt-1 text-xs opacity-75">Your numbers are only yours. Friends see the weekly ranking.</p>
      </div>
      <Link
        href={back.href}
        className="relative flex max-w-full items-center gap-2 rounded-full bg-card px-5 py-3 text-sm font-extrabold shadow-md hover:bg-muted"
      >
        <span>{back.emoji}</span>
        <span className="truncate">{back.label}</span>
      </Link>
    </section>
  );
}

const noStore = () => () => {};

/** The room you were last in (if you're still a member), or Discover to find one */
function useBackToRoom() {
  const { data: rooms } = useMyRooms();
  const lastId = useSyncExternalStore(noStore, lastRoomId, () => null);
  const room = rooms?.find((r) => r.id === lastId);
  return room
    ? { href: walkInHref(room), emoji: room.emoji, label: `Back to ${room.name}` }
    : { href: '/discover', emoji: '🔎', label: 'Find a room to study in' };
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-muted px-3 py-2.5">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="font-mono text-base font-black whitespace-nowrap tabular-nums sm:text-2xl">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const W = 420;
const H = 150;
const PAD = { top: 20, right: 8, bottom: 22, left: 8 };
const BAR = 24;

/** Focus minutes for the last 7 days: one series (no legend), today labelled, hover for the number. */
function WeekChart({ days }: { days: MyFocus['days'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(60, ...days.map((d) => d.minutes));
  const plotH = H - PAD.top - PAD.bottom;
  const slot = (W - PAD.left - PAD.right) / days.length;
  const base = PAD.top + plotH;
  const shown = hover ?? days.length - 1;

  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="text-xs font-bold text-muted-foreground">Last 7 days</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Focus minutes over the last 7 days">
        <line x1={PAD.left} x2={W - PAD.right} y1={base} y2={base} stroke="var(--border)" strokeWidth={1} />
        {days.map((d, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const h = (d.minutes / max) * plotH;
          const isToday = i === days.length - 1;
          const weekday = new Date(`${d.date}T12:00:00`).toLocaleDateString('en', { weekday: 'short' });
          return (
            <g key={d.date} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              {/* The whole column is the hit target, not just the bar */}
              <rect x={cx - slot / 2} y={0} width={slot} height={H} fill="transparent" />
              {d.minutes > 0 && (
                // Rounded top, square bottom on the baseline
                <path
                  d={`M${cx - BAR / 2},${base} v${-(h - 4)} q0,-4 4,-4 h${BAR - 8} q4,0 4,4 v${h - 4} z`}
                  fill="var(--primary)"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              {i === shown && d.minutes > 0 && (
                <text x={cx} y={base - h - 6} textAnchor="middle" className="fill-foreground text-[11px] font-bold">
                  {formatMinutes(d.minutes)}
                </text>
              )}
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                className={cn('text-[11px]', isToday ? 'fill-foreground font-bold' : 'fill-muted-foreground')}
              >
                {isToday ? 'Today' : weekday}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/** Minutes per "Studying …" subject over the last 7 days (typed alike counts together, under your most-used spelling). */
function Subjects({ subjects }: { subjects: { name: string; minutes: number }[] }) {
  const max = Math.max(1, ...subjects.map((s) => s.minutes));
  return (
    <section className="panel flex flex-col gap-3 p-5" aria-label="By subject">
      <h2 className="text-sm font-black">By subject, last 7 days</h2>
      {subjects.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing yet this week. Start a timer in any room and it shows up here.</p>
      )}
      <ul className="flex flex-col gap-2.5">
        {subjects.map((s) => (
          <li key={s.name} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
            <span className={cn('truncate font-bold', s.name === 'No subject' && 'font-semibold text-muted-foreground')}>{s.name}</span>
            <span className="h-2.5 rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${(s.minutes / max) * 100}%` }} />
            </span>
            <span className="w-14 text-right font-mono text-xs text-muted-foreground tabular-nums">{formatMinutes(s.minutes)}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">From “Studying (shown above your head)” in the Study panel.</p>
    </section>
  );
}

function Rankings() {
  const [scope, setScope] = useState<RankScope>('friends');
  const [period, setPeriod] = useState<RankPeriod>('week');
  const [onEveryone, setOnEveryone] = useShowOnEveryone();
  const { data: account } = useMe();
  const { data } = useRanking(scope, period);
  const rows = data?.rows ?? [];
  const me = data?.me ?? null;
  const meInList = rows.some((r) => r.person.id === account?.id);

  return (
    <section className="panel flex flex-col gap-3 p-5" aria-label="Rankings">
      <h2 className="text-sm font-black">🏆 Rankings</h2>
      <div className="flex flex-wrap gap-2">
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            ['friends', 'Friends'],
            ['everyone', 'Everyone'],
          ]}
        />
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            ['today', 'Today'],
            ['week', 'This week'],
          ]}
        />
      </div>
      {scope === 'everyone' && data && rows.length === 0 && (
        <p className="px-1 text-sm text-muted-foreground">
          Nobody yet {period === 'today' ? 'today' : 'this week'}. Your first round could be #1.
        </p>
      )}
      <ol className="flex flex-col gap-0.5">
        {rows.map((r) => (
          <Row key={r.person.id} rank={r.rank} person={r.person} minutes={r.minutes} mine={r.person.id === account?.id} />
        ))}
      </ol>
      {scope === 'friends' && !!data?.idleFriends && (
        <p className="px-1 text-xs text-muted-foreground">
          {data.idleFriends === 1 ? '1 friend hasn’t' : `${data.idleFriends} friends haven’t`} focused{' '}
          {period === 'today' ? 'today' : 'this week'} yet.
        </p>
      )}
      {scope === 'everyone' && (
        <>
          {me && !meInList && account && (
            <>
              <p className="text-center text-xs text-muted-foreground">⋯</p>
              <ol>
                <Row
                  rank={me.rank}
                  person={{ id: account.id, name: account.name, handle: account.handle, look: account.look }}
                  minutes={me.minutes}
                  mine
                />
              </ol>
            </>
          )}
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-3 py-2.5">
            <span>
              <span className="block text-sm font-bold">Show me on Everyone</span>
              <span className="block text-[11px] text-muted-foreground">
                {onEveryone ? 'Your name, character and minutes are listed.' : 'You’re hidden. You still see the list.'} Off by default
                under 18.
              </span>
            </span>
            <Switch checked={onEveryone} onCheckedChange={(on) => void setOnEveryone(on)} />
          </label>
        </>
      )}
      <p className="text-[11px] text-muted-foreground">
        Weeks start Monday, in your time zone. At most {DAILY_RANK_CAP_MIN / 60}h a day counts
        {scope === 'everyone' && '; updates every few minutes'}.
      </p>
    </section>
  );
}

function Row({ rank, person, minutes, mine }: { rank: number | null; person: Schemas['Person']; minutes: number; mine: boolean }) {
  return (
    <li className={cn('flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm', mine && 'bg-secondary font-bold')}>
      <span className="w-10 text-center font-mono text-xs tabular-nums">
        {rank === null ? '–' : (['🥇', '🥈', '🥉'][rank - 1] ?? rank.toLocaleString())}
      </span>
      <PersonFace who={person} size={26} />
      <span className="min-w-0 flex-1 truncate font-semibold">
        {person.name}
        {mine && ' (you)'}
      </span>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{minutes ? formatMinutes(minutes) : '–'}</span>
    </li>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-muted p-1">
      {options.map(([id, label]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={cn(
            'rounded-xl px-3 py-1 text-xs font-bold',
            value === id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
