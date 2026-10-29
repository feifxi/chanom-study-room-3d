'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Download, LogOut, Trash2 } from 'lucide-react';
import { FEEDBACK_TAGS, type AdminOverview, type FeedbackRow } from '@study/shared';
import { LogoMark } from '@/components/Logo';
import { FACES, TAG_LABELS } from '../feedback/faces';
import { formatMinutes } from '../stats/useStats';
import { FEEDBACK_CSV_URL, deleteFeedback, fetchOverview, login, logout, type OverviewResult } from './api';

const REFRESH_MS = 5000;

/**
 * /admin: product analytics. Feedback and scores first, then visitors and who's online.
 * Service health and performance belong in Grafana. Password-protected by the game server.
 */
export function AdminPage() {
  const [result, setResult] = useState<OverviewResult | null>(null);

  const refresh = useCallback(async () => setResult(await fetchOverview()), []);
  useEffect(() => {
    // First load right away, then keep the numbers live
    const first = setTimeout(refresh, 0);
    const id = setInterval(refresh, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [refresh]);

  if (!result) return <Centered>Loading…</Centered>;
  if (result.kind === 'signedOut') return <Login onSignedIn={refresh} />;
  if (result.kind === 'error') return <Centered>{result.message}</Centered>;
  return (
    <Dashboard
      data={result.data}
      onDelete={async (id) => {
        await deleteFeedback(id);
        refresh();
      }}
      onSignOut={async () => {
        await logout();
        refresh();
      }}
    />
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <main className="grid min-h-full place-items-center p-6 text-sm text-muted">{children}</main>;
}

function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <main className="grid min-h-full place-items-center p-6">
      <form
        className="panel flex w-[min(360px,100%)] flex-col gap-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const err = await login(password);
          setBusy(false);
          if (err) setError(err);
          else onSignedIn();
        }}
      >
        <div className="flex items-center gap-3">
          <LogoMark size={36} />
          <div>
            <h1 className="text-lg font-extrabold">Admin</h1>
            <p className="text-xs text-muted">Chanom Study Room</p>
          </div>
        </div>
        <label className="flex flex-col gap-1 text-xs font-bold text-muted">
          Password
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        {error && <p className="text-xs font-bold text-rose-ink">{error}</p>}
        <button disabled={!password || busy} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

function Dashboard({ data, onDelete, onSignOut }: { data: AdminOverview; onDelete: (id: number) => void; onSignOut: () => void }) {
  const { live, summary, feedback } = data;
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <LogoMark size={40} />
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-[-0.03em]">Analytics</h1>
          <p className="text-xs text-muted">What people think and how they use the room · refreshes every {REFRESH_MS / 1000} s</p>
        </div>
        <Link href="/" className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold">
          Lobby
        </Link>
        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </header>

      {!summary && (
        <p className="rounded-2xl bg-rose px-4 py-3 text-sm font-bold text-rose-ink">
          The database is off, so feedback and visitor numbers aren&apos;t being saved.
        </p>
      )}

      {/* Feedback is what this page is for */}
      <Card
        title="Feedback"
        action={
          <a
            href={FEEDBACK_CSV_URL}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold"
          >
            <Download className="size-3.5" /> CSV
          </a>
        }
      >
        {summary && <FeedbackSummary summary={summary.feedback} rows={feedback} />}
        <FeedbackList rows={feedback} onDelete={onDelete} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Visitors">
          {summary ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Today" value={summary.visitors.today} hint="unique visitors" />
                <Stat label="Last 7 days" value={summary.visitors.last7Days} hint="unique visitors" />
                <Stat label="All time" value={summary.visitors.allTime} hint="unique visitors" />
                <Stat label="Visits (7 days)" value={summary.visits.last7Days} />
                <Stat label="Avg. visit" value={formatMinutes(summary.visits.avgMinutes)} />
                <Stat label="Focus (7 days)" value={formatMinutes(summary.focusMinutes.last7Days)} />
              </div>
              <DailyVisitors days={summary.daily} />
            </>
          ) : (
            <p className="text-sm text-muted">Needs the database.</p>
          )}
        </Card>

        <Card title="Right now">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Online" value={live.online} />
            <Stat label="Peak since restart" value={live.peakOnline} />
          </div>
          <ul className="flex flex-col gap-1.5">
            {live.rooms.length === 0 && <li className="text-sm text-muted">No open rooms.</li>}
            {live.rooms.map((r) => (
              <li key={r.label} className="flex items-center gap-3 rounded-xl bg-soft px-3 py-2 text-sm">
                <span className="flex-1 font-bold">{r.label}</span>
                <span className="text-muted">
                  {r.clients}/{r.maxClients} people
                </span>
                <span className="text-muted">{r.npcs} NPCs</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-soft px-3 py-2.5" title={hint}>
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xl leading-tight font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

/** Unique visitors per day: one hue, thin bars, value on hover and for today. */
function DailyVisitors({ days }: { days: { date: string; visitors: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.visitors));
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs font-bold text-muted">Unique visitors per day</figcaption>
      <div className="flex h-28 items-end gap-2 border-b border-line">
        {days.map((d, i) => {
          const today = i === days.length - 1;
          return (
            <div
              key={d.date}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
              title={`${d.date}: ${d.visitors}`}
            >
              <span className={`mb-1 text-xs font-bold tabular-nums ${today ? '' : 'opacity-0 group-hover:opacity-100'}`}>
                {d.visitors}
              </span>
              <div
                className={`w-full max-w-7 rounded-t ${today ? 'bg-accent' : 'bg-accent/45 group-hover:bg-accent/70'}`}
                style={{ height: `${(d.visitors / max) * 80}%`, minHeight: d.visitors ? 4 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 text-[11px] text-muted">
        {days.map((d, i) => (
          <span key={d.date} className={`flex-1 text-center ${i === days.length - 1 ? 'font-bold text-ink' : ''}`}>
            {i === days.length - 1 ? 'Today' : new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short' })}
          </span>
        ))}
      </div>
    </figure>
  );
}

function FeedbackSummary({
  summary,
  rows,
}: {
  summary: { count: number; avgRating: number | null; distribution: number[] };
  rows: FeedbackRow[];
}) {
  const max = Math.max(1, ...summary.distribution);
  const avgFace = summary.avgRating ? FACES[Math.round(summary.avgRating) - 1] : undefined;
  const tagCounts = FEEDBACK_TAGS.map((t) => [t, rows.filter((r) => r.tags.includes(t)).length] as const);
  return (
    <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)_auto]">
      <div className="flex items-center gap-3 rounded-2xl bg-accent-soft px-5 py-4">
        <span className="text-4xl">{avgFace?.emoji ?? '—'}</span>
        <div>
          <p className="text-3xl leading-none font-extrabold tabular-nums">{summary.avgRating ? summary.avgRating.toFixed(1) : '–'}</p>
          <p className="text-xs text-muted">
            average of {summary.count} {summary.count === 1 ? 'rating' : 'ratings'}
          </p>
        </div>
      </div>
      <ol className="flex flex-col gap-1.5" aria-label="Ratings">
        {[...summary.distribution].reverse().map((n, ri) => {
          const face = FACES[4 - ri]!;
          return (
            <li key={face.label} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-center" title={face.label}>
                {face.emoji}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-soft">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-xs font-bold tabular-nums">{n}</span>
            </li>
          );
        })}
      </ol>
      <ul className="flex flex-col gap-1.5 text-sm">
        {tagCounts.map(([t, n]) => (
          <li key={t} className="flex items-center justify-between gap-4 rounded-xl bg-soft px-3 py-1.5">
            <span>{TAG_LABELS[t]}</span>
            <span className="font-bold tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeedbackList({ rows, onDelete }: { rows: FeedbackRow[]; onDelete: (id: number) => void }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No feedback yet. It&apos;s asked when people leave a room.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {rows.map((r) => (
        <li key={r.id} className="flex gap-3 py-3">
          <span className="text-2xl" title={FACES[r.rating - 1]?.label}>
            {FACES[r.rating - 1]?.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <b>{r.name}</b>
              {r.tags.map((t) => (
                <span key={t} className="rounded-full bg-lavender px-2 py-0.5 text-[11px] font-bold text-lavender-ink">
                  {TAG_LABELS[t]}
                </span>
              ))}
              <span className="ml-auto text-xs text-muted">
                {new Date(r.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </p>
            {r.comment && <p className="mt-1 text-sm whitespace-pre-wrap">{r.comment}</p>}
            <p className="mt-1 text-xs text-muted">
              {r.roomLabel || 'Room'} · {formatMinutes(r.minutesInRoom)} in the room · {r.usedVoice ? 'used voice' : 'no voice'} ·{' '}
              {r.viewport} · {browserName(r.userAgent)}
            </p>
          </div>
          <button
            onClick={() => confirm('Delete this feedback?') && onDelete(r.id)}
            aria-label={`Delete feedback from ${r.name}`}
            className="grid size-8 flex-none place-items-center self-start rounded-lg text-muted hover:bg-rose hover:text-rose-ink"
          >
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Rough browser + OS from a user agent, enough to spot "only broken on Safari". */
function browserName(ua: string) {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser';
  const os = /iPhone|iPad/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Mac OS/.test(ua)
        ? 'macOS'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? `${browser} on ${os}` : browser;
}
