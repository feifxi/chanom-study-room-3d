'use client';

import { useState } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  DAILY_RANK_CAP_MIN,
  formatMinutes,
  useGlobalOptIn,
  useMyFocus,
  useRanking,
  type FocusDay,
  type RankPeriod,
  type RankScope,
} from '@/lib/focus';
import { ME } from '@/lib/mock';

/**
 * My focus: your own numbers (only you see them) and the rankings. No streaks, on purpose: a missed
 * day shouldn't feel like losing something. The room's "Today" ranking lives in the Study panel.
 */
export default function FocusPage() {
  const me = useMyFocus();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-5 sm:p-8">
      <div>
        <h1 className="text-3xl font-black tracking-[-0.03em]">My focus</h1>
        <p className="text-sm text-muted-foreground">Time on your focus timer, in any room. Your numbers are only yours.</p>
      </div>
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
function WeekChart({ days }: { days: FocusDay[] }) {
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

/** Minutes per "Studying …" subject over the last 7 days, as you typed it (case-insensitive in the real app). */
function Subjects({ subjects }: { subjects: { name: string; minutes: number }[] }) {
  const max = Math.max(1, ...subjects.map((s) => s.minutes));
  return (
    <section className="panel flex flex-col gap-3 p-5" aria-label="By subject">
      <h2 className="text-sm font-black">By subject, last 7 days</h2>
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
  const [onGlobal, setOnGlobal] = useGlobalOptIn();
  const { rows, me } = useRanking(scope, period);
  const meInList = rows.some((r) => r.user.id === ME.id);

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
      <ol className="flex flex-col gap-0.5">
        {rows.map((r, i) => (
          <Row key={r.user.id} rank={i + 1} user={r.user} minutes={r.minutes} mine={r.user.id === ME.id} />
        ))}
      </ol>
      {scope === 'everyone' && (
        <>
          {me && !meInList && (
            <>
              <p className="text-center text-xs text-muted-foreground">⋯</p>
              <ol>
                <Row rank={me.rank} user={ME} minutes={me.minutes} mine />
              </ol>
            </>
          )}
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-3 py-2.5">
            <span>
              <span className="block text-sm font-bold">Show me on Everyone</span>
              <span className="block text-[11px] text-muted-foreground">
                {onGlobal ? 'Your name, character and minutes are listed.' : 'You’re hidden. You still see the list.'} Off by default under
                18.
              </span>
            </span>
            <Switch checked={onGlobal} onCheckedChange={setOnGlobal} />
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

function Row({
  rank,
  user,
  minutes,
  mine,
}: {
  rank: number;
  user: Parameters<typeof UserAvatar>[0]['user'];
  minutes: number;
  mine: boolean;
}) {
  return (
    <li className={cn('flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm', mine && 'bg-secondary font-bold')}>
      <span className="w-10 text-center font-mono text-xs tabular-nums">{['🥇', '🥈', '🥉'][rank - 1] ?? rank.toLocaleString()}</span>
      <UserAvatar user={user} size={26} />
      <span className="min-w-0 flex-1 truncate font-semibold">
        {user.name}
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
