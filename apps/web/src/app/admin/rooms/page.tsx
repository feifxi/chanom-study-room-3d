'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AdminTitle, Pill } from '@/features/admin/AdminFrame';
import { useAdminRooms, useRoomAction, type AdminRoom, type RoomActionKind, type RoomFilter } from '@/features/admin/useAdmin';
import { problem } from '@/features/rooms/useRooms';

const FILTERS: [RoomFilter, string][] = [
  ['all', 'All'],
  ['listed', 'Listed in Discover'],
  ['reported', 'Reported'],
  ['closed', 'Closed'],
];
const WHO: Record<AdminRoom['visibility'], string> = { private: 'Invite only', request: 'Ask to join', open: 'Open' };
const ASK: Record<RoomActionKind, { title: (name: string) => string; note: string; button: string; done: string; danger?: boolean }> = {
  delist: {
    title: (n) => `Take ${n} off Discover?`,
    note: 'Members and invite links still work. The owner is emailed the reason.',
    button: 'Delist',
    done: 'is off Discover. The owner is emailed why.',
  },
  relist: { title: (n) => `Put ${n} back on Discover?`, note: 'The owner is emailed.', button: 'Relist', done: 'is back on Discover.' },
  close: {
    title: (n) => `Close ${n}?`,
    note: 'Everyone inside is moved out; nobody can walk in or chat until it’s reopened. Members and messages stay. The owner is emailed the reason.',
    button: 'Close room',
    done: 'is closed. Everyone inside was moved out; the owner is emailed.',
    danger: true,
  },
  reopen: {
    title: (n) => `Reopen ${n}?`,
    note: 'Everyone can walk in again, and it’s back on Discover if it was listed. The owner is emailed.',
    button: 'Reopen',
    done: 'is open again.',
  },
};

/**
 * Every room (docs/features/16-admin.md). The team doesn't run rooms (owners and mods do); it can only take a
 * room out of Discover (delist) or close it for breaking the platform rules, and undo either.
 */
export default function RoomsPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RoomFilter>('all');
  const [asking, setAsking] = useState<{ room: AdminRoom; kind: RoomActionKind } | null>(null);
  const list = useAdminRooms(query.trim(), filter);
  const rooms = list.data?.rooms ?? [];
  const inside = rooms.filter((r) => r.inside > 0).length;

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <AdminTitle
        title="Rooms"
        note={
          list.data
            ? `${list.data.total.toLocaleString('en')} ${list.data.total === 1 ? 'room' : 'rooms'}${filter === 'all' ? '' : ' match'} · ${inside} shown with people inside now`
            : 'Loading…'
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Room or owner" className="rounded-full pl-9" />
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
            {rooms.map((r) => {
              const listed = r.visibility !== 'private';
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <span className="block font-bold whitespace-nowrap">
                      {r.emoji} {r.name} {r.plus && <span className="text-[10px]">✨</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{r.owner ? `by ${r.owner.name} @${r.owner.handle}` : 'no owner'}</span>
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {WHO[r.visibility]}
                    {listed && r.state === 'ok' && <span className="block text-muted-foreground">in Discover</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.inside}/{r.capacity}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.members.toLocaleString('en')}</td>
                  <td className={cn('px-3 py-2 font-mono', r.reports > 2 && 'font-black text-destructive')}>{r.reports}</td>
                  <td className="px-3 py-2">
                    <Pill tone={r.state === 'ok' ? 'ok' : r.state === 'delisted' ? 'warn' : 'bad'}>
                      {r.state === 'ok' ? 'fine' : r.state}
                    </Pill>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1.5 whitespace-nowrap">
                      {r.state === 'closed' ? (
                        <Action onClick={() => setAsking({ room: r, kind: 'reopen' })}>Reopen</Action>
                      ) : (
                        <>
                          {r.state === 'delisted' ? (
                            <Action onClick={() => setAsking({ room: r, kind: 'relist' })}>Relist</Action>
                          ) : (
                            listed && <Action onClick={() => setAsking({ room: r, kind: 'delist' })}>Delist</Action>
                          )}
                          <Action danger onClick={() => setAsking({ room: r, kind: 'close' })}>
                            Close
                          </Action>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.data && !rooms.length && <p className="py-8 text-center text-sm text-muted-foreground">No rooms match.</p>}
        {list.data && list.data.total > rooms.length && (
          <p className="border-t py-2 text-center text-xs text-muted-foreground">Newest {rooms.length} shown. Search to find others.</p>
        )}
      </div>
      {asking && <AskReason key={`${asking.room.id}:${asking.kind}`} {...asking} onClose={() => setAsking(null)} />}
    </div>
  );
}

/** Every room action is emailed to the owner with a reason, and kept in the audit log */
function AskReason({ room, kind, onClose }: { room: AdminRoom; kind: RoomActionKind; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const action = useRoomAction();
  const ask = ASK[kind];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>{ask.title(room.name)}</DialogTitle>
          <DialogDescription>{ask.note}</DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Reason (emailed to the owner)"
          className="rounded-xl"
        />
        <DialogFooter>
          <Button variant="ghost" className="rounded-full font-bold" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={ask.danger ? 'destructive' : 'default'}
            disabled={reason.trim().length < 3 || action.isPending}
            className="rounded-full font-extrabold"
            onClick={() =>
              action.mutate(
                { id: room.id, kind, reason: reason.trim() },
                {
                  onSuccess: () => {
                    toast.success(`${room.name} ${ask.done}`);
                    onClose();
                  },
                  onError: (e) => toast.error(problem(e)),
                },
              )
            }
          >
            {ask.button}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
