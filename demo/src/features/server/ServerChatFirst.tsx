'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Hash } from 'lucide-react';
import { Composer, MessageList } from '@/components/chat/Chat';
import { MembersPanel } from '@/components/server/MembersPanel';
import { AvatarStack } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { MAPS, channelMessages, userById, type Message, type Server } from '@/lib/mock';

/**
 * Server home, Chat-first design: closest to Discord. The rooms are a strip of "voice channels" on
 * top (who's inside, one tap to walk in), and #general is right there below, so a server mostly
 * used for chatting doesn't make you click through a landing page.
 */
export function ServerChatFirst({ server }: { server: Server }) {
  const general = server.channels[0];
  const [sent, setSent] = useState<Message[]>([]);

  return (
    <>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex gap-2 overflow-x-auto border-b p-3">
          {server.rooms.map((r) => {
            const map = MAPS.find((m) => m.id === r.mapId)!;
            const people = r.people.map(userById);
            return (
              <Link
                key={r.id}
                href={`/servers/${server.id}/rooms/${r.id}`}
                className={cn(
                  'group flex flex-none items-center gap-2.5 rounded-2xl border px-3 py-2 hover:shadow-soft',
                  people.length ? 'border-primary/40 bg-secondary/50' : 'bg-background/60',
                )}
              >
                <span className={cn('grid size-9 place-items-center rounded-xl text-lg', map.tint)}>{map.emoji}</span>
                <span>
                  <span className="block text-sm font-black">{r.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {people.length ? `${people.length} inside${r.happening ? ` · ${r.happening}` : ''}` : 'Empty'}
                  </span>
                </span>
                {people.length > 0 && <AvatarStack users={people} size={24} />}
                <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-extrabold text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  Walk in
                </span>
              </Link>
            );
          })}
        </div>
        {general ? (
          <>
            <header className="flex items-center gap-2 px-4 pt-3">
              <Hash className="size-4 text-muted-foreground" />
              <span className="font-black">{general.name}</span>
              <span className="truncate text-xs text-muted-foreground">{general.topic}</span>
            </header>
            <MessageList messages={[...channelMessages(server.id, general.id), ...sent]} className="min-h-0 flex-1 overflow-y-auto" />
            <div className="p-3">
              <Composer
                placeholder={`Message #${general.name}`}
                onSend={(text) => setSent((s) => [...s, { id: `${Date.now()}`, author: 'me', at: 'Now', text }])}
              />
            </div>
          </>
        ) : (
          <p className="p-6 text-muted-foreground">No chats yet.</p>
        )}
      </section>
      <MembersPanel server={server} />
    </>
  );
}
