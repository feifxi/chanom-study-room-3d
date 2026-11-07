'use client';

import { useState } from 'react';
import { Hash, X } from 'lucide-react';
import { Composer, MessageList } from '@/components/chat/Chat';
import { UserAvatar } from '@/components/UserAvatar';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { DMS, channelMessages, userById, type Message, type Server } from '@/lib/mock';

/** What the big chat panel shows: one of the server's chats, or a DM. */
export interface ChatTarget {
  kind: 'channel' | 'dm';
  id: string;
}

const key = (t: ChatTarget) => `${t.kind}:${t.id}`;

/**
 * A chat opened from inside a room: a big panel over the dimmed room. The left side has the same
 * Server / Messages tabs as the room card. You're still in the room (voice keeps going); close it to be back in 3D.
 */
export function ChannelOverlay({ server, target, onClose }: { server: Server; target: ChatTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      {target && <Body key={key(target)} server={server} initial={target} />}
    </Dialog>
  );
}

function Body({ server, initial }: { server: Server; initial: ChatTarget }) {
  const [current, setCurrent] = useState(initial);
  // Switching tabs goes back to the chat you last had open there (or the first one)
  const [last, setLast] = useState<Record<ChatTarget['kind'], string | undefined>>({
    channel: server.channels[0]?.id,
    dm: DMS[0]?.id,
    [initial.kind]: initial.id,
  });
  const open = (t: ChatTarget) => {
    setCurrent(t);
    setLast((l) => ({ ...l, [t.kind]: t.id }));
  };
  const switchTab = (kind: ChatTarget['kind']) => {
    if (kind === current.kind) return;
    const id = last[kind];
    if (id) setCurrent({ kind, id });
  };
  const serverUnread = server.channels.reduce((n, c) => n + (c.unread ?? 0), 0);
  const dmUnread = DMS.reduce((n, d) => n + (d.unread ?? 0), 0);
  const [sent, setSent] = useState<Record<string, Message[]>>({});
  const dm = current.kind === 'dm' ? DMS.find((d) => d.id === current.id) : undefined;
  const friend = dm ? userById(dm.with) : undefined;
  const base = dm ? dm.messages : channelMessages(server.id, current.id);
  const messages = [...base, ...(sent[key(current)] ?? [])];
  const is = (kind: ChatTarget['kind'], id: string) => current.kind === kind && current.id === id;

  return (
    <DialogContent
      showCloseButton={false}
      className="flex h-[min(760px,88dvh)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-[2rem] p-0 sm:max-w-5xl"
    >
      <header className="flex items-center gap-3 border-b px-5 py-4">
        {friend ? (
          <UserAvatar user={friend} size={44} presence />
        ) : (
          <span className={cn('grid size-11 place-items-center rounded-2xl text-xl', server.tint)}>{server.emoji}</span>
        )}
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-xl font-black">{friend ? friend.name : `# ${current.id}`}</DialogTitle>
          <DialogDescription className="text-sm">
            {friend ? (friend.activity ?? 'Direct message') : server.name} · you’re still in the room
          </DialogDescription>
        </div>
        <DialogClose
          className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-5" />
        </DialogClose>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 flex-none flex-col gap-2 overflow-y-auto bg-secondary/40 p-3 sm:flex">
          <Tabs tab={current.kind} onTab={switchTab} server={server} serverUnread={serverUnread} dmUnread={dmUnread} />
          <div className="flex flex-col gap-0.5">
            {current.kind === 'channel'
              ? server.channels.map((c) => (
                  <SideItem key={c.id} active={is('channel', c.id)} onClick={() => open({ kind: 'channel', id: c.id })} dot={!!c.unread}>
                    <Hash className="size-4" />
                    <span className="flex-1 truncate">{c.name}</span>
                  </SideItem>
                ))
              : DMS.map((d) => {
                  const u = userById(d.with);
                  return (
                    <SideItem key={d.id} active={is('dm', d.id)} onClick={() => open({ kind: 'dm', id: d.id })} dot={!!d.unread}>
                      <UserAvatar user={u} size={24} presence />
                      <span className="flex-1 truncate">{u.name}</span>
                    </SideItem>
                  );
                })}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Phones: no sidebar, so the tabs sit on top and the list becomes chips */}
          <div className="flex flex-col gap-2 border-b p-2 sm:hidden">
            <Tabs tab={current.kind} onTab={switchTab} server={server} serverUnread={serverUnread} dmUnread={dmUnread} />
            <div className="flex gap-1 overflow-x-auto">
              {current.kind === 'channel'
                ? server.channels.map((c) => (
                    <Chip key={c.id} active={is('channel', c.id)} onClick={() => open({ kind: 'channel', id: c.id })}>
                      # {c.name}
                    </Chip>
                  ))
                : DMS.map((d) => (
                    <Chip key={d.id} active={is('dm', d.id)} onClick={() => open({ kind: 'dm', id: d.id })}>
                      {userById(d.with).name}
                    </Chip>
                  ))}
            </div>
          </div>
          <MessageList messages={messages} className="min-h-0 flex-1 overflow-y-auto" />
          <div className="p-3">
            <Composer
              placeholder={friend ? `Message ${friend.name}` : `Message #${current.id}`}
              onSend={(text) =>
                setSent((s) => ({
                  ...s,
                  [key(current)]: [...(s[key(current)] ?? []), { id: `${Date.now()}`, author: 'me', at: 'Now', text }],
                }))
              }
            />
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

/** Same two tabs as the room card: the server's chats, or your DMs. */
function Tabs({
  tab,
  onTab,
  server,
  serverUnread,
  dmUnread,
}: {
  tab: ChatTarget['kind'];
  onTab: (kind: ChatTarget['kind']) => void;
  server: Server;
  serverUnread: number;
  dmUnread: number;
}) {
  const tabs = [
    ...(server.channels.length ? [['channel', `${server.emoji} Server`, serverUnread] as const] : []),
    ['dm', 'Messages', dmUnread] as const,
  ];
  return (
    <div className={cn('grid gap-1 rounded-2xl bg-muted p-1', tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
      {tabs.map(([id, label, unread]) => (
        <button
          key={id}
          onClick={() => onTab(id)}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-sm font-extrabold',
            tab === id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
          {!!unread && tab !== id && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-black text-primary-foreground">{unread}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function SideItem({ active, onClick, dot, children }: { active: boolean; onClick: () => void; dot?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-xl px-3 py-2 text-left font-bold',
        active ? 'bg-card shadow-sm' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
      )}
    >
      {children}
      {dot && !active && <span className="size-2 rounded-full bg-primary" />}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn('flex-none rounded-full px-3 py-1 text-xs font-bold', active ? 'bg-primary text-primary-foreground' : 'bg-muted')}
    >
      {children}
    </button>
  );
}
