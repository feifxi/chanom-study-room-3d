'use client';

import { useState } from 'react';
import { ChevronLeft, Maximize2, X } from 'lucide-react';
import { Composer } from '@/components/chat/Chat';
import { BUBBLE_MAX } from '../room3d/roomSession';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { DMS, channelMessages, userById, type Message, type Server } from '@/lib/mock';
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
 *   Public rooms have no saved chat, so no tab.
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
  const [dmId, setDmId] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, Message[]>>({});
  // Unread clears once you've looked at a tab (or a DM)
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [seenLines, setSeenLines] = useState(lines.length);
  const look = (k: string) => setSeen((s) => new Set(s).add(k));

  const send = (k: string) => (text: string, images: string[]) =>
    setSent((s) => ({
      ...s,
      [k]: [...(s[k] ?? []), { id: `${Date.now()}`, author: 'me', at: 'Now', text, images: images.length ? images : undefined }],
    }));
  const dm = DMS.find((d) => d.id === dmId);
  const dmUnread = DMS.reduce((n, d) => n + (seen.has(`dm:${d.id}`) ? 0 : (d.unread ?? 0)), 0);

  const roomUnread = roomChat && !seen.has('room') ? (roomChat.unread ?? 0) : 0;
  const tabs: [Tab, string, number | boolean][] = [
    ['bubbles', 'Bubbles', tab !== 'bubbles' && lines.length > seenLines],
    ...(roomChat ? [['room', 'Room chat', roomUnread] as [Tab, string, number]] : []),
    ...(guest ? [] : [['dms', 'Messages', dmUnread] as [Tab, string, number]]),
  ];
  const mentioned = !!roomChat?.mention && roomUnread > 0;
  const open = (t: Tab) => {
    setTab(t);
    if (t === 'room') look('room');
    if (t === 'bubbles') setSeenLines(lines.length);
  };
  const expandTarget: ChatTarget | null =
    tab === 'room' && roomChat ? { kind: 'channel', id: roomChat.id } : tab === 'dms' && dm ? { kind: 'dm', id: dm.id } : null;

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
          <Thread
            messages={[...channelMessages(server.id, roomChat.id), ...(sent.room ?? [])]}
            onOpen={() => onExpand({ kind: 'channel', id: roomChat.id })}
          />
          <Composer compact pictures placeholder="Message the room" onSend={send('room')} />
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
        (dm ? (
          <>
            <button
              onClick={() => setDmId(null)}
              className="flex items-center gap-2 rounded-xl px-1 py-0.5 text-left text-sm font-black hover:bg-muted"
            >
              <ChevronLeft className="size-4 text-muted-foreground" />
              <UserAvatar user={userById(dm.with)} size={22} presence />
              {userById(dm.with).name}
            </button>
            <Thread messages={[...dm.messages, ...(sent[`dm:${dm.id}`] ?? [])]} onOpen={() => onExpand({ kind: 'dm', id: dm.id })} />
            <Composer compact pictures placeholder={`Message ${userById(dm.with).name}`} onSend={send(`dm:${dm.id}`)} />
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {DMS.map((d) => {
              const u = userById(d.with);
              const unread = seen.has(`dm:${d.id}`) ? 0 : (d.unread ?? 0);
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setDmId(d.id);
                    look(`dm:${d.id}`);
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-muted"
                >
                  <UserAvatar user={u} size={30} presence />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm', unread ? 'font-black' : 'font-bold')}>{u.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{d.messages.at(-1)?.text}</span>
                  </span>
                  {!!unread && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-black text-primary-foreground">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
    </section>
  );
}

/** A small message list for the panel; the big chat window uses the full one. */
function Thread({ messages, onOpen }: { messages: Message[]; onOpen: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto px-1">
      <div className="flex flex-col gap-2">
        {messages.map((m) =>
          m.system ? (
            <p key={m.id} className="rounded-xl bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {m.text}
            </p>
          ) : (
            <div key={m.id} className="flex gap-2">
              <UserAvatar user={userById(m.author)} size={24} className="mt-0.5" />
              <div className="min-w-0 text-sm leading-snug break-words">
                <p>
                  <span className="font-black" style={{ color: m.author === 'me' ? 'var(--primary)' : undefined }}>
                    {userById(m.author).name}
                  </span>{' '}
                  <span className="text-[10px] text-muted-foreground">{m.at.replace('Today ', '')}</span>
                </p>
                {m.text && <p>{m.text}</p>}
                {m.images && (
                  <div className={cn('mt-1 grid w-44 max-w-full gap-1', m.images.length > 1 && 'grid-cols-2')}>
                    {m.images.map((src) => (
                      <button
                        key={src}
                        onClick={onOpen}
                        aria-label="Open photo"
                        className="overflow-hidden rounded-xl border hover:opacity-90"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- local object URLs in the demo */}
                        <img src={src} alt="" className="aspect-square w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                {/* Same placeholder photo as the big chat, just smaller */}
                {m.image && (
                  <button
                    onClick={onOpen}
                    aria-label="Open photo"
                    className="mt-1 block aspect-[4/3] w-44 max-w-full overflow-hidden rounded-xl border bg-[url('/screenshot.png')] bg-[length:240%] bg-[position:35%_35%] hover:opacity-90"
                  />
                )}
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
