'use client';

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { PersonFace } from '@/components/PersonFace';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Server } from '@/lib/mock';
import { DmChat } from '@/features/dms/DmChat';
import { dmUnread, useDms } from '@/features/dms/useDms';
import { RoomChat } from '@/features/chat/RoomChat';

/** What the big chat panel shows: the room's chat, or a DM (by the other person's @handle). */
export interface ChatTarget {
  kind: 'channel' | 'dm';
  id: string;
}

const key = (t: ChatTarget) => `${t.kind}:${t.id}`;

/**
 * The big chat window: Room chat or a DM opened large (⤢ in the Chat panel) over the dimmed room,
 * for long reads and images. You're still in the room (voice keeps going); close it to be back in 3D.
 */
export function ChannelOverlay({ server, target, onClose }: { server: Server; target: ChatTarget | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      {target && <Body key={key(target)} server={server} initial={target} />}
    </Dialog>
  );
}

function Body({ server, initial }: { server: Server; initial: ChatTarget }) {
  // A room has one main chat (the mock servers' first chat stands in for it)
  const channels = server.channels.slice(0, 1);
  const [current, setCurrent] = useState(initial);
  const dms = useDms();
  // Switching tabs goes back to the chat you last had open there (or the first one)
  const [last, setLast] = useState<Record<ChatTarget['kind'], string | undefined>>({
    channel: server.channels[0]?.id,
    dm: dms.data?.[0]?.with.handle ?? undefined,
    [initial.kind]: initial.id,
  });
  const open = (t: ChatTarget) => {
    setCurrent(t);
    setLast((l) => ({ ...l, [t.kind]: t.id }));
  };
  const switchTab = (kind: ChatTarget['kind']) => {
    if (kind === current.kind) return;
    const id = last[kind] ?? (kind === 'dm' ? dms.data?.[0]?.with.handle : undefined) ?? undefined;
    if (id) setCurrent({ kind, id });
  };
  const serverUnread = channels.reduce((n, c) => n + (c.unread ?? 0), 0);
  const unreadDms = dmUnread(dms.data);
  const friend = current.kind === 'dm' ? dms.data?.find((d) => d.with.handle === current.id)?.with : undefined;
  const is = (kind: ChatTarget['kind'], id: string) => current.kind === kind && current.id === id;

  return (
    <DialogContent
      showCloseButton={false}
      className="flex h-[min(760px,88dvh)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-[2rem] p-0 sm:max-w-5xl"
    >
      <header className="flex items-center gap-3 border-b px-5 py-4">
        {current.kind === 'dm' ? (
          friend && <PersonFace who={friend} size={44} />
        ) : (
          <span className={cn('grid size-11 place-items-center rounded-2xl text-xl', server.tint)}>{server.emoji}</span>
        )}
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-xl font-black">
            {current.kind === 'dm' ? (friend?.name ?? `@${current.id}`) : 'Room chat'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {current.kind === 'dm' ? 'Direct message' : server.name} · you’re still in the room
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
          <Tabs tab={current.kind} onTab={switchTab} server={server} serverUnread={serverUnread} dmUnread={unreadDms} />
          <div className="flex flex-col gap-0.5">
            {current.kind === 'channel'
              ? channels.map((c) => (
                  <SideItem key={c.id} active={is('channel', c.id)} onClick={() => open({ kind: 'channel', id: c.id })} dot={!!c.unread}>
                    <MessageCircle className="size-4" />
                    <span className="flex-1 truncate">Room chat</span>
                  </SideItem>
                ))
              : dms.data?.map((d) => (
                  <SideItem
                    key={d.id}
                    active={is('dm', d.with.handle ?? '')}
                    onClick={() => d.with.handle && open({ kind: 'dm', id: d.with.handle })}
                    dot={d.unread > 0}
                  >
                    <PersonFace who={d.with} size={24} />
                    <span className="flex-1 truncate">{d.with.name}</span>
                  </SideItem>
                ))}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Phones: no sidebar, so the tabs sit on top and the list becomes chips */}
          <div className="flex flex-col gap-2 border-b p-2 sm:hidden">
            <Tabs tab={current.kind} onTab={switchTab} server={server} serverUnread={serverUnread} dmUnread={unreadDms} />
            <div className="flex gap-1 overflow-x-auto">
              {current.kind === 'channel'
                ? channels.map((c) => (
                    <Chip key={c.id} active={is('channel', c.id)} onClick={() => open({ kind: 'channel', id: c.id })}>
                      Room chat
                    </Chip>
                  ))
                : dms.data?.map((d) => (
                    <Chip
                      key={d.id}
                      active={is('dm', d.with.handle ?? '')}
                      onClick={() => d.with.handle && open({ kind: 'dm', id: d.with.handle })}
                    >
                      {d.with.name}
                    </Chip>
                  ))}
            </div>
          </div>
          {current.kind === 'channel' ? (
            <RoomChat key={key(current)} roomId={server.id} moderator={!!server.roles.me} />
          ) : (
            <DmChat key={key(current)} handle={current.id} />
          )}
        </div>
      </div>
    </DialogContent>
  );
}

/** Room chat or your DMs. */
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
    ...(server.channels.length ? [['channel', `${server.emoji} Room`, serverUnread] as const] : []),
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
