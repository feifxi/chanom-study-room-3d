import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import {
  COMMON_CAPACITY,
  COMMON_STRANGERS_UP_TO,
  COMMON_TYPES,
  commonCopyId,
  commonCopyName,
  commonType,
  parseCommonCopy,
  type CommonType,
  type CommonTypeId,
} from '@connecta/shared';
import type { Env } from '../config/env.js';
import { GameService } from '../game/game.service.js';
import { hasPlus } from '../plus/plus.js';
import { PresenceService } from '../presence/presence.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPerson } from '../rooms/person.js';
import type { CommonRoomView, CommonTicket } from './common.schemas.js';

/** A ticket holds a seat this long before its person is inside (two people never get the 20th seat) */
const HOLD_MS = 30_000;

const key = {
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
  ) {
    this.redis = new Redis(config.get('REDIS_URL', { infer: true }), { maxRetriesPerRequest: 2 });
    this.redis.on('error', (error) => this.log.warn(`Redis: ${error.message}`));
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => {});
  }

  /** Discover's and Home's cards: how many are in each type now, and which friends */
  async list(userId: string, now = Date.now()): Promise<CommonRoomView[]> {
    const friends = new Set(
      (await this.prisma.friendship.findMany({ where: { userId }, select: { friendId: true } })).map((f) => f.friendId),
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
      capacity: COMMON_CAPACITY,
      mapId: type.mapId,
      timedOutUntil: 0,
      guestVoice: false,
      roomWideGames: type.roomWideGames,
      plus: hasPlus(user, new Date(now)),
      common: true,
      filterWords: true,
    });
    return { ticket, place, n, name: commonCopyName(type, n), note };
  }

  private async pick(userId: string, type: CommonType, ask: { with?: string; copy?: number }, now: number) {
    const copies = (await this.copies(type.id, now)).map((c) => ({ ...c, count: c.inside.filter((id) => id !== userId).length }));
    const seat = (c: { count: number }) => c.count < COMMON_CAPACITY;
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
    const strangers = copies.filter((c) => c.count < COMMON_STRANGERS_UP_TO).sort((a, b) => b.count - a.count)[0];
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
