import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MESSAGES_PAGE } from '@connecta/shared';
import { requireSignedUp } from '../accounts/signed-up.js';
import { ChatService, dmPeople, messageInclude, toMessage, type SendInput } from '../chat/chat.service.js';
import type { ChatMessage, MessagePage } from '../chat/chat.schemas.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPerson } from '../rooms/person.js';
import type { DmOpen, DmSummary } from './dms.schemas.js';

/** Each pair of people has one DM, whoever opens it first. */
const pairOf = (a: string, b: string) => [a, b].sort().join(':');

/**
 * DMs (docs/v2/features/04-chat-and-dms.md): 1-to-1 chats between friends. The messages
 * themselves are the same as room chat's (ChatService: edit, delete, react, pictures, live); this
 * is who can open and send, the list, and read markers. A DM stays as read-only history when the
 * two stop being friends.
 */
@Injectable()
export class DmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
  ) {}

  /** Your conversations with at least one message, newest first. */
  async list(userId: string): Promise<DmSummary[]> {
    await requireSignedUp(this.prisma, userId);
    const mine = await this.prisma.dmMember.findMany({
      where: { userId, dm: { lastId: { not: null } } },
      include: { dm: { include: { members: { where: { userId: { not: userId } }, include: { user: true } } } } },
    });
    const lastIds = mine.map((m) => m.dm.lastId!);
    const [lasts, standings] = await Promise.all([
      this.prisma.message.findMany({ where: { id: { in: lastIds } }, include: { pictures: { select: { id: true } } } }),
      this.standings(
        userId,
        mine.map((m) => m.dm.members[0]!.userId),
      ),
    ]);
    const lastById = new Map(lasts.map((m) => [m.id, m]));
    const summaries = await Promise.all(
      mine.map(async (m): Promise<DmSummary> => {
        const other = m.dm.members[0]!.user;
        const last = lastById.get(m.dm.lastId!);
        return {
          id: m.dmId,
          with: toPerson(other),
          ...standings(other.id),
          last: last
            ? {
                text: last.deletedAt ? '' : last.text,
                mine: last.authorId === userId,
                pictures: !last.deletedAt && last.pictures.length > 0,
                deleted: !!last.deletedAt,
                createdAt: last.createdAt.toISOString(),
              }
            : null,
          unread: await this.unreadIn(m.dmId, userId, m.lastReadId),
        };
      }),
    );
    return summaries.sort((a, b) => (b.last?.createdAt ?? '').localeCompare(a.last?.createdAt ?? ''));
  }

  /**
   * Opens your chat with someone (by @handle): the existing one, or a new empty one if you're
   * friends. A new one stays out of both lists until someone sends a message.
   */
  async open(userId: string, handle: string): Promise<DmOpen> {
    await requireSignedUp(this.prisma, userId);
    const other = await this.prisma.user.findUnique({ where: { handle } });
    if (!other || other.id === userId || other.deleteAt) throw new NotFoundException();
    const pair = pairOf(userId, other.id);
    const standing = (await this.standings(userId, [other.id]))(other.id);
    let dm = await this.prisma.dm.findUnique({ where: { pair } });
    if (!dm && standing.friend) {
      dm = await this.prisma.dm.upsert({
        where: { pair },
        create: { pair, members: { create: [{ userId }, { userId: other.id }] } },
        update: {},
      });
    }
    const shared = await this.prisma.room.findMany({
      where: { AND: [{ members: { some: { userId } } }, { members: { some: { userId: other.id } } }] },
      select: { id: true, name: true, emoji: true, mapId: true },
      orderBy: { name: 'asc' },
      take: 20,
    });
    return { id: dm?.id ?? null, with: toPerson(other), ...standing, sharedRooms: shared };
  }

  async page(userId: string, dmId: string, before?: string, limit = MESSAGES_PAGE): Promise<MessagePage> {
    const member = await this.member(userId, dmId);
    const rows = await this.prisma.message.findMany({
      where: { dmId, deletedAt: null, OR: [{ ready: true }, { authorId: userId }], ...(before ? { id: { lt: before } } : {}) },
      include: messageInclude,
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
    return { messages: rows.slice(0, limit).reverse().map(toMessage), hasMore: rows.length > limit, lastReadId: member.lastReadId };
  }

  /** Friends only, and never to someone who blocked you or whom you blocked. */
  async send(userId: string, dmId: string, input: SendInput): Promise<ChatMessage> {
    const member = await this.member(userId, dmId);
    const other = dmPeople(member.dm.pair).find((id) => id !== userId)!;
    if (!(await this.standings(userId, [other]))(other).friend) {
      throw new ForbiddenException({ message: 'You’re not friends any more, so this chat is read-only.', code: 'not_friends' });
    }
    if (input.replyToId) {
      const original = await this.prisma.message.findFirst({ where: { id: input.replyToId, dmId, ready: true } });
      if (!original) throw new NotFoundException('That message is gone');
    }
    const { mentions } = await this.chat.dmMentions(member.dm.pair, input.text);
    const message = await this.chat.create(userId, { dmId }, input, mentions, false);
    await this.prisma.$transaction([
      this.prisma.dm.update({ where: { id: dmId }, data: { lastId: message.id } }),
      // Sending means you've read up to here
      this.prisma.dmMember.update({ where: { dmId_userId: { dmId, userId } }, data: { lastReadId: message.id } }),
    ]);
    return message;
  }

  /** You've seen up to this message. Never moves back. */
  async read(userId: string, dmId: string, messageId: string): Promise<void> {
    const member = await this.member(userId, dmId);
    if (member.lastReadId && member.lastReadId >= messageId) return;
    if (!(await this.prisma.message.count({ where: { id: messageId, dmId } }))) throw new NotFoundException();
    await this.prisma.dmMember.update({ where: { dmId_userId: { dmId, userId } }, data: { lastReadId: messageId } });
  }

  private unreadIn(dmId: string, userId: string, lastReadId: string | null) {
    return this.prisma.message.count({
      where: { dmId, deletedAt: null, ready: true, authorId: { not: userId }, ...(lastReadId && { id: { gt: lastReadId } }) },
    });
  }

  /** Whether you're friends with each of these people, and whether you've blocked them. */
  private async standings(userId: string, others: string[]) {
    const [friends, blocks] = await Promise.all([
      this.prisma.friendship.findMany({ where: { userId, friendId: { in: others } }, select: { friendId: true } }),
      this.prisma.block.findMany({ where: { userId, blockedId: { in: others } }, select: { blockedId: true } }),
    ]);
    const friendSet = new Set(friends.map((f) => f.friendId));
    const blockedSet = new Set(blocks.map((b) => b.blockedId));
    return (id: string) => ({ friend: friendSet.has(id), blocked: blockedSet.has(id) });
  }

  /** One of the DM's two people, or 404 (nobody else learns it exists). */
  private async member(userId: string, dmId: string) {
    await requireSignedUp(this.prisma, userId);
    const member = await this.prisma.dmMember.findUnique({ where: { dmId_userId: { dmId, userId } }, include: { dm: true } });
    if (!member) throw new NotFoundException();
    return member;
  }
}
