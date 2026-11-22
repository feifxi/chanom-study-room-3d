import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { mentionedHandles, MESSAGES_PAGE } from '@connecta/shared';
import { requireSignedUp } from '../accounts/signed-up.js';
import { Prisma } from '../generated/prisma/client.js';
import { LiveService } from '../live/live.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PicturesService, pictureUrl } from './pictures.service.js';
import { toPerson } from '../rooms/person.js';
import type { Card, ChatMessage, MessagePage } from './chat.schemas.js';

export type SendInput = { text: string; replyToId?: string; pictureIds?: string[] };

export const messageInclude = {
  author: true,
  dm: { select: { pair: true } },
  replyTo: { include: { author: true, pictures: { select: { id: true } } } },
  pictures: { orderBy: { position: 'asc' } },
  reactions: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.MessageInclude;
export type MessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

/** Live events the web app listens for. */
export const CHAT_EVENTS = {
  /** A new or changed message (edit, reaction): replace it by id */
  message: 'message',
  /** { roomId, dmId, id } */
  deleted: 'message:deleted',
  /** To the author: { roomId, dmId, messageId } — a picture couldn't be sent and was left out */
  pictureFailed: 'picture:failed',
} as const;

/** A DM's two people, from its pair key (no query needed). */
export const dmPeople = (pair: string) => pair.split(':');

export function toMessage(m: MessageRow): ChatMessage {
  const reactions = new Map<string, string[]>();
  for (const r of m.reactions) reactions.set(r.emoji, [...(reactions.get(r.emoji) ?? []), r.userId]);
  return {
    id: m.id,
    roomId: m.roomId,
    dmId: m.dmId,
    author: toPerson(m.author),
    text: m.text,
    kind: m.kind as ChatMessage['kind'],
    card: m.deletedAt ? null : ((m.card as Card | null) ?? null),
    replyTo: m.replyTo && {
      id: m.replyTo.id,
      author: toPerson(m.replyTo.author),
      text: m.replyTo.deletedAt ? '' : m.replyTo.text,
      deleted: !!m.replyTo.deletedAt,
      hasPictures: !m.replyTo.deletedAt && m.replyTo.pictures.length > 0,
    },
    mentions: m.mentions,
    mentionsRoom: m.mentionsRoom,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    ready: m.ready,
    pictures: m.pictures.map((p) => ({ id: p.id, url: pictureUrl(p.id), width: p.width, height: p.height, ready: p.status === 'ready' })),
    reactions: [...reactions].map(([emoji, userIds]) => ({ emoji, userIds })),
  };
}

/**
 * Room chat (docs/v2/features/04-chat-and-dms.md): each room's one saved chat, for members. Writes
 * happen here and go out live through the gateway; reading history is paged by message id. What you
 * do to a message (edit, delete, react) works the same in a DM; DmsService has the DM-only parts.
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly live: LiveService,
    private readonly pictures: PicturesService,
  ) {}

  async page(userId: string, roomId: string, before?: string, limit = MESSAGES_PAGE): Promise<MessagePage> {
    const member = await this.member(userId, roomId);
    const rows = await this.prisma.message.findMany({
      // A message waiting on its pictures shows only to its author
      where: { roomId, deletedAt: null, OR: [{ ready: true }, { authorId: userId }], ...(before ? { id: { lt: before } } : {}) },
      include: messageInclude,
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
    return {
      messages: rows.slice(0, limit).reverse().map(toMessage),
      hasMore: rows.length > limit,
      lastReadId: member.lastReadId,
    };
  }

  async send(userId: string, roomId: string, input: SendInput): Promise<ChatMessage> {
    const member = await this.member(userId, roomId);
    if (member.timedOutUntil && member.timedOutUntil > new Date()) {
      throw new ForbiddenException({ message: 'You’re timed out in this room for now.', code: 'timed_out', until: member.timedOutUntil });
    }
    if (input.replyToId) {
      const original = await this.prisma.message.findFirst({ where: { id: input.replyToId, roomId, ready: true } });
      if (!original) throw new NotFoundException('That message is gone');
    }
    const { mentions, mentionsRoom } = await this.mentions(roomId, input.text, member.role !== 'member');
    const message = await this.create(userId, { roomId }, input, mentions, mentionsRoom);
    // Sending means you've read up to here
    await this.prisma.membership.update({ where: { roomId_userId: { roomId, userId } }, data: { lastReadId: message.id } });
    return message;
  }

  /** A new message in a room or a DM: pictures attached, then out live (once they're ready). */
  async create(
    userId: string,
    thread: { roomId: string } | { dmId: string },
    input: SendInput,
    mentions: string[],
    mentionsRoom: boolean,
    card?: { kind: 'ask' | 'invite'; card: Card },
  ): Promise<ChatMessage> {
    const pictureIds = input.pictureIds ?? [];
    const created = await this.prisma.message.create({
      data: {
        ...thread,
        authorId: userId,
        text: input.text,
        replyToId: input.replyToId,
        mentions,
        mentionsRoom,
        ready: !pictureIds.length,
        ...(card && { kind: card.kind, card: card.card }),
      },
    });
    try {
      await this.pictures.attach(userId, pictureIds, created.id);
    } catch (error) {
      await this.prisma.message.delete({ where: { id: created.id } });
      throw error;
    }
    if (!pictureIds.length)
      return this.publish(await this.prisma.message.findUniqueOrThrow({ where: { id: created.id }, include: messageInclude }));
    // With pictures it shows once they're all ready: now, or when the worker finishes the last one
    await this.release(created.id);
    return toMessage(await this.prisma.message.findUniqueOrThrow({ where: { id: created.id }, include: messageInclude }));
  }

  /**
   * Called when a message's pictures change (one ready, one dropped): shows it to the room once
   * they're all ready. If a dropped picture leaves nothing to show, the message goes.
   */
  async release(messageId: string, { droppedPicture = false } = {}): Promise<void> {
    const row = await this.prisma.message.findUnique({ where: { id: messageId }, include: messageInclude });
    if (!row || row.deletedAt) return;
    const { roomId, dmId } = row;
    if (droppedPicture) this.live.toUser(row.authorId, CHAT_EVENTS.pictureFailed, { roomId, dmId, messageId });
    if (!row.text && !row.pictures.length) {
      await this.prisma.message.delete({ where: { id: messageId } });
      this.live.toUser(row.authorId, CHAT_EVENTS.deleted, { roomId, dmId, id: messageId });
      return;
    }
    if (row.pictures.some((p) => p.status !== 'ready')) {
      if (droppedPicture) this.live.toUser(row.authorId, CHAT_EVENTS.message, toMessage(row));
      return;
    }
    // Only one caller wins, so the room hears about it once
    const { count } = await this.prisma.message.updateMany({ where: { id: messageId, ready: false }, data: { ready: true } });
    if (count) this.publish({ ...row, ready: true });
  }

  async edit(userId: string, messageId: string, text: string): Promise<ChatMessage> {
    const message = await this.message(messageId);
    const { moderator } = await this.access(userId, message);
    if (message.authorId !== userId) throw new ForbiddenException('You can only edit your own messages');
    if (message.kind !== 'text') throw new ForbiddenException('Cards can’t be edited');
    const { mentions, mentionsRoom } = message.roomId
      ? await this.mentions(message.roomId, text, moderator)
      : await this.dmMentions(message.dm!.pair, text);
    const row = await this.prisma.message.update({
      where: { id: messageId },
      data: { text, mentions, mentionsRoom, editedAt: new Date() },
      include: messageInclude,
    });
    return this.publish(row);
  }

  /** Your own, or anyone's if you're the owner or a mod of the room (in a DM, only your own). */
  async remove(userId: string, messageId: string): Promise<void> {
    const message = await this.message(messageId);
    // Your own words are always yours to take back, friends or not
    const { moderator } = await this.access(userId, message, false);
    if (message.authorId !== userId && !moderator) throw new ForbiddenException('Only the owner and mods can delete others’ messages');
    await this.prisma.$transaction([
      this.prisma.message.update({
        where: { id: messageId },
        data: { text: '', mentions: [], mentionsRoom: false, deletedAt: new Date() },
      }),
      this.prisma.reaction.deleteMany({ where: { messageId } }),
    ]);
    await this.pictures.removeFor(messageId);
    this.deliver(message, CHAT_EVENTS.deleted, { roomId: message.roomId, dmId: message.dmId, id: messageId });
  }

  async react(userId: string, messageId: string, emoji: string, on: boolean): Promise<ChatMessage> {
    const message = await this.message(messageId);
    await this.access(userId, message);
    if (on) {
      await this.prisma.reaction.upsert({
        where: { messageId_userId_emoji: { messageId, userId, emoji } },
        create: { messageId, userId, emoji },
        update: {},
      });
    } else {
      await this.prisma.reaction.deleteMany({ where: { messageId, userId, emoji } });
    }
    return this.publish(await this.prisma.message.findUniqueOrThrow({ where: { id: messageId }, include: messageInclude }));
  }

  /** You've seen up to this message. Never moves back. */
  async read(userId: string, roomId: string, messageId: string): Promise<void> {
    const member = await this.member(userId, roomId);
    if (member.lastReadId && member.lastReadId >= messageId) return;
    const exists = await this.prisma.message.count({ where: { id: messageId, roomId } });
    if (!exists) throw new NotFoundException();
    await this.prisma.membership.update({ where: { roomId_userId: { roomId, userId } }, data: { lastReadId: messageId } });
  }

  /**
   * Unread messages (by others, after your read marker) and whether any of them mention you, for
   * Home's room cards. Before you've read anything, only what came after you joined counts.
   */
  async unread(userId: string, member: { roomId: string; lastReadId: string | null; joinedAt: Date }) {
    const where: Prisma.MessageWhereInput = {
      roomId: member.roomId,
      deletedAt: null,
      ready: true,
      authorId: { not: userId },
      ...(member.lastReadId ? { id: { gt: member.lastReadId } } : { createdAt: { gt: member.joinedAt } }),
    };
    const [count, mentioned] = await Promise.all([
      this.prisma.message.count({ where }),
      this.prisma.message.count({ where: { ...where, OR: [{ mentions: { has: userId } }, { mentionsRoom: true }] } }),
    ]);
    return { unread: count, mentioned: mentioned > 0 };
  }

  // ── Checks ──────────────────────────────────────────────────────────────────────────────────────

  /** Room chat is for members (a guest pass doesn't show it); anyone else gets 404. */
  private async member(userId: string, roomId: string) {
    await requireSignedUp(this.prisma, userId);
    const member = await this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } } });
    if (!member) throw new NotFoundException();
    return member;
  }

  private async message(id: string) {
    const message = await this.prisma.message.findUnique({ where: { id }, include: { dm: { select: { pair: true } } } });
    if (!message || message.deletedAt) throw new NotFoundException();
    return message;
  }

  /**
   * You can see the message's chat: a member of its room, or one of its DM's two people. Changing
   * things in a DM (edit, react) needs you to still be friends: otherwise it's read-only history.
   */
  private async access(userId: string, message: { roomId: string | null; dm: { pair: string } | null }, write = true) {
    if (message.roomId) return { moderator: (await this.member(userId, message.roomId)).role !== 'member' };
    await requireSignedUp(this.prisma, userId);
    const people = message.dm ? dmPeople(message.dm.pair) : [];
    if (!people.includes(userId)) throw new NotFoundException();
    const other = people.find((id) => id !== userId)!;
    if (write && !(await this.prisma.friendship.findUnique({ where: { userId_friendId: { userId, friendId: other } } }))) {
      throw new ForbiddenException({ message: 'You’re not friends any more, so this chat is read-only.', code: 'not_friends' });
    }
    return { moderator: false };
  }

  /** In a DM you can only mention the other person. */
  async dmMentions(pair: string, text: string) {
    const handles = mentionedHandles(text);
    const people = handles.length
      ? await this.prisma.user.findMany({ where: { id: { in: dmPeople(pair) }, handle: { in: handles } }, select: { id: true } })
      : [];
    return { mentions: people.map((p) => p.id), mentionsRoom: false };
  }

  /** To the room's watchers, or to both people in a DM. */
  private deliver(message: { roomId: string | null; dm: { pair: string } | null }, event: string, payload: unknown) {
    if (message.roomId) this.live.toRoom(message.roomId, event, payload);
    else if (message.dm) this.live.toUsers(dmPeople(message.dm.pair), event, payload);
  }

  /** Mentions are members only; @room only counts from the owner and mods. */
  private async mentions(roomId: string, text: string, moderator: boolean) {
    const handles = mentionedHandles(text);
    const people = handles.length
      ? await this.prisma.membership.findMany({ where: { roomId, user: { handle: { in: handles } } }, select: { userId: true } })
      : [];
    return { mentions: people.map((p) => p.userId), mentionsRoom: moderator && handles.includes('room') };
  }

  /** A card changed (an ask was answered): everyone in the chat gets the new version. */
  async updateCard(messageId: string, card: Card): Promise<ChatMessage> {
    return this.publish(await this.prisma.message.update({ where: { id: messageId }, data: { card }, include: messageInclude }));
  }

  /** To the room (or the DM), or only to its author while its pictures are still on their way. */
  private publish(row: MessageRow): ChatMessage {
    const message = toMessage(row);
    if (row.ready) this.deliver(row, CHAT_EVENTS.message, message);
    else this.live.toUser(row.authorId, CHAT_EVENTS.message, message);
    return message;
  }
}
