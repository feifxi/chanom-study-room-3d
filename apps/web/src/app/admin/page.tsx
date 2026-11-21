'use client';

import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { AUDIT, HEALTH, REPORTS, STATS } from '@/features/admin/adminData';

/**
 * Admin overview: how Connecta is doing right now and what needs a person. Deep monitoring stays in
 * Grafana (feature 15's observability); this page only shows the headline and links there.
 */
export default function AdminOverview() {
  const urgent = REPORTS.filter((r) => r.status === 'open' && r.urgent);
  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <AdminTitle title="Overview" note="Monday 9 Nov · live, refreshes every 30 s" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-3xl border bg-card p-4">
            <p className="text-xs font-bold text-muted-foreground">{s.label}</p>
            <p className={cn('mt-1 font-mono text-3xl font-black', s.tone === 'warn' && 'text-tea')}>{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-3xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex-1 font-black">Health</h2>
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            Open Grafana <ExternalLink className="size-3" />
          </a>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {HEALTH.map((h) => (
            <div key={h.name} className="flex items-center gap-2.5 rounded-2xl bg-muted/60 px-3 py-2">
              <span
                className={cn(
                  'size-2.5 flex-none rounded-full',
                  h.status === 'ok' ? 'bg-online' : h.status === 'warn' ? 'bg-tea' : 'bg-destructive',
                )}
                aria-label={h.status}
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold">{h.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{h.detail}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="flex-1 font-black">Needs you</h2>
            <Link href="/admin/reports" className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              All reports <ArrowRight className="size-3" />
            </Link>
          </div>
          <ul className="flex flex-col gap-1.5">
            {urgent.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/reports?id=${r.id}`} className="flex items-center gap-2 rounded-2xl px-2 py-1.5 hover:bg-muted">
                  <Pill tone="bad">urgent</Pill>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">
                      {r.reason} · {r.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.where} · {r.reporters} {r.reporters === 1 ? 'report' : 'reports'} · {r.at}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="flex-1 font-black">Latest actions</h2>
            <Link href="/admin/audit" className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              Audit log <ArrowRight className="size-3" />
            </Link>
          </div>
          <ul className="flex flex-col gap-1 text-sm">
            {AUDIT.slice(0, 5).map((a) => (
              <li key={a.at + a.target + a.action} className="flex gap-2 px-2 py-1">
                <span className="w-24 flex-none text-xs text-muted-foreground">{a.at}</span>
                <span className="min-w-0 truncate">
                  <b>{a.who}</b> · {a.action} · {a.target}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
