'use client';

import { useEffect } from 'react';
import { Composer } from '@/components/chat/Chat';
import { UserAvatar } from '@/components/UserAvatar';
import { useMe } from '@/features/account/useMe';
import { useRoomChat } from './useRoomChat';

/**
 * The room chat in the small Chat panel in 3D: the latest messages in a narrow column and a small
 * message box. Reacting, replying and older messages are in the big window (⤢), which `onOpen` opens.
 */
export function MiniRoomChat({ roomId, onOpen }: { roomId: string; onOpen: () => void }) {
  const { data: me } = useMe();
  const chat = useRoomChat(roomId);
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
      <Composer
        compact
        placeholder="Message the room"
        onSend={(text) => text && chat.send.mutate({ text })}
        onTyping={(on) => on && chat.sendTyping()}
      />
    </>
  );
}
