'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ChatView, pickedFile, type ChatMessageView, type Mentionable } from '@/components/chat/Chat';
import { useMe } from '@/features/account/useMe';
import { DmCard } from '@/features/dms/DmCard';
import { useBlocks } from '@/features/friends/useFriends';
import { ReportDialog } from '@/features/moderation/ReportDialog';
import { useMembers } from '@/features/rooms/useRooms';
import { useChat, type ChatMessage, type Thread } from './useRoomChat';

export const colorOf = (p: { look: { outfit: string } | null }) => p.look?.outfit ?? '#9c8aa0';

/** "20:41" today, "Yesterday 20:41", else "Nov 18, 20:41". Outside components: render can't read the clock. */
export function chatTime(iso: string, now = new Date()) {
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
  const members = useMembers(roomId);
  return (
    <ThreadChat
      thread={{ room: roomId }}
      className={className}
      placeholder="Message the room"
      moderator={moderator}
      intro={intro}
      mentionables={(members.data ?? [])
        .filter((x) => x.person.id !== me?.id && x.person.handle)
        .map((x) => ({ id: x.person.id, handle: x.person.handle!, name: x.person.name, color: colorOf(x.person) }))}
    />
  );
}

/** Any saved chat on the API (a room's or a DM), live, in the full chat view. */
export function ThreadChat({
  thread,
  placeholder,
  mentionables,
  moderator = false,
  intro,
  locked,
  className,
}: {
  thread: Thread;
  placeholder: string;
  mentionables: Mentionable[];
  moderator?: boolean;
  intro?: ReactNode;
  /** Replaces the message box (an unfriended or blocked DM) */
  locked?: ReactNode;
  className?: string;
}) {
  const { data: me } = useMe();
  const [reporting, setReporting] = useState<ChatMessageView | null>(null);
  const chat = useChat(thread);
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
      images: m.pictures.length ? m.pictures.map((p) => (p.ready ? p.url : null)) : undefined,
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
      card: m.kind !== 'text' ? <DmCard m={m} mine={m.author.id === me?.id} /> : undefined,
    };
  };

  if (chat.query.isPending) {
    return <p className="m-auto animate-pulse text-sm font-bold text-muted-foreground">Opening the chat…</p>;
  }

  return (
    <>
      <ChatView
        key={'room' in thread ? thread.room : thread.dm}
        className={className}
        messages={chat.messages.map(view)}
        placeholder={placeholder}
        mentionables={mentionables}
        moderator={moderator}
        locked={locked}
        dividerAt={firstUnread(chat.messages, chat.lastReadId, me?.id)}
        typing={chat.typing}
        intro={intro}
        hasMore={chat.query.hasNextPage}
        onLoadMore={() => void chat.query.fetchNextPage()}
        onSend={(text, images, replyTo) => {
          const files = images.map(pickedFile).filter((f): f is File => !!f);
          const sending = chat.send.mutateAsync({ text, replyToId: replyTo?.id, files });
          if (files.length)
            toast.promise(sending, {
              loading: files.length === 1 ? 'Sending your picture…' : `Sending ${files.length} pictures…`,
              success: 'Sent',
              error: () => null,
            });
          sending.catch(() => {}).finally(() => images.forEach((url) => URL.revokeObjectURL(url)));
        }}
        onEdit={(m, text) => chat.edit.mutate({ id: m.id, text })}
        onDelete={(m) => {
          const original = byId.get(m.id);
          if (original) chat.remove(original, m.mine ? 'Message deleted' : `Deleted ${m.author.name}’s message`);
        }}
        onReport={me?.isGuest ? undefined : setReporting}
        onReact={(m, emoji) => chat.react.mutate({ id: m.id, emoji, on: !m.reactions.find((r) => r.emoji === emoji)?.mine })}
        onSeeLatest={() => {
          const last = chat.messages[chat.messages.length - 1];
          if (last) chat.markRead(last.id);
        }}
        onTyping={chat.sendTyping}
      />
      {reporting && (
        <ReportDialog
          person={{ id: reporting.author.id, name: reporting.author.name }}
          messageId={reporting.id}
          canBlock={false}
          open
          onOpenChange={(o) => !o && setReporting(null)}
        />
      )}
    </>
  );
}

/** The first message after your read marker that someone else wrote: "New messages" goes above it. */
function firstUnread(messages: ChatMessage[], lastReadId: string | null, myId?: string) {
  if (!lastReadId) return null;
  return messages.find((m) => m.id > lastReadId && m.author.id !== myId)?.id ?? null;
}
