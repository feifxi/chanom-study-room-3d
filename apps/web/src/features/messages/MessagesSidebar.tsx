'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { PersonFace } from '@/components/PersonFace';
import { lastLine, useDms } from '@/features/dms/useDms';
import { useFriends } from '@/features/friends/useFriends';
import { chatTime } from '@/features/chat/RoomChat';
import { cn } from '@/lib/utils';

/**
 * Messages, left side: your conversations (newest first, unread in bold), then the friends you
 * haven't messaged yet so starting a chat is one tap. Where each friend is comes with presence.
 */
export function MessagesSidebar({ className }: { className?: string }) {
  const { handle } = useParams<{ handle?: string }>();
  const dms = useDms();
  const friends = useFriends();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const match = (p: { name: string; handle: string | null }) => !q || p.name.toLowerCase().includes(q) || !!p.handle?.includes(q);
  const talked = new Set(dms.data?.map((d) => d.with.id));
  const others = (friends.data ?? []).filter((f) => !talked.has(f.person.id) && match(f.person));
  const list = (dms.data ?? []).filter((d) => match(d.with));

  return (
    <aside className={cn('flex flex-col gap-2 border-r bg-muted/30 p-3', className)}>
      <h1 className="px-1 text-xl font-black">Messages</h1>
      <label className="flex h-9 items-center gap-2 rounded-xl bg-card px-3 focus-within:ring-2 focus-within:ring-primary/40">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a friend"
          aria-label="Find a friend"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      <nav className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
        {dms.isPending && <p className="px-2 py-3 text-sm text-muted-foreground">Loading your messages…</p>}
        {list.map((d) => (
          <Link
            key={d.id}
            href={`/home/messages/${d.with.handle}`}
            className={cn(
              'flex items-center gap-2.5 rounded-2xl px-2 py-2',
              handle === d.with.handle ? 'bg-card shadow-sm' : 'hover:bg-card/60',
            )}
          >
            <PersonFace who={d.with} size={40} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className={cn('truncate text-sm', d.unread ? 'font-black' : 'font-bold')}>{d.with.name}</span>
                <span className="ml-auto flex-none text-[11px] text-muted-foreground">{d.last && chatTime(d.last.createdAt)}</span>
              </span>
              <span className={cn('block truncate text-xs', d.unread ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                {lastLine(d)}
              </span>
            </span>
            {d.unread > 0 && (
              <span className="grid h-5 min-w-5 flex-none place-items-center rounded-full bg-primary px-1.5 text-[11px] font-black text-primary-foreground">
                {d.unread}
              </span>
            )}
          </Link>
        ))}
        {others.length > 0 && (
          <>
            <p className="mt-3 px-2 pb-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">Friends</p>
            {others.map(({ person }) => (
              <Link
                key={person.id}
                href={`/home/messages/${person.handle}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-2xl px-2 py-1.5',
                  handle === person.handle ? 'bg-card shadow-sm' : 'hover:bg-card/60',
                )}
              >
                <PersonFace who={person} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{person.name}</span>
              </Link>
            ))}
          </>
        )}
        {!dms.isPending && !list.length && !others.length && (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {q ? 'Nobody by that name.' : 'Add a friend to start messaging. DMs are just for friends.'}
          </p>
        )}
      </nav>
    </aside>
  );
}
