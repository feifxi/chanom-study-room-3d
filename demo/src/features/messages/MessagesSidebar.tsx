'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { DMS, USERS, serverById, userById } from '@/lib/mock';

/**
 * Messages, left side: your conversations (newest first, unread in bold), then the friends you
 * haven't messaged yet so starting a chat is one tap. Each friend shows where they are right now,
 * since "where are you?" is half of what DMs here are for.
 */
export function MessagesSidebar({ className }: { className?: string }) {
  const { id } = useParams<{ id?: string }>();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const match = (name: string) => !q || name.toLowerCase().includes(q);
  const talked = new Set(DMS.map((d) => d.with));
  const others = Object.values(USERS).filter((u) => !talked.has(u.id) && match(u.name));

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
        {DMS.filter((d) => match(userById(d.with).name)).map((d) => {
          const u = userById(d.with);
          const last = d.messages.at(-1);
          return (
            <Link
              key={d.id}
              href={`/home/messages/${d.id}`}
              className={cn('flex items-center gap-2.5 rounded-2xl px-2 py-2', id === d.id ? 'bg-card shadow-sm' : 'hover:bg-card/60')}
            >
              <UserAvatar user={u} size={40} presence />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={cn('truncate text-sm', d.unread ? 'font-black' : 'font-bold')}>{u.name}</span>
                  <span className="ml-auto flex-none text-[11px] text-muted-foreground">{last?.at}</span>
                </span>
                <span className={cn('block truncate text-xs', d.unread ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                  {last?.author === 'me' && 'You: '}
                  {last?.text}
                </span>
                <Where userId={u.id} />
              </span>
              {!!d.unread && (
                <span className="grid h-5 min-w-5 flex-none place-items-center rounded-full bg-primary px-1.5 text-[11px] font-black text-primary-foreground">
                  {d.unread}
                </span>
              )}
            </Link>
          );
        })}
        {others.length > 0 && (
          <>
            <p className="mt-3 px-2 pb-1 text-[11px] font-black tracking-wider text-muted-foreground uppercase">Friends</p>
            {others.map((u) => (
              <Link
                key={u.id}
                href={`/home/messages/${u.id}`}
                className={cn('flex items-center gap-2.5 rounded-2xl px-2 py-1.5', id === u.id ? 'bg-card shadow-sm' : 'hover:bg-card/60')}
              >
                <UserAvatar user={u} size={32} presence />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{u.name}</span>
                  <Where userId={u.id} />
                </span>
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}

/** "in 🍓 Chanom Friends" under a friend who's in a room right now. */
function Where({ userId }: { userId: string }) {
  const at = userById(userId).inRoom;
  const room = at && serverById(at.serverId);
  if (!room) return null;
  return (
    <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-bold text-mint-ink">
      <span className="size-1.5 flex-none rounded-full bg-online" /> in {room.emoji} {room.name}
    </span>
  );
}
