import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FRIEND_REQUEST_DAYS, FRIEND_REQUESTS_PER_DAY, FRIENDS_MAX, type RequestsFrom } from '@connecta/shared';
import { requireSignedUp } from '../accounts/signed-up.js';
import { PresenceService } from '../presence/presence.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPerson } from '../rooms/person.js';
import type { AddFriendResult, Blocked, Friend, FriendRequests } from './friends.schemas.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Friends (docs/v2/features/05-friends.md): requests by exact @handle, accepting, ignoring and
 * removing (all silent), blocking. A friendship is two rows, one each way.
 */
@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
  ) {}

  async list(userId: string): Promise<Friend[]> {
    await requireSignedUp(this.prisma, userId);
    const rows = await this.prisma.friendship.findMany({
      where: { userId },
      include: { friend: true },
      orderBy: { friend: { name: 'asc' } },
    });
    const presence = await this.presence.views(
      userId,
      rows.map((r) => r.friendId),
    );
    return rows.map((r) => ({ person: toPerson(r.friend), since: r.since.toISOString(), presence: presence.get(r.friendId)! }));
  }

  async requests(userId: string, now = new Date()): Promise<FriendRequests> {
    await requireSignedUp(this.prisma, userId);
    const [incoming, sent, sentToday] = await Promise.all([
      this.prisma.friendRequest.findMany({
        where: {
          toId: userId,
          ignoredAt: null,
          expiresAt: { gt: now },
          // A blocked person's requests are kept (so they see "Pending") but never shown
          from: { blockedBy: { none: { userId } } },
        },
        include: { from: { include: { memberships: { where: { room: { members: { some: { userId } } } }, include: { room: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.friendRequest.findMany({
        where: { fromId: userId, expiresAt: { gt: now } },
        include: { to: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.sentSince(userId, now),
    ]);
    return {
      incoming: incoming.map((r) => ({
        person: toPerson(r.from),
        at: r.createdAt.toISOString(),
        shared: r.from.memberships.map((m) => m.room.name),
      })),
      sent: sent.map((r) => ({ person: toPerson(r.to), at: r.createdAt.toISOString() })),
      leftToday: Math.max(0, FRIEND_REQUESTS_PER_DAY - sentToday),
    };
  }

  /**
   * Add a friend by exact @handle. If they'd already asked you, you're friends right away. Someone
   * who blocked you gets a request they'll never see: you just see "Pending", as with ignoring.
   */
  async add(userId: string, typed: string, now = new Date()): Promise<AddFriendResult> {
    const me = await requireSignedUp(this.prisma, userId);
    const handle = typed.replace(/^@/, '').toLowerCase();
    const them = await this.prisma.user.findFirst({ where: { handle, deletedAt: null, deleteAt: null } });
    if (!them) throw new NotFoundException({ message: `No one is @${handle}. Handles have to match exactly.`, code: 'no_one' });
    if (them.id === me.id) throw new BadRequestException({ message: 'That’s you 😄', code: 'self' });
    if (await this.areFriends(me.id, them.id)) {
      throw new ConflictException({ message: `You and ${them.name} are already friends.`, code: 'already_friends' });
    }
    if (await this.blocked(me.id, them.id)) {
      throw new ForbiddenException({ message: `You blocked ${them.name}. Unblock them first.`, code: 'you_blocked' });
    }

    // They asked you first (and haven't blocked you): accepting is what you meant
    const theirs = await this.prisma.friendRequest.findUnique({ where: { fromId_toId: { fromId: them.id, toId: me.id } } });
    if (theirs && theirs.expiresAt > now && !(await this.blocked(them.id, me.id))) {
      await this.befriend(me.id, them.id);
      return { status: 'friends', person: toPerson(them) };
    }

    const mine = await this.prisma.friendRequest.findUnique({ where: { fromId_toId: { fromId: me.id, toId: them.id } } });
    if (mine && mine.expiresAt > now) return { status: 'sent', person: toPerson(them) };
    if ((await this.sentSince(me.id, now)) >= FRIEND_REQUESTS_PER_DAY) {
      throw new HttpException(
        { message: `That’s ${FRIEND_REQUESTS_PER_DAY} requests today. Try again tomorrow.`, code: 'too_many_today' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!(await this.blocked(them.id, me.id)) && !(await this.accepts(them.requestsFrom as RequestsFrom, me.id, them.id))) {
      throw new ForbiddenException({ message: `${them.name} isn’t taking friend requests right now.`, code: 'not_accepting' });
    }
    const expiresAt = new Date(now.getTime() + FRIEND_REQUEST_DAYS * DAY_MS);
    await this.prisma.friendRequest.upsert({
      where: { fromId_toId: { fromId: me.id, toId: them.id } },
      create: { fromId: me.id, toId: them.id, createdAt: now, expiresAt },
      update: { createdAt: now, expiresAt, ignoredAt: null },
    });
    return { status: 'sent', person: toPerson(them) };
  }

  async accept(userId: string, fromId: string, now = new Date()): Promise<Friend> {
    await requireSignedUp(this.prisma, userId);
    const request = await this.prisma.friendRequest.findUnique({
      where: { fromId_toId: { fromId, toId: userId } },
      include: { from: true },
    });
    if (!request || request.expiresAt <= now || (await this.blocked(userId, fromId))) throw new NotFoundException();
    const since = await this.befriend(userId, fromId);
    const presence = await this.presence.views(userId, [fromId]);
    return { person: toPerson(request.from), since: since.toISOString(), presence: presence.get(fromId)! };
  }

  /** Ignore a request to you: it leaves your list; they still see "Pending" until it expires. */
  async ignore(userId: string, fromId: string): Promise<void> {
    await requireSignedUp(this.prisma, userId);
    await this.prisma.friendRequest.updateMany({ where: { fromId, toId: userId }, data: { ignoredAt: new Date() } });
  }

  /** Take back a request you sent. */
  async cancel(userId: string, toId: string): Promise<void> {
    await requireSignedUp(this.prisma, userId);
    await this.prisma.friendRequest.deleteMany({ where: { fromId: userId, toId } });
  }

  /** Remove a friend, silently. The DM stays as history (feature 4). */
  async remove(userId: string, friendId: string): Promise<void> {
    await requireSignedUp(this.prisma, userId);
    await this.unfriend(userId, friendId);
  }

  async blocks(userId: string): Promise<Blocked[]> {
    await requireSignedUp(this.prisma, userId);
    const rows = await this.prisma.block.findMany({ where: { userId }, include: { blocked: true }, orderBy: { createdAt: 'desc' } });
    return rows.map((r) => ({ person: toPerson(r.blocked), at: r.createdAt.toISOString() }));
  }

  /** Block: ends the friendship and your request to them; theirs to you stays hidden (they see "Pending"). */
  async block(userId: string, blockedId: string): Promise<void> {
    await requireSignedUp(this.prisma, userId);
    if (userId === blockedId) throw new BadRequestException('You can’t block yourself');
    if (!(await this.prisma.user.findUnique({ where: { id: blockedId } }))) throw new NotFoundException();
    await this.prisma.$transaction([
      this.prisma.block.upsert({
        where: { userId_blockedId: { userId, blockedId } },
        create: { userId, blockedId },
        update: {},
      }),
      this.prisma.friendship.deleteMany({
        where: {
          OR: [
            { userId, friendId: blockedId },
            { userId: blockedId, friendId: userId },
          ],
        },
      }),
      this.prisma.friendRequest.deleteMany({ where: { fromId: userId, toId: blockedId } }),
    ]);
  }

  async unblock(userId: string, blockedId: string): Promise<void> {
    await requireSignedUp(this.prisma, userId);
    await this.prisma.block.deleteMany({ where: { userId, blockedId } });
  }

  /** A deleted account leaves everyone's friends, requests and block lists. */
  async forget(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.friendship.deleteMany({ where: { OR: [{ userId }, { friendId: userId }] } }),
      this.prisma.friendRequest.deleteMany({ where: { OR: [{ fromId: userId }, { toId: userId }] } }),
      this.prisma.block.deleteMany({ where: { OR: [{ userId }, { blockedId: userId }] } }),
    ]);
  }

  // ── Checks ──────────────────────────────────────────────────────────────────────────────────────

  private async befriend(a: string, b: string): Promise<Date> {
    for (const id of [a, b]) {
      if ((await this.prisma.friendship.count({ where: { userId: id } })) >= FRIENDS_MAX) {
        throw new ConflictException({
          message: id === a ? `You have ${FRIENDS_MAX.toLocaleString()} friends, the most there can be.` : 'They can’t add more friends.',
          code: 'friends_full',
        });
      }
    }
    const since = new Date();
    await this.prisma.$transaction([
      this.prisma.friendship.createMany({
        data: [
          { userId: a, friendId: b, since },
          { userId: b, friendId: a, since },
        ],
        skipDuplicates: true,
      }),
      this.prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { fromId: a, toId: b },
            { fromId: b, toId: a },
          ],
        },
      }),
    ]);
    return since;
  }

  private unfriend(a: string, b: string) {
    return this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId: a, friendId: b },
          { userId: b, friendId: a },
        ],
      },
    });
  }

  private async areFriends(a: string, b: string) {
    return !!(await this.prisma.friendship.findUnique({ where: { userId_friendId: { userId: a, friendId: b } } }));
  }

  /** Has `by` blocked `who`? */
  private async blocked(by: string, who: string) {
    return !!(await this.prisma.block.findUnique({ where: { userId_blockedId: { userId: by, blockedId: who } } }));
  }

  /** Their Privacy & safety setting: anyone, people sharing a room with them, or nobody. */
  private async accepts(from: RequestsFrom, me: string, them: string) {
    if (from === 'anyone') return true;
    if (from === 'nobody') return false;
    const shared = await this.prisma.membership.count({ where: { userId: me, room: { members: { some: { userId: them } } } } });
    return shared > 0;
  }

  /** Requests sent in the last day (cancelled ones too would be better; the 20 is about spam). */
  private sentSince(userId: string, now: Date) {
    return this.prisma.friendRequest.count({ where: { fromId: userId, createdAt: { gt: new Date(now.getTime() - DAY_MS) } } });
  }
}
