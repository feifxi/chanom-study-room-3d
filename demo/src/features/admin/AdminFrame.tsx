'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flag, Gauge, Home, LayoutTemplate, Lock, Map as MapIcon, ScrollText, ShieldAlert, Users, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setViewer, useViewer } from '@/lib/viewer';
import { REPORTS } from './adminData';

const NAV = [
  { href: '/admin', label: 'Overview', icon: Gauge },
  { href: '/admin/reports', label: 'Reports', icon: Flag, badge: REPORTS.filter((r) => r.status === 'open').length },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/rooms', label: 'Rooms', icon: Warehouse },
  { href: '/admin/common', label: 'Common rooms', icon: LayoutTemplate },
  { href: '/admin/moderation', label: 'Moderation', icon: ShieldAlert },
  { href: '/admin/maps', label: 'Maps', icon: MapIcon },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
];

/**
 * The admin site's frame: a side list of sections over the plain app background. Only Connecta team
 * accounts get in; everyone else sees a wall (the real app answers 404 so it isn't advertised).
 */
export function AdminFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const viewer = useViewer();
  if (viewer !== 'admin') return <TeamOnly />;
  return (
    <div className="flex h-dvh bg-background max-md:flex-col">
      <aside className="flex flex-none flex-col gap-1 border-r bg-card p-3 max-md:flex-row max-md:overflow-x-auto max-md:border-r-0 max-md:border-b md:w-56">
        <p className="flex items-center gap-1.5 px-2 pb-2 text-[11px] font-black tracking-wider whitespace-nowrap text-muted-foreground uppercase max-md:hidden">
          <Lock className="size-3" /> Connecta team
        </p>
        {NAV.map((n) => {
          const active = n.href === '/admin' ? path === '/admin' : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'flex flex-none items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold whitespace-nowrap',
                active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <n.icon className="size-4" /> {n.label}
              {!!n.badge && (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                  {n.badge}
                </span>
              )}
            </Link>
          );
        })}
        <Link
          href="/home"
          className="mt-auto flex flex-none items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-bold whitespace-nowrap text-muted-foreground hover:bg-muted max-md:mt-0"
        >
          <Home className="size-4" /> Back to Connecta
        </Link>
      </aside>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function TeamOnly() {
  return (
    <div className="grid h-dvh place-items-center p-4">
      <div className="panel flex max-w-sm flex-col items-center gap-3 p-6 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-black">Connecta team only</h1>
        <p className="text-sm text-muted-foreground">
          The admin site is for team accounts. In the real app this address shows “page not found” to everyone else.
        </p>
        <button
          onClick={() => setViewer('admin')}
          className="rounded-full border border-dashed border-primary px-4 py-2 text-sm font-extrabold"
        >
          Demo: view as the Connecta team
        </button>
      </div>
    </div>
  );
}

/** A page's title row, the same on every admin page. */
export function AdminTitle({ title, note, children }: { title: string; note?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-black tracking-[-0.02em]">{title}</h1>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>
      {children}
    </div>
  );
}

/** Small coloured pill for statuses (open, suspended, delisted…). */
export function Pill({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'muted' | 'info'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex flex-none items-center rounded-full px-2 py-0.5 text-[11px] font-black whitespace-nowrap',
        tone === 'ok' && 'bg-mint text-mint-ink',
        tone === 'warn' && 'bg-peach text-peach-ink',
        tone === 'bad' && 'bg-destructive/15 text-destructive',
        tone === 'muted' && 'bg-muted text-muted-foreground',
        tone === 'info' && 'bg-sky text-sky-ink',
      )}
    >
      {children}
    </span>
  );
}
