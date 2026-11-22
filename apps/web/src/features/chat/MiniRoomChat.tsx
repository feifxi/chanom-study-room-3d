'use client';

import { useEffect, type ReactNode } from 'react';
import { Composer, pickedFile } from '@/components/chat/Chat';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';
import { useMe } from '@/features/account/useMe';
import { useChat, type Thread } from './useRoomChat';

/** The room chat in the small Chat panel in 3D. */
export function MiniRoomChat({ roomId, onOpen }: { roomId: string; onOpen: () => void }) {
  return <MiniChat thread={{ room: roomId }} placeholder="Message the room" onOpen={onOpen} />;
}

/**
 * A saved chat (room or DM) in the small Chat panel in 3D: the latest messages in a narrow column
 * and a small message box. Reacting, replying and older messages are in the big window (⤢), which
 * `onOpen` opens.
 */
export function MiniChat({
  thread,
  placeholder,
  locked,
  onOpen,
}: {
  thread: Thread;
  placeholder: string;
  /** Replaces the message box (an unfriended or blocked DM) */
  locked?: ReactNode;
  onOpen: () => void;
}) {
  const { data: me } = useMe();
  const chat = useChat(thread);
  const last = chat.messages[chat.messages.length - 1];

  // Looking at the tab is reading it
  useEffect(() => {
    if (last) chat.markRead(last.id);
  }, [last, chat]);

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto px-1">
        <div className="flex flex-col gap-2">
          {chat.query.isPending && <p className="text-xs text-muted-foreground">Opening the chat…</p>}
          {chat.messages.length === 0 && !chat.query.isPending && (
            <p className="rounded-xl bg-muted px-2.5 py-1 text-xs text-muted-foreground">No messages yet. Say hi 👋</p>
          )}
          {chat.messages.slice(-40).map((m) => {
            const mine = m.author.id === me?.id;
            return (
              <div key={m.id} className="flex gap-2">
                <UserAvatar
                  user={{ name: m.author.name, color: m.author.look?.outfit ?? '#9c8aa0', presence: 'offline' }}
                  size={24}
                  className="mt-0.5"
                />
                <div className="min-w-0 text-sm leading-snug break-words">
                  <p>
                    <span className="font-black" style={{ color: mine ? 'var(--primary)' : undefined }}>
                      {m.author.name}
                    </span>{' '}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(m.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                  {m.replyTo && (
                    <button onClick={onOpen} className="block max-w-full truncate text-left text-[11px] text-muted-foreground">
                      ↩ {m.replyTo.author.name}: {m.replyTo.deleted ? 'deleted' : m.replyTo.text}
                    </button>
                  )}
                  {m.pictures.length > 0 && (
                    <div className={cn('mt-1 grid w-44 max-w-full gap-1', m.pictures.length > 1 && 'grid-cols-2')}>
                      {m.pictures.map((p) =>
                        p.ready ? (
                          <button
                            key={p.id}
                            onClick={onOpen}
                            aria-label="Open photo"
                            className="overflow-hidden rounded-xl border hover:opacity-90"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- already shrunk to WebP by the worker */}
                            <img src={p.url} alt="" className="aspect-square w-full object-cover" />
                          </button>
                        ) : (
                          <div
                            key={p.id}
                            className="aspect-square w-full animate-pulse rounded-xl border bg-muted"
                            aria-label="Getting it ready"
                          />
                        ),
                      )}
                    </div>
                  )}
                  <p>
                    {m.text}
                    {m.editedAt && <span className="ml-1 text-[10px] text-muted-foreground">(edited)</span>}
                  </p>
                  {m.reactions.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {m.reactions.map((r) => `${r.emoji} ${r.userIds.length}`).join('  ')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="h-4 px-1.5 text-[11px] text-muted-foreground">{chat.typing && `${chat.typing} is typing…`}</p>
      {locked ?? (
        <Composer
          compact
          pictures
          placeholder={placeholder}
          onSend={(text, images) => chat.send.mutate({ text, files: images.map(pickedFile).filter((f): f is File => !!f) })}
          onTyping={(on) => on && chat.sendTyping()}
        />
      )}
    </>
  );
}
