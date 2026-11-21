'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Flag, MessageSquare, Image as ImageIcon, User, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { REPORTS, type Report, type ReportTarget } from '@/features/admin/adminData';

const ICONS: Record<ReportTarget, typeof User> = { person: User, room: Warehouse, message: MessageSquare, picture: ImageIcon };

/** What the team can do, by what was reported. Every action lands in the audit log and emails the account. */
const ACTIONS: Record<ReportTarget, { label: string; tone?: 'bad' }[]> = {
  person: [{ label: 'Warn' }, { label: 'Suspend 1 day' }, { label: 'Suspend 7 days', tone: 'bad' }, { label: 'Ban', tone: 'bad' }],
  message: [{ label: 'Delete message' }, { label: 'Delete + warn' }, { label: 'Delete + suspend 1 day', tone: 'bad' }],
  picture: [{ label: 'Delete picture' }, { label: 'Delete + suspend 7 days', tone: 'bad' }, { label: 'Delete + ban', tone: 'bad' }],
  room: [{ label: 'Delist from Discover' }, { label: 'Close room', tone: 'bad' }, { label: 'Close + suspend owner', tone: 'bad' }],
};

export default function ReportsPage() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}

/**
 * The reports queue (feature 14): urgent first, then oldest. Each report shows what the automatic
 * layers already did and the messages around it; there's no voice recording, so voice reports rely on
 * how many people reported. The team decides by hand: no automatic strikes.
 */
function Reports() {
  const [reports, setReports] = useState(REPORTS);
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [picked, setPicked] = useState<string | null>(useSearchParams().get('id'));
  const shown = reports.filter((r) => r.status === tab).sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
  const current = reports.find((r) => r.id === picked) ?? shown[0];

  const decide = (r: Report, outcome: string) => {
    setReports((all) => all.map((x) => (x.id === r.id ? { ...x, status: 'done', outcome: `${outcome} by you · just now` } : x)));
    setPicked(null);
    toast.success(
      outcome === 'Dismissed'
        ? 'Dismissed. Nothing happens to them.'
        : `${outcome}. They get an email saying why; they can reply to appeal.`,
    );
  };

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
              {t} · {reports.filter((r) => r.status === t).length}
            </button>
          ))}
        </div>
      </AdminTitle>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ul className="flex flex-col gap-1.5">
          {shown.map((r) => {
            const Icon = ICONS[r.target];
            return (
              <li key={r.id}>
                <button
                  onClick={() => setPicked(r.id)}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-2xl border p-3 text-left',
                    current?.id === r.id ? 'border-primary bg-secondary/40' : 'bg-card hover:bg-muted',
                  )}
                >
                  <Icon className="mt-0.5 size-4 flex-none text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-black">{r.name}</span>
                      {r.urgent && r.status === 'open' && <Pill tone="bad">urgent</Pill>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.reason} · {r.where}
                    </span>
                  </span>
                  <span className="flex-none text-right text-[11px] text-muted-foreground">
                    {r.at}
                    <span className="block font-bold">
                      <Flag className="inline size-3" /> {r.reporters}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {!shown.length && <p className="py-8 text-center text-sm text-muted-foreground">Nothing here. Nice and quiet 🌙</p>}
        </ul>

        {current && <Detail key={current.id} r={current} onDecide={(o) => decide(current, o)} />}
      </div>
    </div>
  );
}

function Detail({ r, onDecide }: { r: Report; onDecide: (outcome: string) => void }) {
  return (
    <section className="flex flex-col gap-4 self-start rounded-3xl border bg-card p-4 lg:sticky lg:top-4">
      <div>
        <p className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">
          {r.target} · {r.reporters} {r.reporters === 1 ? 'account reported' : 'different accounts reported'}
        </p>
        <h2 className="text-xl font-black">
          {r.name} {r.handle && <span className="text-sm font-bold text-muted-foreground">@{r.handle}</span>}
        </h2>
        <p className="text-sm">
          <b>{r.reason}</b> · {r.where} · {r.at}
        </p>
        {r.details && <p className="mt-1 rounded-2xl bg-muted/60 px-3 py-2 text-sm">“{r.details}”</p>}
      </div>

      {r.auto && (
        <p className="rounded-2xl bg-sky px-3 py-2 text-sm text-sky-ink">
          <b>Already done automatically:</b> {r.auto}
        </p>
      )}

      {r.context.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-black text-muted-foreground">What was said around it</p>
          <ul className="flex flex-col gap-1 rounded-2xl bg-muted/60 p-2.5 text-sm">
            {r.context.map((c, i) => (
              <li key={i} className={cn('rounded-lg px-2 py-0.5', c.flagged && 'bg-destructive/10')}>
                <b>{c.who}:</b> {c.text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.target === 'person' && r.reason.toLowerCase().includes('voice') && (
        <p className="text-xs text-muted-foreground">
          Voice isn’t recorded, ever. Go by how many people reported and the account’s history.
        </p>
      )}

      <div>
        <p className="mb-1.5 text-xs font-black text-muted-foreground">History</p>
        <p className="text-sm">{r.history.length ? r.history.join(' · ') : 'Nothing before this.'}</p>
      </div>

      {r.status === 'open' ? (
        <div className="flex flex-wrap gap-2 border-t pt-4">
          {ACTIONS[r.target].map((a) => (
            <Button
              key={a.label}
              variant="outline"
              className={cn('rounded-full font-extrabold', a.tone === 'bad' && 'border-destructive/40 text-destructive')}
              onClick={() => onDecide(a.label)}
            >
              {a.label}
            </Button>
          ))}
          <Button variant="ghost" className="rounded-full font-bold" onClick={() => onDecide('Dismissed')}>
            Dismiss
          </Button>
        </div>
      ) : (
        <p className="border-t pt-4 text-sm">
          <Pill tone="muted">done</Pill> {r.outcome}
        </p>
      )}
    </section>
  );
}
