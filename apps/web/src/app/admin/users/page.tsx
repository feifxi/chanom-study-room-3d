'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import {
  useAccountAction,
  useAdminAccount,
  useAdminAccounts,
  type AccountActionKind,
  type AccountFilter,
  type AdminAccount,
  type AdminAccountDetail,
} from '@/features/admin/useAdmin';
import { problem } from '@/features/rooms/useRooms';

const TONE: Record<AdminAccount['status'], 'ok' | 'warn' | 'bad' | 'muted'> = {
  active: 'ok',
  warned: 'warn',
  suspended: 'bad',
  banned: 'bad',
};
const FILTERS: [AccountFilter, string][] = [
  ['all', 'All'],
  ['reported', 'Reported'],
  ['restricted', 'Suspended or banned'],
  ['under18', 'Under 18'],
  ['plus', 'Plus'],
];
const DONE: Record<AccountActionKind, string> = {
  warn: 'warned',
  suspend_1d: 'suspended for 1 day',
  suspend_7d: 'suspended for 7 days',
  ban: 'banned',
  lift: 'back: suspension lifted',
  reset_name: 'name reset',
};
const KIND_LABEL: Record<string, string> = {
  warn: 'Warned',
  suspend: 'Suspended',
  ban: 'Banned',
  lift: 'Lifted',
  reset_name: 'Name reset',
};

const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Every account (feature 14). Account actions are the team's: warn, suspend 1 or 7 days, ban, lift,
 * reset name, each with a reason that's emailed to them (they reply to appeal) and kept in the audit
 * log. A suspension or ban signs them out everywhere at once. Room bans stay with each room's owner
 * and mods.
 */
export default function UsersPage() {
  return (
    <Suspense>
      <Users />
    </Suspense>
  );
}

function Users() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AccountFilter>('all');
  // "Open in the admin site" from a person's menu in a room links here with ?user=<id>
  const [picked, setPicked] = useState<string | null>(useSearchParams().get('user'));
  const list = useAdminAccounts(query.trim(), filter);
  const accounts = list.data?.accounts ?? [];
  const current = useAdminAccount(picked).data;

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <AdminTitle
        title="Users"
        note={
          list.data
            ? `${list.data.total.toLocaleString('en')} ${list.data.total === 1 ? 'account' : 'accounts'}${filter === 'all' ? '' : ' match'}`
            : 'Loading…'
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or @handle" className="rounded-full pl-9" />
        </div>
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn('rounded-full px-3 py-1 text-xs font-bold', filter === id ? 'bg-primary text-primary-foreground' : 'bg-muted')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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
              {accounts.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setPicked(a.id)}
                  className={cn('cursor-pointer border-b last:border-0 hover:bg-muted/60', picked === a.id && 'bg-secondary/40')}
                >
                  <td className="px-3 py-2">
                    <span className="block font-bold">
                      {a.name} {a.plus && <span className="text-[10px]">✨</span>}
                      {a.team && <span className="ml-1 rounded-full bg-mint px-1.5 text-[10px] font-black text-mint-ink">team</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{a.handle ? `@${a.handle}` : 'signing up'}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Pill tone={TONE[a.status]}>{a.status}</Pill>
                  </td>
                  <td className={cn('px-3 py-2 font-mono', a.reports > 2 && 'font-black text-destructive')}>{a.reports}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{day(a.joinedAt)}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{a.lastSeenAt ? when(a.lastSeenAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.data && !accounts.length && <p className="py-8 text-center text-sm text-muted-foreground">Nobody matches.</p>}
          {list.data && list.data.total > accounts.length && (
            <p className="border-t py-2 text-center text-xs text-muted-foreground">
              Newest {accounts.length} shown. Search to find others.
            </p>
          )}
        </div>

        {current ? (
          <AccountPanel key={current.id} account={current} />
        ) : (
          <p className="self-start rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Pick someone to see their account and actions.
          </p>
        )}
      </div>
    </div>
  );
}

function AccountPanel({ account: a }: { account: AdminAccountDetail }) {
  const [reason, setReason] = useState('');
  const action = useAccountAction();
  const restricted = a.status === 'suspended' || a.status === 'banned';
  const act = (kind: AccountActionKind) =>
    action.mutate(
      { id: a.id, kind, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(`${a.name}: ${DONE[kind]}. Emailed with the reason.`);
          setReason('');
        },
        onError: (e) => toast.error(problem(e)),
      },
    );
  const ready = reason.trim().length >= 3 && !action.isPending;

  return (
    <section className="flex flex-col gap-3 self-start rounded-3xl border bg-card p-4 lg:sticky lg:top-4">
      <div>
        <h2 className="text-xl font-black">{a.name}</h2>
        <p className="text-sm text-muted-foreground">
          {a.handle ? `@${a.handle}` : 'signing up'} · {a.email} · signs in with {a.signIn.join(', ')} · {a.age}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {(
          [
            ['Status', a.until ? `Suspended until ${when(a.until)}` : a.status],
            ['Plan', a.plus ? 'Plus' : 'Free'],
            ['Rooms owned', String(a.roomsOwned)],
            ['Reports against', String(a.reports)],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">{k}</dt>
            <dd className="font-bold first-letter:uppercase">{v}</dd>
          </div>
        ))}
      </dl>
      {a.team ? (
        <p className="rounded-2xl bg-muted p-3 text-sm">
          On the Connecta team. Take them off the team first (the team script) to act on them.
        </p>
      ) : (
        <div className="flex flex-col gap-2 border-t pt-3">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Reason (emailed to them; they reply to appeal)"
            className="rounded-xl"
          />
          <div className="flex flex-wrap gap-2">
            {restricted ? (
              <Button variant="outline" disabled={!ready} className="rounded-full font-extrabold" onClick={() => act('lift')}>
                {a.status === 'banned' ? 'Unban' : 'Lift suspension'}
              </Button>
            ) : (
              <>
                <Button variant="outline" disabled={!ready} className="rounded-full font-extrabold" onClick={() => act('warn')}>
                  Warn
                </Button>
                <Button variant="outline" disabled={!ready} className="rounded-full font-extrabold" onClick={() => act('suspend_1d')}>
                  Suspend 1 day
                </Button>
                <Button
                  variant="outline"
                  disabled={!ready}
                  className="rounded-full border-destructive/40 font-extrabold text-destructive"
                  onClick={() => act('suspend_7d')}
                >
                  Suspend 7 days
                </Button>
                <Button
                  variant="outline"
                  disabled={!ready}
                  className="rounded-full border-destructive/40 font-extrabold text-destructive"
                  onClick={() => act('ban')}
                >
                  Ban
                </Button>
              </>
            )}
            <Button variant="ghost" disabled={!ready} className="rounded-full font-bold" onClick={() => act('reset_name')}>
              Reset name
            </Button>
          </div>
        </div>
      )}
      {a.actions.length > 0 && (
        <div className="border-t pt-3">
          <p className="mb-1.5 text-[11px] font-black tracking-wider text-muted-foreground uppercase">Earlier actions</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {a.actions.map((x, i) => (
              <li key={i}>
                <span className="font-bold">{KIND_LABEL[x.kind] ?? x.kind}</span>
                {x.until && ` until ${when(x.until)}`} · {x.reason}
                <span className="block text-xs text-muted-foreground">
                  {x.by} · {when(x.at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        No automatic strikes: the team decides each case. Every action is emailed with the reason (reply to appeal) and goes in the audit
        log. A suspension or ban signs them out everywhere at once.
      </p>
    </section>
  );
}
