'use client';

import { useMemo, type ReactNode } from 'react';
import { ChatView, type ChatMessageView } from '@/components/chat/Chat';
import { useMe } from '@/features/account/useMe';
import { useBlocks } from '@/features/friends/useFriends';
import { useMembers } from '@/features/rooms/useRooms';
import { useRoomChat, type ChatMessage } from './useRoomChat';

const colorOf = (p: { look: { outfit: string } | null }) => p.look?.outfit ?? '#9c8aa0';

/** "20:41" today, "Yesterday 20:41", else "Nov 18, 20:41". Outside components: render can't read the clock. */
function chatTime(iso: string, now = new Date()) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(now) - day(d)) / 86_400_000);
  if (days === 0) return time;
  if (days === 1) return `Yesterday ${time}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}

/**
 * A room's saved chat on the API, live: the room's page, the big chat window in 3D. `moderator`
 * lets the owner and mods delete anyone's message and use @room.
 */
export function RoomChat({
  roomId,
  moderator,
  intro,
  className,
}: {
  roomId: string;
  moderator: boolean;
  intro?: ReactNode;
  className?: string;
}) {
  const { data: me } = useMe();
  const chat = useRoomChat(roomId);
  const members = useMembers(roomId);
  const blocks = useBlocks(!!me?.signedUp);
  const blocked = useMemo(() => new Set(blocks.data?.map((b) => b.person.id)), [blocks.data]);
  const byId = useMemo(() => new Map(chat.messages.map((m) => [m.id, m])), [chat.messages]);

  const view = (m: ChatMessage): ChatMessageView => {
    const myReaction = (ids: string[]) => !!me && ids.includes(me.id);
    return {
      id: m.id,
      author: { id: m.author.id, name: m.author.name, color: colorOf(m.author) },
      mine: m.author.id === me?.id,
      at: chatTime(m.createdAt),
      text: m.text,
      images: m.pictures.length ? m.pictures.map((p) => p.url) : undefined,
      reactions: m.reactions.map((r) => ({ emoji: r.emoji, count: r.userIds.length, mine: myReaction(r.userIds) })),
      quote: m.replyTo
        ? {
            name: m.replyTo.author.name,
            text: m.replyTo.deleted ? 'Original message was deleted' : m.replyTo.text || (m.replyTo.hasPictures ? 'a picture' : ''),
          }
        : undefined,
      edited: !!m.editedAt,
      mentionsMe: m.author.id !== me?.id && (m.mentionsRoom || (!!me && m.mentions.includes(me.id))),
      blocked: blocked.has(m.author.id),
    };
  };

  if (chat.query.isPending) {
    return <p className="m-auto animate-pulse text-sm font-bold text-muted-foreground">Opening the chat…</p>;
  }

  return (
    <ChatView
      key={roomId}
      className={className}
      messages={chat.messages.map(view)}
      placeholder="Message the room"
      mentionables={(members.data ?? [])
        .filter((x) => x.person.id !== me?.id && x.person.handle)
        .map((x) => ({ id: x.person.id, handle: x.person.handle!, name: x.person.name, color: colorOf(x.person) }))}
      moderator={moderator}
      dividerAt={firstUnread(chat.messages, chat.lastReadId, me?.id)}
      typing={chat.typing}
      intro={intro}
      // Pictures come with uploads, next in this step
      pictures={false}
      hasMore={chat.query.hasNextPage}
      onLoadMore={() => void chat.query.fetchNextPage()}
      onSend={(text, _images, replyTo) => chat.send.mutate({ text, replyToId: replyTo?.id })}
      onEdit={(m, text) => chat.edit.mutate({ id: m.id, text })}
      onDelete={(m) => {
        const original = byId.get(m.id);
        if (original) chat.remove(original, m.mine ? 'Message deleted' : `Deleted ${m.author.name}’s message`);
      }}
      onReact={(m, emoji) => chat.react.mutate({ id: m.id, emoji, on: !m.reactions.find((r) => r.emoji === emoji)?.mine })}
      onSeeLatest={() => {
        const last = chat.messages[chat.messages.length - 1];
        if (last) chat.markRead(last.id);
      }}
      onTyping={chat.sendTyping}
    />
  );
}

/** The first message after your read marker that someone else wrote: "New messages" goes above it. */
function firstUnread(messages: ChatMessage[], lastReadId: string | null, myId?: string) {
  if (!lastReadId) return null;
  return messages.find((m) => m.id > lastReadId && m.author.id !== myId)?.id ?? null;
}
