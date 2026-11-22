'use client';

import { useState } from 'react';
import { ChevronLeft, Maximize2, X } from 'lucide-react';
import { Composer } from '@/components/chat/Chat';
import { BUBBLE_MAX } from '../room3d/roomSession';
import { cn } from '@/lib/utils';
import type { Server } from '@/lib/mock';
import { PersonFace } from '@/components/PersonFace';
import { FriendFace } from '@/features/presence/FriendFace';
import { DmChat } from '@/features/dms/DmChat';
import { dmUnread as dmUnreadOf, lastLine, useDms } from '@/features/dms/useDms';
import { useFriends } from '@/features/friends/useFriends';
import { MiniRoomChat } from '@/features/chat/MiniRoomChat';
import { useRoom } from '@/features/rooms/useRooms';
import type { ChatTarget } from './ChannelOverlay';

/** A line of Bubbles: what someone said out loud in the room (it also pops over their head). */
export interface RoomLine {
  id: string;
  name?: string;
  text: string;
  system?: boolean;
}

type Tab = 'room' | 'bubbles' | 'dms';

/**
 * Chat, bottom left: every kind of text in the room in one place, one tap from the dock.
 * - **Bubbles** (first, and where you start): what people say out loud right now; it pops over
 *   their head and is gone when the room empties. Inside the room you're there to talk to whoever
 *   is around, so the live conversation comes first.
 * - **Room chat**: the room's saved chat (the same one as the Chat page outside 3D). Its unread
 *   count, and an @ when someone mentions you, stay on the tab so it's never missed.
 *   Common rooms have no saved chat, so no tab.
 * - **Messages**: your DMs, readable without leaving the room.
 * Photos show inline, like a chat bubble on the web; tap one (or ⤢) for the big chat window.
 */
export function ChatPanel({
  server,
  guest,
  lines,
  onSay,
  onTyping,
  onExpand,
  onClose,
  className,
}: {
  server: Server;
  /** Guests have no account: Bubbles only (no saved room chat, no DMs). */
  guest?: boolean;
  lines: RoomLine[];
  onSay: (text: string) => void;
  /** Typing a bubble shows dots over your head. */
  onTyping?: (typing: boolean) => void;
  onExpand: (target: ChatTarget) => void;
  onClose?: () => void;
  className?: string;
}) {
  const roomChat = server.id === 'public' || guest ? undefined : server.channels[0];
  const [tab, setTab] = useState<Tab>('bubbles');
  // The open DM, by the other person's @handle
  const [dmWith, setDmWith] = useState<string | null>(null);
  const [seenLines, setSeenLines] = useState(lines.length);
  const dms = useDms();
  const friends = useFriends();
  const dmUnread = dmUnreadOf(dms.data);
  const talked = new Set(dms.data?.map((d) => d.with.id));
  const notYet = (friends.data ?? []).filter((f) => !talked.has(f.person.id) && f.person.handle);
  const openPerson = dmWith
    ? (dms.data?.find((d) => d.with.handle === dmWith)?.with ?? friends.data?.find((f) => f.person.handle === dmWith)?.person)
    : undefined;

  // The room's real unread count and @ (looking at the tab marks it read)
  const room = useRoom(server.id, undefined, !!roomChat);
  const roomUnread = roomChat && tab !== 'room' ? (room.data?.me.unread ?? 0) : 0;
  const tabs: [Tab, string, number | boolean][] = [
    ['bubbles', 'Bubbles', tab !== 'bubbles' && lines.length > seenLines],
    ...(roomChat ? [['room', 'Room chat', roomUnread] as [Tab, string, number]] : []),
    ...(guest ? [] : [['dms', 'Messages', dmUnread] as [Tab, string, number]]),
  ];
  const mentioned = !!room.data?.me.mentioned && roomUnread > 0;
  const open = (t: Tab) => {
    setTab(t);
    if (t === 'bubbles') setSeenLines(lines.length);
  };
  const expandTarget: ChatTarget | null =
    tab === 'room' && roomChat ? { kind: 'channel', id: roomChat.id } : tab === 'dms' && dmWith ? { kind: 'dm', id: dmWith } : null;

  return (
    <section className={cn('panel flex flex-col gap-2 p-2', className)} aria-label="Chat">
      <div className="flex items-center gap-1">
        <div className="flex min-w-0 flex-1 gap-0.5 rounded-xl bg-muted p-0.5" role="tablist">
          {tabs.map(([id, label, unread]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => open(id)}
              className={cn(
                // Sized by their label, so a badge never squeezes another tab's name
                'flex min-w-0 flex-auto items-center justify-center gap-1 rounded-[10px] px-1.5 py-1 text-xs font-extrabold whitespace-nowrap',
                tab === id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="truncate">{label}</span>
              {typeof unread === 'number' && unread > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-[10px] font-black text-primary-foreground">
                  {id === 'room' && mentioned ? `@${unread}` : unread}
                </span>
              )}
              {unread === true && <span className="size-1.5 flex-none rounded-full bg-primary" />}
            </button>
          ))}
        </div>
        {expandTarget && (
          <button
            onClick={() => onExpand(expandTarget)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Open in the big chat window"
            title="Open big"
          >
            <Maximize2 className="size-3.5" />
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Hide chat">
            <X className="size-4" />
          </button>
        )}
      </div>

      {tab === 'room' && roomChat && (
        <>
          <p className="px-1.5 text-[11px] text-muted-foreground">Saved · also readable from outside the room</p>
          <MiniRoomChat roomId={server.id} onOpen={() => onExpand({ kind: 'channel', id: roomChat.id })} />
        </>
      )}

      {tab === 'bubbles' && (
        <>
          <p className="px-1.5 text-[11px] text-muted-foreground">Pops over your head · gone when everyone leaves</p>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-1.5">
            {lines.map((l) =>
              l.system ? (
                <p key={l.id} className="rounded-xl bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {l.text}
                </p>
              ) : (
                <p key={l.id} className="text-sm">
                  <span className="font-black">{l.name}</span> {l.text}
                </p>
              ),
            )}
          </div>
          <Composer compact placeholder="Say something out loud" onSend={onSay} maxLength={BUBBLE_MAX} onTyping={onTyping} />
        </>
      )}

      {tab === 'dms' &&
        (dmWith ? (
          <>
            <button
              onClick={() => setDmWith(null)}
              className="flex items-center gap-2 rounded-xl px-1 py-0.5 text-left text-sm font-black hover:bg-muted"
            >
              <ChevronLeft className="size-4 text-muted-foreground" />
              {openPerson && <PersonFace who={openPerson} size={22} />}
              {openPerson?.name ?? `@${dmWith}`}
            </button>
            <DmChat key={dmWith} handle={dmWith} mini onOpen={() => onExpand({ kind: 'dm', id: dmWith })} />
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {dms.data?.map((d) => (
              <button
                key={d.id}
                onClick={() => setDmWith(d.with.handle)}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-muted"
              >
                <FriendFace who={d.with} size={30} />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm', d.unread ? 'font-black' : 'font-bold')}>{d.with.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{lastLine(d)}</span>
                </span>
                {d.unread > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-black text-primary-foreground">
                    {d.unread}
                  </span>
                )}
              </button>
            ))}
            {notYet.length > 0 && (
              <p className="px-2 pt-2 pb-1 text-[10px] font-black tracking-wider text-muted-foreground uppercase">Friends</p>
            )}
            {notYet.map(({ person }) => (
              <button
                key={person.id}
                onClick={() => setDmWith(person.handle)}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1 text-left text-sm font-bold hover:bg-muted"
              >
                <PersonFace who={person} size={24} /> {person.name}
              </button>
            ))}
            {dms.data?.length === 0 && !notYet.length && (
              <p className="px-2 py-2 text-xs text-muted-foreground">DMs are just for friends. Add one from Friends.</p>
            )}
          </div>
        ))}
    </section>
  );
}
