'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { ACCOUNTS, type Account, type AccountStatus } from '@/features/admin/adminData';

const TONE: Record<AccountStatus, 'ok' | 'warn' | 'bad' | 'muted'> = { active: 'ok', warned: 'warn', suspended: 'bad', banned: 'bad' };
const FILTERS = ['All', 'Reported', 'Suspended or banned', 'Under 18', 'Plus'] as const;

/**
 * Every account (feature 14). Account actions are the team's: warn, suspend 1 or 7 days, ban for
 * good, each with a reason that's emailed to them (they reply to appeal). Room bans stay with each
 * room's owner and mods.
 */
export default function UsersPage() {
  const [accounts, setAccounts] = useState(ACCOUNTS);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [picked, setPicked] = useState<string | null>(null);
  const q = query.trim().toLowerCase().replace(/^@/, '');
  const shown = accounts.filter(
    (a) =>
      (!q || a.name.toLowerCase().includes(q) || a.handle.includes(q)) &&
      (filter === 'All' ||
        (filter === 'Reported' && a.reports > 0) ||
        (filter === 'Suspended or banned' && (a.status === 'suspended' || a.status === 'banned')) ||
        (filter === 'Under 18' && a.age === 'under 18') ||
        (filter === 'Plus' && a.plus)),
  );
  const current = accounts.find((a) => a.id === picked);

  const act = (a: Account, status: AccountStatus, note: string) => {
    setAccounts((all) => all.map((x) => (x.id === a.id ? { ...x, status, statusNote: note } : x)));
    toast.success(`${a.name}: ${note.toLowerCase()}. Emailed with the reason.`);
  };

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <AdminTitle title="Users" note="48,213 accounts · 1,284 online now" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or @handle" className="rounded-full pl-9" />
        </div>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('rounded-full px-3 py-1 text-xs font-bold', filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted')}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="overflow-x-auto rounded-3xl border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
              <tr className="border-b">
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Reports</th>
                <th className="px-3 py-2">Joined</th>
                <th className="px-3 py-2">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setPicked(a.id)}
                  className={cn('cursor-pointer border-b last:border-0 hover:bg-muted/60', picked === a.id && 'bg-secondary/40')}
                >
                  <td className="px-3 py-2">
                    <span className="block font-bold">
                      {a.name} {a.plus && <span className="text-[10px]">✨</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">@{a.handle}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Pill tone={TONE[a.status]}>{a.status}</Pill>
                  </td>
                  <td className={cn('px-3 py-2 font-mono', a.reports > 2 && 'font-black text-destructive')}>{a.reports}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{a.joined}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{a.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="py-8 text-center text-sm text-muted-foreground">Nobody matches.</p>}
        </div>

        {current ? (
          <section className="flex flex-col gap-3 self-start rounded-3xl border bg-card p-4 lg:sticky lg:top-4">
            <div>
              <h2 className="text-xl font-black">{current.name}</h2>
              <p className="text-sm text-muted-foreground">
                @{current.handle} · signs in with {current.signIn} · {current.age}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {(
                [
                  ['Status', current.statusNote ?? current.status],
                  ['Plan', current.plus ? 'Plus' : 'Free'],
                  ['Rooms owned', String(current.rooms)],
                  ['Reports against', String(current.reports)],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">{k}</dt>
                  <dd className="font-bold capitalize">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2 border-t pt-3">
              {current.status === 'banned' || current.status === 'suspended' ? (
                <Button variant="outline" className="rounded-full font-extrabold" onClick={() => act(current, 'active', 'Lifted')}>
                  {current.status === 'banned' ? 'Unban' : 'Lift suspension'}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="rounded-full font-extrabold"
                    onClick={() => act(current, 'warned', 'Warned just now')}
                  >
                    Warn
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full font-extrabold"
                    onClick={() => act(current, 'suspended', 'Suspended 1 day')}
                  >
                    Suspend 1 day
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-destructive/40 font-extrabold text-destructive"
                    onClick={() => act(current, 'suspended', 'Suspended 7 days')}
                  >
                    Suspend 7 days
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-destructive/40 font-extrabold text-destructive"
                    onClick={() => act(current, 'banned', 'Banned for good')}
                  >
                    Ban
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                className="rounded-full font-bold"
                onClick={() => toast('Name reset to “user48213”; they pick a new one next time')}
              >
                Reset name
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No automatic strikes: the team decides each case. Every action is emailed with the reason (reply to appeal) and goes in the
              audit log.
            </p>
          </section>
        ) : (
          <p className="self-start rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Pick someone to see their account and actions.
          </p>
        )}
      </div>
    </div>
  );
}
