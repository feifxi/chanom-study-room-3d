import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import {
  COMMON_TYPES,
  commonCopyId,
  commonCopyName,
  commonType,
  parseCommonCopy,
  type CommonNotice,
  type CommonType,
  type CommonTypeId,
  TIMEOUT_MINUTES,
  type Timeout,
} from '@connecta/shared';
import { AuditService } from '../audit/audit.service.js';
import type { Env } from '../config/env.js';
import { GameService } from '../game/game.service.js';
import { hasPlus } from '../plus/plus.js';
import { PresenceService } from '../presence/presence.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { toPerson } from '../rooms/person.js';
import type { CommonRoomView, CommonTicket } from './common.schemas.js';

/** A ticket holds a seat this long before its person is inside (two people never get the 20th seat) */
const HOLD_MS = 30_000;

/**
 * Out of Common rooms for a while (feature 14): after enough reports, or the team's Remove. Holds
 * `{ until, by }`; walking in reads it.
 */
export const commonOutKey = (userId: string) => `common:out:${userId}`;
export type CommonOut = { until: number; by: 'reports' | 'team' };

/** How long the team's notice shows */
const NOTICE_MINUTES = 10;

/** How long the team's Remove from Common rooms lasts */
const TEAM_REMOVE_MINUTES = 60;

const key = {
  /** Timed out by the team: no bubbles until then, wherever in Common rooms they walk */
  quiet: (userId: string) => `common:quiet:${userId}`,
  /** The team's notice in every Common room ({@link CommonNotice}) */
  notice: 'common:notice',
  /** The copy numbers open for a type */
  copies: (type: string) => `common:copies:${type}`,
  /** Seats held by fresh tickets in a copy: userId → when */
  held: (copyId: string) => `common:held:${copyId}`,
};

/**
 * Common rooms (feature 14): copies of three templates, run by Connecta, no rows in the database. A
 * copy is a game-server room like any other (`common-library-2`) whose ticket says it's Common, so
 * the game server makes it text only. Who's in each copy comes from presence (the game server
 * reports it); seats a fresh ticket was given are held for 30 s on top.
 *
 * Walk in: the copy with the most friends (any seat up to 25), else the busiest copy still taking
 * strangers (under 20), else a new copy. Joining a friend: their copy, unless it's at 25.
 */
@Injectable()
export class CommonService implements OnModuleDestroy {
  private readonly log = new Logger(CommonService.name);
  private readonly redis: Redis;

  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    private readonly game: GameService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {
    this.redis = new Redis(config.get('REDIS_URL', { infer: true }), { maxRetriesPerRequest: 2 });
    this.redis.on('error', (error) => this.log.warn(`Redis: ${error.message}`));
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => {});
  }

  /** Discover's and Home's cards: how many are in each type now, and which friends */
  async list(userId: string | null, now = Date.now()): Promise<CommonRoomView[]> {
    // Signed out (browsing Discover): the counts, with no friends to show
    const friends = new Set(
      userId ? (await this.prisma.friendship.findMany({ where: { userId }, select: { friendId: true } })).map((f) => f.friendId) : [],
    );
    return Promise.all(
      COMMON_TYPES.map(async (type) => {
        const copies = await this.copies(type.id, now);
        const inside = copies.flatMap((c) => c.inside);
        // Friends who appear offline aren't shown
        const shown = (await Promise.all(copies.map((c) => this.presence.inside(c.id, now)))).flat().filter((id) => friends.has(id));
        const people = shown.length ? await this.prisma.user.findMany({ where: { id: { in: shown } } }) : [];
        return {
          id: type.id,
          name: type.name,
          mapId: type.mapId,
          vibe: type.vibe,
          roomWideGames: type.roomWideGames,
          here: inside.length,
          copies: copies.length,
          friendsInside: people.map(toPerson),
        };
      }),
    );
  }

  /** Walk in: picks your copy and gives you its ticket */
  async ticket(userId: string, typeId: string, ask: { with?: string; copy?: number }, now = Date.now()): Promise<CommonTicket> {
    const type = commonType(typeId);
    if (!type) throw new NotFoundException();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    if (!user.isAnonymous && !user.handle) throw new ForbiddenException('Finish signing up first');
    const out = await this.redis.get(commonOutKey(userId));
    if (out) {
      const { until, by } = JSON.parse(out) as CommonOut;
      throw new ForbiddenException({
        message: 'You can’t come into Common rooms for now',
        code: 'common_out',
        by,
        until: new Date(until).toISOString(),
      });
    }
    const quiet = Number(await this.redis.get(key.quiet(userId))) || 0;
    const notice = (await this.notice(now)) ?? undefined;
    const { n, note } = await this.pick(userId, type, ask, now);
    const place = commonCopyId(type.id, n);
    await this.redis.sadd(key.copies(type.id), String(n));
    await this.redis.zadd(key.held(place), now, userId);
    await this.redis.pexpire(key.held(place), HOLD_MS * 2);
    const person = toPerson(user);
    const ticket = await this.game.ticket({
      sub: userId,
      roomId: place,
      handle: person.handle,
      name: person.name,
      look: person.look,
      // Nobody runs a Common room: accounts are members, guests guests, and the rules are the same
      role: user.isAnonymous ? 'guest' : 'member',
      capacity: this.settings.get().commonCapacity,
      mapId: type.mapId,
      timedOutUntil: quiet,
      timedOutBy: 'team',
      guestVoice: false,
      roomWideGames: type.roomWideGames,
      plus: hasPlus(user, new Date(now)),
      common: true,
      team: user.team,
      filterWords: true,
      notice,
    });
    return { ticket, place, n, name: commonCopyName(type, n), note, capacity: this.settings.get().commonCapacity };
  }

  /**
   * The Connecta team's Time out in a Common room: no bubbles for a while, in whichever copy they
   * walk into. Only team accounts, never on another team member.
   */
  async timeOut(teamId: string, userId: string, duration: Timeout, now = Date.now()): Promise<void> {
    const at = await this.teamOn(teamId, userId, now);
    const until = now + TIMEOUT_MINUTES[duration] * 60_000;
    await this.redis.set(key.quiet(userId), String(until), 'PX', until - now);
    this.game.roomEvent({ roomId: at, type: 'timeout', userId, until, by: 'team' });
    await this.audit.record({ by: teamId, action: 'common.timeout', targetKind: 'user', targetId: userId, details: { duration, at } });
  }

  /** The Connecta team's Remove from Common rooms: out now, and can't walk back in for an hour */
  async remove(teamId: string, userId: string, now = Date.now()): Promise<void> {
    const at = await this.teamOn(teamId, userId, now);
    await this.putOut(userId, { until: now + TEAM_REMOVE_MINUTES * 60_000, by: 'team' }, now);
    this.game.roomEvent({ roomId: at, type: 'kick', userId });
    await this.audit.record({
      by: teamId,
      action: 'common.remove',
      targetKind: 'user',
      targetId: userId,
      details: { minutes: TEAM_REMOVE_MINUTES, at },
    });
  }

  /** The admin site's Common rooms page: each type's copies and how many are in each */
  async overview(now = Date.now()) {
    return Promise.all(
      COMMON_TYPES.map(async (type) => {
        const copies = await this.copies(type.id, now);
        return {
          id: type.id,
          name: type.name,
          mapId: type.mapId,
          here: copies.reduce((n, c) => n + c.inside.length, 0),
          copies: copies.map((c) => ({ n: c.n, name: commonCopyName(type, c.n), people: c.inside.length })),
        };
      }),
    );
  }

  /** The notice showing now, if any */
  async notice(now = Date.now()): Promise<CommonNotice | null> {
    const raw = await this.redis.get(key.notice);
    const notice = raw ? (JSON.parse(raw) as CommonNotice) : null;
    return notice && notice.until > now ? notice : null;
  }

  /** A banner in every Common room for 10 minutes (maintenance, an event); a new one replaces it */
  async postNotice(teamId: string, text: string, now = Date.now()): Promise<CommonNotice> {
    const notice = { text, until: now + NOTICE_MINUTES * 60_000 };
    await this.redis.set(key.notice, JSON.stringify(notice), 'PX', NOTICE_MINUTES * 60_000);
    this.game.roomEvent({ roomId: '*', type: 'notice', notice });
    await this.audit.record({ by: teamId, action: 'common.notice', targetKind: 'setting', targetId: 'common', details: { text } });
    return notice;
  }

  async putOut(userId: string, out: CommonOut, now = Date.now()) {
    await this.redis.set(commonOutKey(userId), JSON.stringify(out), 'PX', Math.max(1, out.until - now));
  }

  /** The Common copy the person is in, if the one asking is on the team and they aren't */
  private async teamOn(teamId: string, userId: string, now: number): Promise<string> {
    const [team, them] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: teamId }, select: { team: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { team: true } }),
    ]);
    if (!team?.team) throw new ForbiddenException('Only the Connecta team can do that');
    if (!them) throw new NotFoundException();
    if (them.team) throw new ForbiddenException('They’re on the Connecta team too');
    const at = await this.presence.roomOf(userId, now);
    if (!at || !parseCommonCopy(at)) throw new NotFoundException('They’re not in a Common room now');
    return at;
  }

  private async pick(userId: string, type: CommonType, ask: { with?: string; copy?: number }, now: number) {
    const copies = (await this.copies(type.id, now)).map((c) => ({ ...c, count: c.inside.filter((id) => id !== userId).length }));
    // How full a copy gets: the admin site's Common rooms page
    const { commonCapacity, commonFriendSeats } = this.settings.get();
    const seat = (c: { count: number }) => c.count < commonCapacity;
    // Joining a friend: their copy, unless it's full
    let note: string | null = null;
    if (ask.with) {
      const theirs = parseCommonCopy((await this.presence.roomOf(ask.with, now)) ?? '');
      const copy = theirs?.type.id === type.id ? copies.find((c) => c.n === theirs.n) : undefined;
      if (copy && seat(copy)) return { n: copy.n, note };
      if (copy) {
        const friend = await this.prisma.user.findUnique({ where: { id: ask.with }, select: { name: true } });
        note = `${friend?.name ?? 'Your friend'}’s copy is full, so you’re in`;
      }
    }
    // Back to the copy you were in
    const again = ask.copy !== undefined ? copies.find((c) => c.n === ask.copy) : undefined;
    if (again && seat(again)) return { n: again.n, note };
    // The copy with the most friends, any seat
    const friends = new Set(
      (await this.prisma.friendship.findMany({ where: { userId }, select: { friendId: true } })).map((f) => f.friendId),
    );
    const withFriends = copies
      .map((c) => ({ ...c, friends: c.inside.filter((id) => friends.has(id)).length }))
      .filter((c) => c.friends > 0 && seat(c))
      .sort((a, b) => b.friends - a.friends || b.count - a.count)[0];
    const strangers = copies.filter((c) => c.count < commonCapacity - commonFriendSeats).sort((a, b) => b.count - a.count)[0];
    const n = withFriends?.n ?? strangers?.n ?? this.firstFree(copies.map((c) => c.n));
    return { n, note: note && `${note} #${n}.` };
  }

  /** The open copies of a type with who's in (or holding a seat); empty ones close */
  private async copies(typeId: CommonTypeId, now: number) {
    const numbers = (await this.redis.smembers(key.copies(typeId))).map(Number).filter((n) => n > 0);
    const copies = await Promise.all(
      numbers.map(async (n) => {
        const id = commonCopyId(typeId, n);
        await this.redis.zremrangebyscore(key.held(id), 0, now - HOLD_MS);
        const [inside, held] = await Promise.all([this.presence.inside(id, now, true), this.redis.zrange(key.held(id), '0', '-1')]);
        return { id, n, inside: [...new Set([...inside, ...held])] };
      }),
    );
    const empty = copies.filter((c) => !c.inside.length);
    if (empty.length) await this.redis.srem(key.copies(typeId), ...empty.map((c) => String(c.n)));
    return copies.filter((c) => c.inside.length).sort((a, b) => a.n - b.n);
  }

  private firstFree(taken: number[]) {
    let n = 1;
    while (taken.includes(n)) n++;
    return n;
  }
}
