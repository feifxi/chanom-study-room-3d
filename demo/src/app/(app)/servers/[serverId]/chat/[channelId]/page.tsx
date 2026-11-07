'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Bell, Hash, Pin, Search, Users } from 'lucide-react';
import { Composer, MessageList } from '@/components/chat/Chat';
import { MembersPanel } from '@/components/server/MembersPanel';
import { Button } from '@/components/ui/button';
import { channelMessages, serverById, type Message } from '@/lib/mock';

/** A text channel: header with topic and tools, messages, the composer. Members can be hidden. */
export default function ChannelPage() {
  const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>();
  const server = serverById(serverId)!;
  const channel = server.channels.find((c) => c.id === channelId) ?? { id: channelId, name: channelId, topic: '' };
  const [messages, setMessages] = useState<Message[]>(() => channelMessages(serverId, channelId));
  const [members, setMembers] = useState(true);

  return (
    <>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-3">
          <span className="grid size-9 place-items-center rounded-xl bg-muted">
            <Hash className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-black">{channel.name}</p>
            <p className="truncate text-xs text-muted-foreground">{channel.topic}</p>
          </div>
          <Button size="icon" variant="ghost" className="rounded-full" aria-label="Notifications">
            <Bell />
          </Button>
          <Button size="icon" variant="ghost" className="rounded-full" aria-label="Pinned">
            <Pin />
          </Button>
          <Button
            size="icon"
            variant={members ? 'secondary' : 'ghost'}
            className="rounded-full"
            aria-label="Members"
            onClick={() => setMembers(!members)}
          >
            <Users />
          </Button>
          <Button size="icon" variant="ghost" className="rounded-full" aria-label="Search">
            <Search />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="px-6 pt-8">
            <span className="grid size-16 place-items-center rounded-3xl bg-secondary text-3xl text-secondary-foreground">
              <Hash className="size-8" />
            </span>
            <p className="mt-3 text-2xl font-black">Welcome to #{channel.name}</p>
            <p className="text-sm text-muted-foreground">This is the start of the chat in {server.name}.</p>
          </div>
          <MessageList messages={messages} />
        </div>
        <div className="p-3">
          <Composer
            placeholder={`Message #${channel.name}`}
            onSend={(text) => setMessages([...messages, { id: String(Date.now()), author: 'me', at: 'Now', text }])}
          />
        </div>
      </section>
      {members && <MembersPanel server={server} />}
    </>
  );
}
