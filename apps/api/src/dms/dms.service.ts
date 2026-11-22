import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MESSAGES_PAGE } from '@connecta/shared';
import { requireSignedUp } from '../accounts/signed-up.js';
import { ChatService, dmPeople, messageInclude, toMessage, type SendInput } from '../chat/chat.service.js';
import type { Card, ChatMessage, MessagePage } from '../chat/chat.schemas.js';
import { PresenceService } from '../presence/presence.service.js';
import { RoomsService } from '../rooms/rooms.service.js';
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
    private readonly presence: PresenceService,
    private readonly rooms: RoomsService,
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
                kind: last.kind as 'text' | 'ask' | 'invite',
                text: last.deletedAt ? '' : last.text,
                mine: last.authorId === userId,
                pictures: !last.deletedAt && last.pictures.length > 0,
                deleted: !!last.deletedAt,
                createdAt: last.createdAt.toISOString(),
              }
            : null,
          muted: m.muted,
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
    const mine = dm && (await this.prisma.dmMember.findUnique({ where: { dmId_userId: { dmId: dm.id, userId } } }));
    return { id: dm?.id ?? null, with: toPerson(other), ...standing, muted: !!mine?.muted, sharedRooms: shared };
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
    await this.mustBeFriends(userId, member.dm.pair);
    if (input.replyToId) {
      const original = await this.prisma.message.findFirst({ where: { id: input.replyToId, dmId, ready: true } });
      if (!original) throw new NotFoundException('That message is gone');
    }
    const { mentions } = await this.chat.dmMentions(member.dm.pair, input.text);
    return this.post(userId, dmId, () => this.chat.create(userId, { dmId }, input, mentions, false));
  }

  /**
   * "Ask to join": your friend is in a room you can't just walk into, so you ask them in your DM.
   * They answer with Send invite (you get a link back) or Not now.
   */
  async askToJoin(userId: string, handle: string): Promise<ChatMessage> {
    const { dmId, other } = await this.friendDm(userId, handle);
    const roomId = await this.presence.roomOf(other.id);
    const visible = roomId && !other.appearOffline;
    if (!visible) throw new BadRequestException({ message: `${other.name} isn’t in a room right now`, code: 'not_in_room' });
    if (await this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } } })) {
      throw new BadRequestException({ message: 'You’re a member: walk right in', code: 'member' });
    }
    return this.post(userId, dmId, () =>
      this.chat.create(userId, { dmId }, { text: '' }, [], false, {
        kind: 'ask',
        card: { roomId, state: 'open', invite: null, room: null },
      }),
    );
  }

  /** Answering an ask sent to you: Send invite posts a link back; Not now just closes it. */
  async answer(userId: string, messageId: string, send: boolean): Promise<ChatMessage> {
    const ask = await this.prisma.message.findUnique({ where: { id: messageId }, include: { dm: true } });
    if (!ask?.dm || ask.kind !== 'ask' || ask.deletedAt || !dmPeople(ask.dm.pair).includes(userId)) throw new NotFoundException();
    if (ask.authorId === userId) throw new ForbiddenException('That’s your own ask');
    const card = ask.card as Card;
    if (card.state !== 'open') throw new ConflictException('Already answered');
    await this.mustBeFriends(userId, ask.dm.pair);
    if (send) await this.postInvite(userId, ask.dm.id, card.roomId);
    return this.chat.updateCard(messageId, { ...card, state: send ? 'sent' : 'declined' });
  }

  /** "Invite to a room": a link to one of your rooms, as a card in your DM with a friend. */
  async invite(userId: string, handle: string, roomId: string): Promise<ChatMessage> {
    const { dmId } = await this.friendDm(userId, handle);
    return this.postInvite(userId, dmId, roomId);
  }

  /**
   * A member invite if you may make one there (the owner and mods, or members when "Members can
   * invite" is on), otherwise a 24-hour guest pass if the room takes guests (feature 5).
   */
  private async postInvite(userId: string, dmId: string, roomId: string): Promise<ChatMessage> {
    const [room, me] = await Promise.all([
      this.prisma.room.findUnique({ where: { id: roomId } }),
      this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } } }),
    ]);
    if (!room || !me) throw new NotFoundException();
    const asMember = me.role !== 'member' || room.membersCanInvite;
    if (!asMember && !room.allowGuests) {
      throw new ForbiddenException({
        message: 'Only the owner and mods invite people to this room, and it takes no guests',
        code: 'cant_invite',
      });
    }
    const kind = asMember ? 'member' : 'guest';
    const invite = await this.rooms.makeInvite(roomId, userId, { kind, expiry: '7d', fresh: true }, new Date(), true);
    const card: Card = {
      roomId,
      state: null,
      invite: { code: invite.code, kind: invite.kind, expiresAt: invite.expiresAt },
      room: { name: room.name, emoji: room.emoji, mapId: room.mapId },
    };
    return this.post(userId, dmId, () => this.chat.create(userId, { dmId }, { text: '' }, [], false, { kind: 'invite', card }));
  }

  /** Writes a message in the DM, then moves the list's order and your read marker to it. */
  private async post(userId: string, dmId: string, write: () => Promise<ChatMessage>): Promise<ChatMessage> {
    const message = await write();
    await this.prisma.$transaction([
      this.prisma.dm.update({ where: { id: dmId }, data: { lastId: message.id } }),
      // Sending means you've read up to here
      this.prisma.dmMember.update({ where: { dmId_userId: { dmId, userId } }, data: { lastReadId: message.id } }),
    ]);
    return message;
  }

  /** Your DM with a friend (by @handle), made if it isn't yet. */
  private async friendDm(userId: string, handle: string) {
    const opened = await this.open(userId, handle);
    if (!opened.friend || !opened.id) {
      throw new ForbiddenException({ message: 'You’re not friends any more, so this chat is read-only.', code: 'not_friends' });
    }
    const other = await this.prisma.user.findUniqueOrThrow({ where: { id: opened.with.id } });
    return { dmId: opened.id, other };
  }

  private async mustBeFriends(userId: string, pair: string) {
    const other = dmPeople(pair).find((id) => id !== userId)!;
    if (!(await this.standings(userId, [other]))(other).friend) {
      throw new ForbiddenException({ message: 'You’re not friends any more, so this chat is read-only.', code: 'not_friends' });
    }
  }

  /** You've seen up to this message. Never moves back. */
  async read(userId: string, dmId: string, messageId: string): Promise<void> {
    const member = await this.member(userId, dmId);
    if (member.lastReadId && member.lastReadId >= messageId) return;
    if (!(await this.prisma.message.count({ where: { id: messageId, dmId } }))) throw new NotFoundException();
    await this.prisma.dmMember.update({ where: { dmId_userId: { dmId, userId } }, data: { lastReadId: messageId } });
  }

  /** Mute or unmute a chat for yourself; they're never told. */
  async mute(userId: string, dmId: string, muted: boolean): Promise<void> {
    await this.member(userId, dmId);
    await this.prisma.dmMember.update({ where: { dmId_userId: { dmId, userId } }, data: { muted } });
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
