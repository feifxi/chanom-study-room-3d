import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { mentionedHandles, MESSAGES_PAGE } from '@connecta/shared';
import { requireSignedUp } from '../accounts/signed-up.js';
import { Prisma } from '../generated/prisma/client.js';
import { LiveService } from '../live/live.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPerson } from '../rooms/person.js';
import type { ChatMessage, MessagePage } from './chat.schemas.js';

const messageInclude = {
  author: true,
  replyTo: { include: { author: true, pictures: { select: { id: true } } } },
  pictures: { orderBy: { position: 'asc' } },
  reactions: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.MessageInclude;
type MessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

/** Live events the web app listens for. */
export const CHAT_EVENTS = {
  /** A new or changed message (edit, reaction): replace it by id */
  message: 'message',
  /** { roomId, id } */
  deleted: 'message:deleted',
} as const;

function toMessage(m: MessageRow): ChatMessage {
  const reactions = new Map<string, string[]>();
  for (const r of m.reactions) reactions.set(r.emoji, [...(reactions.get(r.emoji) ?? []), r.userId]);
  return {
    id: m.id,
    roomId: m.roomId!,
    author: toPerson(m.author),
    text: m.text,
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
    // Pictures come with uploads (next); the table is ready
    pictures: [],
    reactions: [...reactions].map(([emoji, userIds]) => ({ emoji, userIds })),
  };
}

/**
 * Room chat (docs/v2/features/04-chat-and-dms.md): each room's one saved chat, for members. Writes
 * happen here and go out live through the gateway; reading history is paged by message id.
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly live: LiveService,
  ) {}

  async page(userId: string, roomId: string, before?: string, limit = MESSAGES_PAGE): Promise<MessagePage> {
    const member = await this.member(userId, roomId);
    const rows = await this.prisma.message.findMany({
      where: { roomId, deletedAt: null, ...(before ? { id: { lt: before } } : {}) },
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

  async send(userId: string, roomId: string, input: { text: string; replyToId?: string }): Promise<ChatMessage> {
    const member = await this.member(userId, roomId);
    if (member.timedOutUntil && member.timedOutUntil > new Date()) {
      throw new ForbiddenException({ message: 'You’re timed out in this room for now.', code: 'timed_out', until: member.timedOutUntil });
    }
    if (input.replyToId) {
      const original = await this.prisma.message.findFirst({ where: { id: input.replyToId, roomId } });
      if (!original) throw new NotFoundException('That message is gone');
    }
    const { mentions, mentionsRoom } = await this.mentions(roomId, input.text, member.role !== 'member');
    const row = await this.prisma.message.create({
      data: { roomId, authorId: userId, text: input.text, replyToId: input.replyToId, mentions, mentionsRoom },
      include: messageInclude,
    });
    // Sending means you've read up to here
    await this.prisma.membership.update({ where: { roomId_userId: { roomId, userId } }, data: { lastReadId: row.id } });
    return this.publish(row);
  }

  async edit(userId: string, messageId: string, text: string): Promise<ChatMessage> {
    const message = await this.message(messageId);
    const member = await this.member(userId, message.roomId!);
    if (message.authorId !== userId) throw new ForbiddenException('You can only edit your own messages');
    const { mentions, mentionsRoom } = await this.mentions(message.roomId!, text, member.role !== 'member');
    const row = await this.prisma.message.update({
      where: { id: messageId },
      data: { text, mentions, mentionsRoom, editedAt: new Date() },
      include: messageInclude,
    });
    return this.publish(row);
  }

  /** Your own, or anyone's if you're the owner or a mod of the room. */
  async remove(userId: string, messageId: string): Promise<void> {
    const message = await this.message(messageId);
    const member = await this.member(userId, message.roomId!);
    if (message.authorId !== userId && member.role === 'member')
      throw new ForbiddenException('Only the owner and mods can delete others’ messages');
    await this.prisma.$transaction([
      this.prisma.message.update({
        where: { id: messageId },
        data: { text: '', mentions: [], mentionsRoom: false, deletedAt: new Date() },
      }),
      this.prisma.reaction.deleteMany({ where: { messageId } }),
    ]);
    // Pictures go from storage with the uploads work; the rows stay with the message for now
    this.live.toRoom(message.roomId!, CHAT_EVENTS.deleted, { roomId: message.roomId, id: messageId });
  }

  async react(userId: string, messageId: string, emoji: string, on: boolean): Promise<ChatMessage> {
    const message = await this.message(messageId);
    await this.member(userId, message.roomId!);
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
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message || message.deletedAt || !message.roomId) throw new NotFoundException();
    return message;
  }

  /** Mentions are members only; @room only counts from the owner and mods. */
  private async mentions(roomId: string, text: string, moderator: boolean) {
    const handles = mentionedHandles(text);
    const people = handles.length
      ? await this.prisma.membership.findMany({ where: { roomId, user: { handle: { in: handles } } }, select: { userId: true } })
      : [];
    return { mentions: people.map((p) => p.userId), mentionsRoom: moderator && handles.includes('room') };
  }

  private publish(row: MessageRow): ChatMessage {
    const message = toMessage(row);
    this.live.toRoom(message.roomId, CHAT_EVENTS.message, message);
    return message;
  }
}
