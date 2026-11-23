'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Flag, MessageSquare, User, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { useDecideReport, useReportCases, type ReportAction, type ReportCase } from '@/features/admin/useAdmin';
import { problem } from '@/features/rooms/useRooms';

const ICONS: Record<ReportCase['kind'], typeof User> = { person: User, room: Warehouse, message: MessageSquare };

/** What the team can do, by what was reported. Account actions email the person the reason. */
const ACTIONS: Record<ReportCase['kind'], { action: ReportAction; label: string; tone?: 'bad'; account?: boolean }[]> = {
  person: [
    { action: 'warn', label: 'Warn', account: true },
    { action: 'suspend_1d', label: 'Suspend 1 day', account: true },
    { action: 'suspend_7d', label: 'Suspend 7 days', tone: 'bad', account: true },
    { action: 'ban', label: 'Ban', tone: 'bad', account: true },
  ],
  message: [
    { action: 'delete', label: 'Delete message' },
    { action: 'delete_warn', label: 'Delete + warn', account: true },
    { action: 'delete_suspend_1d', label: 'Delete + suspend 1 day', tone: 'bad', account: true },
  ],
  room: [
    { action: 'delist', label: 'Delist from Discover' },
    { action: 'close', label: 'Close room', tone: 'bad' },
    { action: 'close_suspend_owner', label: 'Close + suspend owner 7 days', tone: 'bad', account: true },
  ],
};

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export default function ReportsPage() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}

/**
 * The reports queue (feature 14): one case per person, message or room, urgent first, then oldest.
 * Each shows what the automatic steps already did and what was said around it; voice isn't recorded,
 * so voice reports go by how many people reported. The team decides by hand: no automatic strikes.
 */
function Reports() {
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [picked, setPicked] = useState<string | null>(useSearchParams().get('id'));
  const open = useReportCases('open');
  const done = useReportCases('done');
  const shown = (tab === 'open' ? open.data?.cases : done.data?.cases) ?? [];
  const current = shown.find((r) => r.key === picked) ?? shown[0];
  const count = { open: open.data?.open ?? 0, done: done.data?.cases.length ?? 0 };

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <AdminTitle title="Reports" note="Urgent first. Reporters are anonymous to the people they report.">
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {(['open', 'done'] as const).map((t) => (
            <button
              key={t}
              onClick={() => (setTab(t), setPicked(null))}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-extrabold capitalize',
                tab === t ? 'bg-card shadow-sm' : 'text-muted-foreground',
              )}
            >
              {t} · {count[t]}
            </button>
          ))}
        </div>
      </AdminTitle>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ul className="flex flex-col gap-1.5">
          {shown.map((r) => {
            const Icon = ICONS[r.kind];
            return (
              <li key={`${r.key}${r.decidedAt ?? ''}`}>
                <button
                  onClick={() => setPicked(r.key)}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-2xl border p-3 text-left',
                    current?.key === r.key ? 'border-primary bg-secondary/40' : 'bg-card hover:bg-muted',
                  )}
                >
                  <Icon className="mt-0.5 size-4 flex-none text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-black">{r.name}</span>
                      {r.urgent && <Pill tone="bad">urgent</Pill>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.reasons.join(', ')}
                      {r.where && ` · ${r.where}`}
                    </span>
                  </span>
                  <span className="flex-none text-right text-[11px] text-muted-foreground">
                    {ago(tab === 'open' ? r.lastAt : (r.decidedAt ?? r.lastAt))}
                    <span className="block font-bold">
                      <Flag className="inline size-3" /> {r.reporters}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {(tab === 'open' ? open : done).data && !shown.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nothing here. Nice and quiet 🌙</p>
          )}
        </ul>

        {current && <Detail key={`${current.key}${current.decidedAt ?? ''}`} r={current} onDone={() => setPicked(null)} />}
      </div>
    </div>
  );
}

function Detail({ r, onDone }: { r: ReportCase; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const decide = useDecideReport();
  const run = (action: ReportAction, label: string, account?: boolean) =>
    decide.mutate(
      { key: r.key, action, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(
            action === 'dismiss'
              ? 'Dismissed. Nothing happens to them.'
              : account
                ? `${label}. They get an email saying why; they can reply to appeal.`
                : `${label}.`,
          );
          onDone();
        },
        onError: (e) => toast.error(problem(e)),
      },
    );

  return (
    <section className="flex flex-col gap-4 self-start rounded-3xl border bg-card p-4 lg:sticky lg:top-4">
      <div>
        <p className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">
          {r.kind} · {r.reporters} {r.reporters === 1 ? 'account reported' : 'different accounts reported'}
        </p>
        <h2 className="text-xl font-black">
          {r.name} {r.handle && <span className="text-sm font-bold text-muted-foreground">@{r.handle}</span>}
        </h2>
        <p className="text-sm">
          <b>{r.reasons.join(', ')}</b>
          {r.where && ` · ${r.where}`} · {ago(r.firstAt)}
          {r.firstAt !== r.lastAt && ` to ${ago(r.lastAt)}`}
        </p>
        {r.details.map((d) => (
          <p key={d} className="mt-1 rounded-2xl bg-muted/60 px-3 py-2 text-sm">
            “{d}”
          </p>
        ))}
      </div>

      {r.auto && (
        <p className="rounded-2xl bg-sky px-3 py-2 text-sm text-sky-ink">
          <b>Already done automatically:</b> {r.auto}
        </p>
      )}

      {r.room && (
        <div className="rounded-2xl bg-muted/60 px-3 py-2 text-sm">
          <p>
            <b>Description:</b> {r.room.description || '—'}
          </p>
          <p className="mt-1">
            <b>Rules:</b> {r.room.rules || '—'}
          </p>
        </div>
      )}

      {r.context.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-black text-muted-foreground">
            {r.kind === 'message' ? 'What was said around it' : 'What they said lately'}
          </p>
          <ul className="flex flex-col gap-1 rounded-2xl bg-muted/60 p-2.5 text-sm">
            {r.context.map((c, i) => (
              <li key={i} className={cn('rounded-lg px-2 py-0.5', c.flagged && r.kind === 'message' && 'bg-destructive/10')}>
                <b>{c.by}:</b> {c.text}
                {c.bubble && <span className="ml-1 text-[10px] font-bold text-muted-foreground">(bubble a reporter saw)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.kind === 'person' && (
        <p className="text-xs text-muted-foreground">
          Voice isn’t recorded, ever. Go by how many people reported and the account’s history.
        </p>
      )}

      <div>
        <p className="mb-1.5 text-xs font-black text-muted-foreground">History</p>
        <p className="text-sm">{r.history.length ? r.history.join(' · ') : 'Nothing before this.'}</p>
      </div>

      {r.status === 'open' ? (
        <div className="flex flex-col gap-2 border-t pt-4">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Reason, emailed with an account action (leave empty to use the report reasons)"
            className="rounded-xl"
          />
          <div className="flex flex-wrap gap-2">
            {ACTIONS[r.kind].map((a) => (
              <Button
                key={a.action}
                variant="outline"
                disabled={decide.isPending}
                className={cn('rounded-full font-extrabold', a.tone === 'bad' && 'border-destructive/40 text-destructive')}
                onClick={() => run(a.action, a.label, a.account)}
              >
                {a.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              disabled={decide.isPending}
              className="rounded-full font-bold"
              onClick={() => run('dismiss', 'Dismissed')}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : (
        <p className="border-t pt-4 text-sm">
          <Pill tone="muted">done</Pill> {r.outcome} by {r.decidedBy} · {r.decidedAt && ago(r.decidedAt)}
        </p>
      )}
    </section>
  );
}
