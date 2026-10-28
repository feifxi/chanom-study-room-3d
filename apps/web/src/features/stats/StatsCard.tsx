'use client';

import { WeekChart } from './WeekChart';
import { formatMinutes, useStats } from './useStats';

/** Lobby card: my focus today / this week / streak, a 7-day chart and the weekly top 5. */
export function StatsCard({ visitorId, name }: { visitorId: string; name: string }) {
  const { stats, leaders, enabled } = useStats(visitorId);
  if (!enabled) return null;

  return (
    <section className="panel flex flex-col gap-4 p-5 md:col-span-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-extrabold tracking-wider text-muted uppercase">My study stats</h2>
        <span className="text-xs text-muted">Counted in Thai time · no sign-up, tied to this browser</span>
      </div>
      <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,4fr)]">
        <div className="grid grid-cols-3 content-start gap-2">
          <Tile label="Today" value={stats ? formatMinutes(stats.todayMin) : '–'} />
          <Tile label="Last 7 days" value={stats ? formatMinutes(stats.weekMin) : '–'} />
          <Tile label="Streak" value={stats ? `${stats.streakDays} ${stats.streakDays === 1 ? 'day' : 'days'}` : '–'} icon={stats && stats.streakDays > 0 ? '🔥' : undefined} />
        </div>
        <div>{stats ? <WeekChart days={stats.last7} /> : <div className="h-28 animate-pulse rounded-xl bg-soft" />}</div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-muted">🏆 Top this week</span>
          {leaders?.length === 0 && <p className="text-sm text-muted">No one has focused yet. Be the first!</p>}
          <ol className="flex flex-col gap-1 text-sm">
            {leaders?.slice(0, 5).map((r, i) => (
              <li key={`${r.name}-${i}`} className={`flex items-center gap-2 ${r.name === name ? 'font-bold' : ''}`}>
                <span className="w-5 text-center">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="font-mono text-xs text-muted">{formatMinutes(r.minutes)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Tile({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-soft px-3 py-2.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-lg leading-tight font-extrabold">
        {icon} {value}
      </span>
    </div>
  );
}
