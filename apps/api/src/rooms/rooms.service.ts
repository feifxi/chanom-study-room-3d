import { randomInt } from 'node:crypto';
import { hasPlus, planFor, roomPlus } from '../plus/plus.js';
import { petsOf } from '../shop/pets.js';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  canActOn,
  DEFAULT_ROOM_RULES,
  GUEST_PASS_HOURS,
  INVITE_EXPIRY_HOURS,
  MAP_EMOJI,
  maxInside,
  planOf,
  REQUEST_COOLDOWN_DAYS,
  TIMEOUT_MINUTES,
  type InviteExpiry,
  type MapId,
  type QuietBy,
  type RoomRole,
  type RoomSize,
  type PlayerRole,
  type Timeout,
} from '@connecta/shared';
import { requireSignedUp } from '../accounts/signed-up.js';
import { Prisma, type Membership } from '../generated/prisma/client.js';
import { ChatService } from '../chat/chat.service.js';
import { GameService } from '../game/game.service.js';
import { LiveService } from '../live/live.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PresenceService } from '../presence/presence.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPerson } from './person.js';
import { thumbnailUrl, ThumbnailService } from './thumbnail.service.js';
import {
  MOD_SETTINGS,
  type Ban,
  type InvitePreview,
  type InviteView,
  type JoinRequestView,
  type ListedRoom,
  type Member,
  type MyPlace,
  type Person,
  type Room,
  type RoomSettingsBody,
} from './rooms.schemas.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Short random ids for rooms and invite codes: no 0/o, 1/l/i, so they read aloud and type easily. */
const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const randomCode = (length: number) => Array.from({ length }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
/** 31^10 room ids; 31^8 invite codes (opening one is rate-limited) */
const ROOM_ID_LENGTH = 10;
const INVITE_CODE_LENGTH = 8;

const ROLE_ORDER: Record<RoomRole, number> = { owner: 0, mod: 1, member: 2 };

/** What a room view needs: its owner and mods, your own membership, your request and guest pass, the counts. */
const roomInclude = (userId: string) =>
  ({
    members: {
      where: { OR: [{ role: { in: ['owner', 'mod'] } }, { userId }] },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    },
    requests: { where: { userId } },
    guests: { where: { userId } },
    _count: { select: { members: true, requests: { where: { declinedAt: null } } } },
  }) satisfies Prisma.RoomInclude;
type RoomRow = Prisma.RoomGetPayload<{ include: ReturnType<typeof roomInclude> }>;

/**
 * Rooms and membership (docs/features/03-rooms-membership.md): making and setting up rooms,
 * the three roles, Ask to join, invites and guest passes, kick, ban and time out. Every action is
 * checked here against the role rules; the web app only hides buttons.
 */
@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly live: LiveService,
    private readonly presence: PresenceService,
    private readonly inbox: NotificationsService,
    private readonly game: GameService,
    private readonly thumbnails: ThumbnailService,
    private readonly audit: AuditService,
  ) {}

  /** Room mods' actions go in the team's audit log too, so a report can be read beside them */
  private logMod(
    action: string,
    roomId: string,
    by: string,
    whoId: string,
    extra: { reason?: string; details?: Record<string, unknown> } = {},
  ) {
    return this.audit.record({
      by,
      action: `roommod.${action}`,
      targetKind: 'user',
      targetId: whoId,
      reason: extra.reason,
      details: { roomId, ...extra.details },
    });
  }

  // ── Your rooms ────────────────────────────────────────────────────────────────────────────────

  /** Home: every room you're a member of. */
  async mine(userId: string, now = new Date()): Promise<Room[]> {
    await requireSignedUp(this.prisma, userId);
    const rooms = await this.prisma.room.findMany({
      where: { members: { some: { userId } } },
      include: roomInclude(userId),
    });
    return Promise.all(rooms.map((r) => this.withUnread(this.toRoom(r, userId, now), r, userId)));
  }

  async make(userId: string, input: { name: string; mapId: MapId }, now = new Date()): Promise<Room> {
    const user = await requireSignedUp(this.prisma, userId);
    await this.checkRoomLimit(userId);
    // Rooms you can make: 10, 30 with Plus
    const owns = await this.prisma.membership.count({ where: { userId, role: 'owner' } });
    if (owns >= planFor(user, now).owns) {
      throw new ConflictException({ code: 'too_many_owned', message: `You own ${owns} rooms; that’s the most on your plan` });
    }
    const room = await this.prisma.room.create({
      data: {
        id: randomCode(ROOM_ID_LENGTH),
        name: input.name,
        emoji: MAP_EMOJI[input.mapId],
        mapId: input.mapId,
        rules: DEFAULT_ROOM_RULES,
        members: { create: { userId, role: 'owner', visitedAt: now } },
      },
      include: roomInclude(userId),
    });
    return this.toRoom(room, userId, now);
  }

  /**
   * One room: for its members, for anyone when it's listed in Discover (the preview before joining),
   * and for someone a guest pass let in. Anyone else gets 404, so private rooms can't be probed.
   */
  async get(roomId: string, userId: string, now = new Date()): Promise<Room> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, include: roomInclude(userId) });
    if (!room) throw new NotFoundException();
    const mine = room.members.some((m) => m.userId === userId);
    const guest = room.guests.some((g) => g.until > now);
    if (!mine && !guest && room.visibility === 'private') throw new NotFoundException();
    return this.withUnread(this.toRoom(room, userId, now), room, userId);
  }

  /** Room settings: the owner changes anything, mods only the invite and safety settings. */
  async update(roomId: string, userId: string, input: RoomSettingsBody, now = new Date()): Promise<Room> {
    const me = await this.membership(roomId, userId);
    if (me.role === 'member') throw new ForbiddenException('Only the owner and mods change room settings');
    if (me.role === 'mod') {
      const ownerOnly = Object.keys(input).filter((k) => !(MOD_SETTINGS as readonly string[]).includes(k));
      if (ownerOnly.length) throw new ForbiddenException(`Only the owner changes ${ownerOnly.join(', ')}`);
    }
    const room = await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    const owner = await this.ownerOf(roomId);
    // During the grace a Big room stays Big, but only Plus switches a room to Big
    const plus = roomPlus(owner, now);
    const size = (input.size ?? room.size) as RoomSize;
    if (size === 'big' && room.size !== 'big' && !hasPlus(owner, now)) {
      throw new ForbiddenException({ code: 'plus_only', message: 'Big maps need the owner’s Plus' });
    }
    const max = maxInside(plus, size);
    if (input.capacity !== undefined && input.capacity > max) throw new BadRequestException(`At most ${max} people at once`);

    const data: Prisma.RoomUpdateInput = { ...input };
    // A smaller map or plan lowers the cap with it
    if (input.capacity === undefined && room.capacity !== null && room.capacity > max) data.capacity = max;
    await this.prisma.room.update({ where: { id: roomId }, data });
    // Live switch (feature 7): everyone inside moves to the new map's door
    if (input.mapId && input.mapId !== room.mapId) this.game.roomEvent({ roomId, type: 'map', mapId: input.mapId });
    // Guests inside can start or stop talking at once
    if (input.guestVoice !== undefined && input.guestVoice !== room.guestVoice)
      this.game.roomEvent({ roomId, type: 'guestVoice', on: input.guestVoice });
    // Bubbles inside follow Filter words at once
    if (input.filterWords !== undefined && input.filterWords !== room.filterWords)
      this.game.roomEvent({ roomId, type: 'filterWords', on: input.filterWords });
    // Room-wide games off: a Pick a Side game on the floor ends
    if (input.roomWideGames !== undefined && input.roomWideGames !== room.roomWideGames)
      this.game.roomEvent({ roomId, type: 'roomWideGames', on: input.roomWideGames });
    return this.get(roomId, userId, now);
  }

  /** Deletes the room with its chat and members, for everyone. Owner only, confirmed by typing its name. */
  async remove(roomId: string, userId: string, typedName: string): Promise<void> {
    const me = await this.membership(roomId, userId);
    if (me.role !== 'owner') throw new ForbiddenException('Only the owner deletes the room');
    const room = await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    if (typedName.trim().toLowerCase() !== room.name.toLowerCase()) throw new BadRequestException('Type the room name to confirm');
    await this.prisma.room.delete({ where: { id: roomId } });
    await this.thumbnails.drop(room.thumbnailKey);
    this.game.roomEvent({ roomId, type: 'deleted' });
  }

  /** Hands the room to another member; the old owner stays on as a mod. */
  async transfer(roomId: string, userId: string, toUserId: string, now = new Date()): Promise<Room> {
    const me = await this.membership(roomId, userId);
    if (me.role !== 'owner') throw new ForbiddenException('Only the owner hands the room over');
    if (toUserId === userId) throw new BadRequestException('You already own it');
    await this.membership(roomId, toUserId, 'They’re not a member');
    await this.prisma.$transaction([
      this.prisma.membership.update({ where: { roomId_userId: { roomId, userId: toUserId } }, data: { role: 'owner' } }),
      this.prisma.membership.update({ where: { roomId_userId: { roomId, userId } }, data: { role: 'mod' } }),
      this.prisma.room.update({ where: { id: roomId }, data: { heirId: null } }),
    ]);
    this.game.roomEvent({ roomId, type: 'role', userId: toUserId, role: 'owner' });
    this.game.roomEvent({ roomId, type: 'role', userId, role: 'mod' });
    return this.get(roomId, userId, now);
  }

  /** Pinning and notifications: yours alone. */
  async updateMyPlace(roomId: string, userId: string, input: { pinned?: boolean; notify?: string }, now = new Date()): Promise<Room> {
    await this.membership(roomId, userId);
    await this.prisma.membership.update({ where: { roomId_userId: { roomId, userId } }, data: input });
    return this.get(roomId, userId, now);
  }

  /** Opened the room (its page or walking in): Home puts recent rooms first. */
  async visit(roomId: string, userId: string, now = new Date()): Promise<void> {
    await this.prisma.membership.updateMany({ where: { roomId, userId }, data: { visitedAt: now } });
  }

  async leave(roomId: string, userId: string): Promise<void> {
    const me = await this.membership(roomId, userId);
    if (me.role === 'owner') throw new ConflictException({ code: 'owner_leaves', message: 'Hand the room over or delete it first' });
    await this.prisma.membership.delete({ where: { roomId_userId: { roomId, userId } } });
    this.live.leaveRoom(userId, roomId);
    this.game.roomEvent({ roomId, type: 'left', userId });
  }

  // ── Getting in ────────────────────────────────────────────────────────────────────────────────

  /** Join an Open room (one button, "Join & walk in"). */
  async join(roomId: string, userId: string, now = new Date()): Promise<Room> {
    await requireSignedUp(this.prisma, userId);
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException();
    if (await this.isMember(roomId, userId)) return this.get(roomId, userId, now);
    if (room.visibility === 'private') throw new NotFoundException();
    if (room.visibility === 'request') throw new ForbiddenException({ code: 'ask', message: 'This room asks first' });
    await this.addMember(roomId, userId, now);
    return this.get(roomId, userId, now);
  }

  /** Ask to join, with an optional note for the mods. A declined person waits 7 days to ask again. */
  async ask(roomId: string, userId: string, note: string | undefined, now = new Date()): Promise<Room> {
    await requireSignedUp(this.prisma, userId);
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.visibility === 'private') throw new NotFoundException();
    if (room.visibility === 'open') throw new ConflictException({ code: 'open', message: 'Anyone can join this room' });
    if (await this.isMember(roomId, userId)) return this.get(roomId, userId, now);
    await this.checkNotBanned(roomId, userId);
    const old = await this.prisma.joinRequest.findUnique({ where: { roomId_userId: { roomId, userId } } });
    const askAgainAt = old?.declinedAt && new Date(old.declinedAt.getTime() + REQUEST_COOLDOWN_DAYS * DAY_MS);
    if (askAgainAt && askAgainAt > now) {
      throw new ConflictException({ code: 'too_soon', askAgainAt: askAgainAt.toISOString(), message: 'Declined recently' });
    }
    if (!old || old.declinedAt) {
      const data = { note: note || null, createdAt: now, declinedAt: null };
      await this.prisma.joinRequest.upsert({
        where: { roomId_userId: { roomId, userId } },
        create: { roomId, userId, ...data },
        update: data,
      });
      const who = await this.person(userId);
      if (who) await this.inbox.joinRequest(roomId, who);
    }
    return this.get(roomId, userId, now);
  }

  async requests(roomId: string, userId: string): Promise<JoinRequestView[]> {
    await this.moderator(roomId, userId);
    const rows = await this.prisma.joinRequest.findMany({
      where: { roomId, declinedAt: null },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({ person: toPerson(r.user), note: r.note, at: r.createdAt.toISOString() }));
  }

  /** Let in (a member now) or decline (they can ask again in 7 days). */
  async decide(roomId: string, userId: string, whoId: string, letIn: boolean, now = new Date()): Promise<void> {
    await this.moderator(roomId, userId);
    const request = await this.prisma.joinRequest.findUnique({ where: { roomId_userId: { roomId, userId: whoId } } });
    if (!request || request.declinedAt) throw new NotFoundException('No request from them');
    if (!letIn) {
      await this.prisma.joinRequest.update({ where: { roomId_userId: { roomId, userId: whoId } }, data: { declinedAt: now } });
      return;
    }
    await this.addMember(roomId, whoId, now);
    await this.prisma.joinRequest.delete({ where: { roomId_userId: { roomId, userId: whoId } } });
    await this.inbox.joined(whoId, roomId);
  }

  // ── Members and roles ─────────────────────────────────────────────────────────────────────────

  /** Everyone in the room: owner, then mods, then members by when they joined. */
  async members(roomId: string, userId: string, now = new Date()): Promise<Member[]> {
    await this.membership(roomId, userId);
    const rows = await this.prisma.membership.findMany({ where: { roomId }, include: { user: true }, orderBy: { joinedAt: 'asc' } });
    return rows
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
      .map((m) => ({
        person: toPerson(m.user),
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        timedOutUntil: m.timedOutUntil && m.timedOutUntil > now ? m.timedOutUntil.toISOString() : null,
      }));
  }

  /** Make or remove a mod: owner only. */
  async setRole(roomId: string, userId: string, whoId: string, role: 'mod' | 'member'): Promise<void> {
    const me = await this.membership(roomId, userId);
    if (me.role !== 'owner') throw new ForbiddenException('Only the owner makes mods');
    const them = await this.membership(roomId, whoId, 'They’re not a member');
    if (them.role === 'owner') throw new ForbiddenException('The owner stays the owner; hand the room over instead');
    await this.prisma.membership.update({ where: { roomId_userId: { roomId, userId: whoId } }, data: { role } });
    this.game.roomEvent({ roomId, type: 'role', userId: whoId, role });
    await this.logMod(role === 'mod' ? 'make_mod' : 'remove_mod', roomId, userId, whoId);
  }

  /** Removed from the room (a member, or a guest whose pass ends); a new invite brings them back. */
  async kick(roomId: string, userId: string, whoId: string, now = new Date()): Promise<void> {
    await this.actOn(roomId, userId, whoId, false);
    const [member, guest] = await Promise.all([
      this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId: whoId } } }),
      this.prisma.guestVisit.findUnique({ where: { roomId_userId: { roomId, userId: whoId } } }),
    ]);
    if (!member && !(guest && guest.until > now)) throw new NotFoundException('They’re not in this room');
    await this.prisma.$transaction([
      this.prisma.membership.deleteMany({ where: { roomId, userId: whoId } }),
      this.prisma.guestVisit.deleteMany({ where: { roomId, userId: whoId } }),
    ]);
    this.live.leaveRoom(whoId, roomId);
    this.game.roomEvent({ roomId, type: 'kick', userId: whoId });
    await this.logMod('kick', roomId, userId, whoId);
  }

  /** They stay, but can't talk or type until it runs out. */
  async timeOut(roomId: string, userId: string, whoId: string, duration: Timeout, now = new Date()): Promise<void> {
    await this.actOn(roomId, userId, whoId, true);
    const until = new Date(now.getTime() + TIMEOUT_MINUTES[duration] * 60_000);
    await this.prisma.membership.update({
      where: { roomId_userId: { roomId, userId: whoId } },
      data: { timedOutUntil: until, timedOutBy: 'mod' },
    });
    // Inside 3D too: no bubbles or typing until then
    this.game.roomEvent({ roomId, type: 'timeout', userId: whoId, until: until.getTime(), by: 'mod' });
    await this.logMod('timeout', roomId, userId, whoId, { details: { duration } });
  }

  /** Removed, and can't rejoin, ask or use guest passes. Works on members and on people who aren't (a guest, someone asking). */
  async ban(roomId: string, userId: string, whoId: string, reason: string | undefined): Promise<void> {
    await this.actOn(roomId, userId, whoId, false);
    if (!(await this.prisma.user.findUnique({ where: { id: whoId } }))) throw new NotFoundException();
    const data = { byId: userId, reason: reason || null, createdAt: new Date() };
    await this.prisma.$transaction([
      this.prisma.membership.deleteMany({ where: { roomId, userId: whoId } }),
      this.prisma.joinRequest.deleteMany({ where: { roomId, userId: whoId } }),
      this.prisma.guestVisit.deleteMany({ where: { roomId, userId: whoId } }),
      this.prisma.roomBan.upsert({
        where: { roomId_userId: { roomId, userId: whoId } },
        create: { roomId, userId: whoId, ...data },
        update: data,
      }),
    ]);
    this.live.leaveRoom(whoId, roomId);
    this.game.roomEvent({ roomId, type: 'ban', userId: whoId });
    await this.logMod('ban', roomId, userId, whoId, { reason });
  }

  async bans(roomId: string, userId: string): Promise<Ban[]> {
    await this.moderator(roomId, userId);
    const rows = await this.prisma.roomBan.findMany({ where: { roomId }, include: { user: true }, orderBy: { createdAt: 'desc' } });
    const byIds = [...new Set(rows.map((r) => r.byId))];
    const by = new Map((await this.prisma.user.findMany({ where: { id: { in: byIds } } })).map((u) => [u.id, toPerson(u)]));
    return rows.map((r) => ({ person: toPerson(r.user), by: by.get(r.byId) ?? null, reason: r.reason, at: r.createdAt.toISOString() }));
  }

  /** Unbanned: they need a new invite to come back. */
  async unban(roomId: string, userId: string, whoId: string): Promise<void> {
    await this.moderator(roomId, userId);
    await this.prisma.roomBan.deleteMany({ where: { roomId, userId: whoId } });
    await this.logMod('unban', roomId, userId, whoId);
  }

  // ── Walking in (the game server) ──────────────────────────────────────────────────────────────

  /**
   * A join ticket for the game server: members, and guests while their pass lasts. It carries your
   * name, look and role and the room's capacity, so the game server needs no database.
   */
  async ticket(roomId: string, userId: string, now = new Date()): Promise<{ ticket: string; place: string }> {
    const [room, user, member, guest, ban] = await Promise.all([
      this.prisma.room.findUnique({ where: { id: roomId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } } }),
      this.prisma.guestVisit.findUnique({ where: { roomId_userId: { roomId, userId } } }),
      this.prisma.roomBan.findUnique({ where: { roomId_userId: { roomId, userId } } }),
    ]);
    if (!room || !user) throw new NotFoundException();
    if (room.closedAt) throw new ForbiddenException({ code: 'closed', message: 'The Connecta team closed this room' });
    if (ban) throw new ForbiddenException({ code: 'banned', message: 'You can’t join this room' });
    if (!user.isAnonymous && !user.handle) throw new ForbiddenException('Finish signing up first');
    const role: PlayerRole | null = member ? member.role : guest && guest.until > now ? 'guest' : null;
    if (!role) throw new NotFoundException();
    const person = toPerson(user);
    const max = maxInside(roomPlus(await this.ownerOf(roomId), now), room.size as RoomSize);
    const ticket = await this.game.ticket({
      sub: userId,
      roomId,
      handle: person.handle,
      name: person.name,
      look: person.look,
      role,
      capacity: Math.min(room.capacity ?? max, max),
      mapId: room.mapId,
      timedOutUntil: Math.max(
        member?.timedOutUntil && member.timedOutUntil > now ? member.timedOutUntil.getTime() : 0,
        !member && guest?.timedOutUntil && guest.timedOutUntil > now ? guest.timedOutUntil.getTime() : 0,
      ),
      // A guest's mute only ever comes from reports
      timedOutBy: member ? ((member.timedOutBy as QuietBy | null) ?? 'mod') : 'reports',
      guestVoice: room.guestVoice,
      roomWideGames: room.roomWideGames,
      filterWords: room.filterWords,
      pets: await petsOf(this.prisma, userId),
      plus: hasPlus(user, now),
    });
    return { ticket, place: roomId };
  }

  /** "Full · notify me": a 🔔 item once someone leaves (members and guest pass holders). */
  async notifyWhenSpace(roomId: string, userId: string, now = new Date()): Promise<void> {
    const [member, guest] = await Promise.all([
      this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } } }),
      this.prisma.guestVisit.findUnique({ where: { roomId_userId: { roomId, userId } } }),
    ]);
    if (!member && !(guest && guest.until > now)) throw new NotFoundException();
    await this.game.waitForSpace(roomId, userId);
  }

  // ── Invites ───────────────────────────────────────────────────────────────────────────────────

  /**
   * Your invite link for this room. Asking again gives back the same link while at least half its
   * time is left (so the dialog doesn't mint a new code each time it opens); `fresh` always makes one.
   */
  async makeInvite(
    roomId: string,
    userId: string,
    input: { kind: 'member' | 'guest'; expiry: InviteExpiry; fresh: boolean },
    now = new Date(),
    /** A guest pass for a friend from DMs (feature 5): any member may make one if the room takes guests */
    forFriend = false,
  ): Promise<InviteView> {
    const me = await this.membership(roomId, userId);
    const room = await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    const friendPass = forFriend && input.kind === 'guest';
    if (me.role === 'member' && !room.membersCanInvite && !friendPass) throw new ForbiddenException('Only the owner and mods invite here');
    if (input.kind === 'guest' && !room.allowGuests)
      throw new ForbiddenException({ code: 'no_guests', message: 'This room has no guests' });

    const expiry = input.kind === 'guest' ? '24h' : input.expiry;
    const hours = input.kind === 'guest' ? GUEST_PASS_HOURS : INVITE_EXPIRY_HOURS[input.expiry];
    if (!input.fresh) {
      const halfLeft = hours === null ? undefined : new Date(now.getTime() + (hours * HOUR_MS) / 2);
      const mine = await this.prisma.invite.findFirst({
        where: {
          roomId,
          createdById: userId,
          kind: input.kind,
          expiry,
          cancelledAt: null,
          ...(halfLeft ? { expiresAt: { gt: halfLeft } } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });
      if (mine) return this.toInvite(mine, await this.person(userId));
    }
    const invite = await this.prisma.invite.create({
      data: {
        code: randomCode(INVITE_CODE_LENGTH),
        roomId,
        kind: input.kind,
        createdById: userId,
        expiry,
        expiresAt: hours === null ? null : new Date(now.getTime() + hours * HOUR_MS),
        createdAt: now,
      },
    });
    return this.toInvite(invite, await this.person(userId));
  }

  /** Room settings → Invites: the links that still work. */
  async invites(roomId: string, userId: string, now = new Date()): Promise<InviteView[]> {
    await this.moderator(roomId, userId);
    const rows = await this.prisma.invite.findMany({
      where: { roomId, cancelledAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { createdAt: 'desc' },
    });
    const people = new Map(
      (await this.prisma.user.findMany({ where: { id: { in: rows.map((r) => r.createdById) } } })).map((u) => [u.id, toPerson(u)]),
    );
    return rows.map((r) => this.toInvite(r, people.get(r.createdById) ?? null));
  }

  /** Stops a link working right away: the owner and mods, or whoever made it. */
  async cancelInvite(code: string, userId: string, now = new Date()): Promise<void> {
    const invite = await this.prisma.invite.findUnique({ where: { code } });
    if (!invite) throw new NotFoundException();
    if (invite.createdById !== userId) await this.moderator(invite.roomId, userId);
    await this.prisma.invite.update({ where: { code }, data: { cancelledAt: now } });
  }

  /** What /i/<code> and /g/<code> show, to anyone (signed in or not). 404 once it's cancelled or expired. */
  async preview(code: string, userId: string | null, now = new Date()): Promise<InvitePreview> {
    const invite = await this.liveInvite(code, now);
    const room = await this.prisma.room.findUniqueOrThrow({
      where: { id: invite.roomId },
      include: { _count: { select: { members: true } } },
    });
    return {
      code: invite.code,
      kind: invite.kind,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      by: await this.person(invite.createdById),
      room: {
        id: room.id,
        name: room.name,
        emoji: room.emoji,
        description: room.description,
        mapId: room.mapId as MapId,
        thumbnail: thumbnailUrl(room.id, room.thumbnailKey),
        memberCount: room._count.members,
        allowGuests: room.allowGuests,
      },
      member: userId ? await this.isMember(room.id, userId) : false,
    };
  }

  /**
   * Uses a link. A member invite makes you a member (accounts only). A guest pass lets you walk into
   * that one room until the pass runs out, with or without an account.
   */
  async accept(code: string, userId: string, now = new Date()): Promise<{ roomId: string; guestUntil: string | null }> {
    const invite = await this.liveInvite(code, now);
    const { roomId } = invite;
    if (await this.isMember(roomId, userId)) return { roomId, guestUntil: null };
    await this.checkNotBanned(roomId, userId);

    if (invite.kind === 'member') {
      await requireSignedUp(this.prisma, userId);
      await this.addMember(roomId, userId, now);
      await this.prisma.$transaction([
        this.prisma.invite.update({ where: { code }, data: { uses: { increment: 1 } } }),
        // Already asked to join: the invite settles it
        this.prisma.joinRequest.deleteMany({ where: { roomId, userId } }),
      ]);
      return { roomId, guestUntil: null };
    }

    const room = await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    if (!room.allowGuests) throw new ForbiddenException({ code: 'no_guests', message: 'This room has stopped taking guests' });
    const until = invite.expiresAt!;
    await this.prisma.$transaction([
      this.prisma.guestVisit.upsert({
        where: { roomId_userId: { roomId, userId } },
        create: { roomId, userId, until },
        update: { until },
      }),
      this.prisma.invite.update({ where: { code }, data: { uses: { increment: 1 } } }),
    ]);
    return { roomId, guestUntil: until.toISOString() };
  }

  // ── Discover ──────────────────────────────────────────────────────────────────────────────────

  /** Listed rooms (Ask to join and Open): where your friends are first, then the busiest now, then the biggest. */
  async listed(viewer: string | null, filter: { q?: string; tag?: string; language?: string }, now = new Date()): Promise<ListedRoom[]> {
    // Signed out (browsing Discover): no id matches '', so "you" are in no room and asked for none
    const userId = viewer ?? '';
    const rooms = await this.prisma.room.findMany({
      where: {
        visibility: { in: ['request', 'open'] },
        // Taken off Discover or closed by the Connecta team
        delistedAt: null,
        closedAt: null,
        ...(filter.q ? { name: { contains: filter.q, mode: 'insensitive' } } : {}),
        ...(filter.tag ? { tags: { has: filter.tag } } : {}),
        ...(filter.language ? { language: filter.language } : {}),
      },
      include: roomInclude(userId),
      orderBy: [{ members: { _count: 'desc' } }, { createdAt: 'desc' }],
      take: 60,
    });
    const friends = new Set(
      viewer
        ? (await this.prisma.friendship.findMany({ where: { userId: viewer }, select: { friendId: true } })).map((f) => f.friendId)
        : [],
    );
    const inside = await Promise.all(rooms.map((r) => this.presence.inside(r.id, now.getTime())));
    const rank = rooms.map((r, i) => ({ r, inside: inside[i]!.length, friends: inside[i]!.filter((id) => friends.has(id)).length }));
    // Stable: equal rooms keep the database's order (most members, then newest)
    rank.sort((a, b) => b.friends - a.friends || b.inside - a.inside);
    return rank.map(({ r, inside }) => {
      const room = this.toRoom(r, userId, now);
      return {
        id: room.id,
        name: room.name,
        emoji: room.emoji,
        description: room.description,
        mapId: room.mapId,
        thumbnail: room.thumbnail,
        visibility: room.visibility as 'request' | 'open',
        tags: room.tags,
        language: room.language,
        owner: room.owner,
        memberCount: room.memberCount,
        capacity: room.capacity,
        inside,
        rules: room.showRules ? room.rules : null,
        me: room.me,
      };
    });
  }

  // ── Deleting an account (feature 2) ───────────────────────────────────────────────────────────

  /** The rooms this person owns, for picking who takes each over. */
  async owned(userId: string) {
    return this.prisma.room.findMany({ where: { members: { some: { userId, role: 'owner' } } }, select: { id: true } });
  }

  /** Remembers who takes over each room if the owner's account is deleted. */
  async setHeirs(userId: string, heirs: Record<string, string>): Promise<void> {
    for (const [roomId, heirId] of Object.entries(heirs)) {
      const me = await this.membership(roomId, userId);
      if (me.role !== 'owner') throw new ForbiddenException(`You don’t own ${roomId}`);
      if (heirId === userId) throw new BadRequestException('Pick someone else');
      await this.membership(roomId, heirId, 'The new owner must be a member');
      await this.prisma.room.update({ where: { id: roomId }, data: { heirId } });
    }
  }

  async clearHeirs(userId: string): Promise<void> {
    await this.prisma.room.updateMany({ where: { members: { some: { userId, role: 'owner' } } }, data: { heirId: null } });
  }

  /**
   * An account is going: each room it owns passes to the picked member (or else the longest-serving
   * mod, or else the longest-standing member); a room with nobody else goes too. Then it leaves
   * every room and drops its requests and guest passes.
   */
  async handOverAll(userId: string): Promise<void> {
    const owned = await this.prisma.room.findMany({
      where: { members: { some: { userId, role: 'owner' } } },
      include: { members: { where: { userId: { not: userId } }, orderBy: { joinedAt: 'asc' } } },
    });
    for (const room of owned) {
      const next = room.members.find((m) => m.userId === room.heirId) ?? room.members.find((m) => m.role === 'mod') ?? room.members[0];
      if (!next) {
        await this.prisma.room.delete({ where: { id: room.id } });
        await this.thumbnails.drop(room.thumbnailKey);
        continue;
      }
      await this.prisma.$transaction([
        this.prisma.membership.update({ where: { roomId_userId: { roomId: room.id, userId: next.userId } }, data: { role: 'owner' } }),
        this.prisma.room.update({ where: { id: room.id }, data: { heirId: null } }),
      ]);
    }
    await this.prisma.$transaction([
      this.prisma.membership.deleteMany({ where: { userId } }),
      this.prisma.joinRequest.deleteMany({ where: { userId } }),
      this.prisma.guestVisit.deleteMany({ where: { userId } }),
    ]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────────────────────

  /** Adds your unread count when you're a member (a few small counts per room). */
  private async withUnread(view: Room, room: RoomRow, userId: string): Promise<Room> {
    const mine = room.members.find((m) => m.userId === userId);
    if (!mine) return view;
    const [unread, insideIds] = await Promise.all([this.chat.unread(userId, mine), this.presence.inside(room.id)]);
    const inside = insideIds.length ? await this.prisma.user.findMany({ where: { id: { in: insideIds } } }) : [];
    return { ...view, inside: inside.map(toPerson), me: { ...view.me, ...unread } };
  }

  private toRoom(room: RoomRow, userId: string, now: Date): Room {
    const owner = room.members.find((m) => m.role === 'owner');
    // A room follows its owner's plan (and keeps it through the grace)
    const plus = roomPlus(owner?.user, now);
    const mine = room.members.find((m) => m.userId === userId);
    const request = room.requests[0];
    const guest = room.guests[0];
    const maxCapacity = maxInside(plus, room.size as RoomSize);
    const askAgainAt = request?.declinedAt && new Date(request.declinedAt.getTime() + REQUEST_COOLDOWN_DAYS * DAY_MS);
    const me: MyPlace = {
      role: mine?.role ?? null,
      pinned: mine?.pinned ?? false,
      notify: (mine?.notify ?? 'mentions') as MyPlace['notify'],
      requested: !!request && !request.declinedAt,
      askAgainAt: askAgainAt && askAgainAt > now ? askAgainAt.toISOString() : null,
      guestUntil: guest && guest.until > now ? guest.until.toISOString() : null,
      visitedAt: mine?.visitedAt?.toISOString() ?? null,
      timedOutUntil: mine?.timedOutUntil && mine.timedOutUntil > now ? mine.timedOutUntil.toISOString() : null,
      unread: 0,
      mentioned: false,
    };
    return {
      id: room.id,
      name: room.name,
      emoji: room.emoji,
      description: room.description,
      mapId: room.mapId as MapId,
      thumbnail: thumbnailUrl(room.id, room.thumbnailKey),
      size: room.size as RoomSize,
      time: room.time as Room['time'],
      visibility: room.visibility,
      capacity: Math.min(room.capacity ?? maxCapacity, maxCapacity),
      maxCapacity,
      tags: room.tags,
      language: room.language,
      rules: room.rules,
      showRules: room.showRules,
      filterWords: room.filterWords,
      slowMode: room.slowMode,
      newMemberWait: room.newMemberWait,
      roomWideGames: room.roomWideGames,
      membersCanInvite: room.membersCanInvite,
      allowGuests: room.allowGuests,
      guestVoice: room.guestVoice,
      ownerPlus: plus,
      // A room always has an owner; "Deleted user" only between a purge and its hand-over
      owner: owner ? toPerson(owner.user) : { id: '', name: 'Deleted user', handle: null, look: null },
      mods: room.members.filter((m) => m.role === 'mod').map((m) => toPerson(m.user)),
      memberCount: room._count.members,
      maxMembers: planOf(plus).members,
      requestCount: mine && mine.role !== 'member' ? room._count.requests : 0,
      inside: [],
      me,
    };
  }

  private toInvite(
    invite: { code: string; kind: 'member' | 'guest'; expiry: string; uses: number; expiresAt: Date | null },
    by: Person | null,
  ): InviteView {
    return {
      code: invite.code,
      kind: invite.kind,
      by,
      expiry: invite.expiry as InviteView['expiry'],
      uses: invite.uses,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
    };
  }

  private async person(userId: string): Promise<Person | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? toPerson(user) : null;
  }

  /** Your membership, or 404 (not 403: whether a private room exists is nobody else's business). */
  private async membership(roomId: string, userId: string, notFound?: string): Promise<Membership> {
    const m = await this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } } });
    if (!m) throw new NotFoundException(notFound);
    return m;
  }

  private async moderator(roomId: string, userId: string): Promise<Membership> {
    const m = await this.membership(roomId, userId);
    if (m.role === 'member') throw new ForbiddenException('Only the owner and mods do that');
    return m;
  }

  /** The role rules: owner acts on anyone but themselves, mods on members (and on people who aren't members). */
  private async actOn(roomId: string, userId: string, whoId: string, mustBeMember: boolean): Promise<void> {
    if (whoId === userId) throw new BadRequestException('Not on yourself');
    const me = await this.moderator(roomId, userId);
    const them = await this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId: whoId } } });
    if (!them && mustBeMember) throw new NotFoundException('They’re not a member');
    if (!canActOn(me.role, them?.role ?? 'member')) throw new ForbiddenException('Mods act on members only');
  }

  private async isMember(roomId: string, userId: string): Promise<boolean> {
    return !!(await this.prisma.membership.findUnique({ where: { roomId_userId: { roomId, userId } } }));
  }

  private async checkNotBanned(roomId: string, userId: string): Promise<void> {
    const ban = await this.prisma.roomBan.findUnique({ where: { roomId_userId: { roomId, userId } } });
    if (ban) throw new ForbiddenException({ code: 'banned', message: 'You can’t join this room' });
  }

  /** The room's owner (whose plan the room follows) */
  private async ownerOf(roomId: string) {
    const owner = await this.prisma.membership.findFirst({ where: { roomId, role: 'owner' }, include: { user: true } });
    return owner?.user ?? null;
  }

  /** Someone joins: not banned, the room has space for members, and they're under their room limit. */
  private async addMember(roomId: string, userId: string, now: Date): Promise<void> {
    await this.checkNotBanned(roomId, userId);
    const plus = roomPlus(await this.ownerOf(roomId), now);
    const count = await this.prisma.membership.count({ where: { roomId } });
    if (count >= planOf(plus).members) throw new ConflictException({ code: 'room_full', message: 'This room has all the members it can' });
    await this.checkRoomLimit(userId);
    await this.prisma.membership.create({ data: { roomId, userId, joinedAt: now } });
  }

  /** One person can be in up to 100 rooms (200 with Plus). */
  private async checkRoomLimit(userId: string): Promise<void> {
    const [count, user] = await Promise.all([
      this.prisma.membership.count({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { plusUntil: true } }),
    ]);
    if (count >= planFor(user).rooms) {
      throw new ConflictException({ code: 'too_many_rooms', message: `You’re in ${count} rooms; leave one first` });
    }
  }

  private async liveInvite(code: string, now: Date) {
    const invite = await this.prisma.invite.findUnique({ where: { code } });
    if (!invite || invite.cancelledAt || (invite.expiresAt && invite.expiresAt <= now)) {
      throw new NotFoundException('This link doesn’t work any more');
    }
    return invite;
  }
}
