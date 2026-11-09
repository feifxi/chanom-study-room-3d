'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { ADMIN_ROOMS, type AdminRoom } from '@/features/admin/adminData';

const FILTERS = ['All', 'Listed in Discover', 'Reported', 'Closed'] as const;

/**
 * Every room (feature 14). The team doesn't run rooms (owners and mods do); it can only take a
 * room out of Discover (delist) or close it for breaking the platform rules.
 */
export default function RoomsPage() {
  const [rooms, setRooms] = useState(ADMIN_ROOMS);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const q = query.trim().toLowerCase();
  const shown = rooms.filter(
    (r) =>
      (!q || r.name.toLowerCase().includes(q) || r.owner.toLowerCase().includes(q)) &&
      (filter === 'All' ||
        (filter === 'Listed in Discover' && r.listed && r.state === 'ok') ||
        (filter === 'Reported' && r.reports > 0) ||
        (filter === 'Closed' && r.state === 'closed')),
  );
  const set = (r: AdminRoom, patch: Partial<AdminRoom>, msg: string) => {
    setRooms((all) => all.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
    toast.success(msg);
  };

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <AdminTitle title="Rooms" note="5,912 rooms · 213 with people inside now" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Room or owner" className="rounded-full pl-9" />
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
      <div className="overflow-x-auto rounded-3xl border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
            <tr className="border-b">
              <th className="px-3 py-2">Room</th>
              <th className="px-3 py-2">Who can join</th>
              <th className="px-3 py-2">Inside</th>
              <th className="px-3 py-2">Members</th>
              <th className="px-3 py-2">Reports</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <span className="block font-bold whitespace-nowrap">
                    {r.emoji} {r.name} {r.plus && <span className="text-[10px]">✨</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">by {r.owner}</span>
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">
                  {r.visibility}
                  {r.listed && r.state === 'ok' && <span className="block text-muted-foreground">in Discover</span>}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.inside}/{r.capacity}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.members.toLocaleString()}</td>
                <td className={cn('px-3 py-2 font-mono', r.reports > 2 && 'font-black text-destructive')}>{r.reports}</td>
                <td className="px-3 py-2">
                  <Pill tone={r.state === 'ok' ? 'ok' : r.state === 'delisted' ? 'warn' : 'bad'}>
                    {r.state === 'ok' ? 'fine' : r.state}
                  </Pill>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1.5 whitespace-nowrap">
                    {r.state === 'closed' ? (
                      <Action onClick={() => set(r, { state: 'ok' }, `${r.name} reopened`)}>Reopen</Action>
                    ) : (
                      <>
                        {r.listed &&
                          (r.state === 'delisted' ? (
                            <Action onClick={() => set(r, { state: 'ok' }, `${r.name} is back in Discover`)}>Relist</Action>
                          ) : (
                            <Action
                              onClick={() => set(r, { state: 'delisted' }, `${r.name} is out of Discover. The owner is emailed why.`)}
                            >
                              Delist
                            </Action>
                          ))}
                        <Action
                          danger
                          onClick={() =>
                            set(
                              r,
                              { state: 'closed', inside: 0 },
                              `${r.name} is closed. Everyone inside was moved out; the owner is emailed.`,
                            )
                          }
                        >
                          Close
                        </Action>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Action({ danger, onClick, children }: { danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-extrabold hover:bg-muted',
        danger && 'border-destructive/40 text-destructive hover:bg-destructive/10',
      )}
    >
      {children}
    </button>
  );
}
