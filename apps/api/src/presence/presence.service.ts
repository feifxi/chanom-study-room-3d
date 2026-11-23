import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { commonCopyName, focusActivity, parseCommonCopy } from '@connecta/shared';
import type { Env } from '../config/env.js';
import { LiveService } from '../live/live.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Presence, PresenceRoom, PresenceStatus } from './presence.schemas.js';

/** No input in any tab for this long: Away */
export const AWAY_MS = 10 * 60 * 1000;
/** Tabs say they're still there every minute; one silent for this long is gone (a crashed gateway) */
export const STALE_MS = 150 * 1000;

const key = {
  /** Each open tab of a person: socket id → { roomId, activeAt, seenAt } */
  tabs: (userId: string) => `presence:tabs:${userId}`,
  /** The state last pushed to friends, to push only changes */
  last: (userId: string) => `presence:last:${userId}`,
  /** Who's inside a room (3D open) */
  inside: (roomId: string) => `presence:inside:${roomId}`,
};

/** Live events */
export const PRESENCE_EVENTS = {
  /** To each friend: { userId, presence } */
  presence: 'presence',
  /** To people watching a room's numbers: { roomId, inside } */
  inside: 'inside',
} as const;

interface Tab {
  roomId: string | null;
  activeAt: number;
  seenAt: number;
  /** A game tab with a focus round running: its subject ('' for none) */
  focus?: string | null;
}
/** The truth, before privacy: what the person's tabs add up to */
export interface RawPresence {
  status: PresenceStatus;
  roomId: string | null;
  /** "Focusing · Calculus" while a focus round runs */
  activity: string | null;
}

/**
 * Presence (docs/v2/features/05-friends.md): who's online, away, and in which room, kept in Redis
 * and pushed only to friends. The gateway reports each tab (open, active, in a room, closed); the
 * API reads it for lists. Only "last seen" is stored for good.
 */
@Injectable()
export class PresenceService implements OnModuleDestroy {
  private readonly log = new Logger(PresenceService.name);
  private readonly redis: Redis;

  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly live: LiveService,
  ) {
    this.redis = new Redis(config.get('REDIS_URL', { infer: true }), { maxRetriesPerRequest: 2 });
    // A dropped connection reconnects by itself; say so instead of an unhandled error
    this.redis.on('error', (error) => this.log.warn(`Redis: ${error.message}`));
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => {});
  }

  // ── What the gateway reports ──────────────────────────────────────────────────────────────────

  /** A tab is open (or still there): in a room or not, idle for this long. */
  async tab(userId: string, tabId: string, update: { roomId?: string | null; idleMs?: number; focus?: string | null }, now = Date.now()) {
    const before = await this.redis.hget(key.tabs(userId), tabId);
    const tab: Tab = before ? (JSON.parse(before) as Tab) : { roomId: null, activeAt: now, seenAt: now };
    if (update.roomId !== undefined) tab.roomId = update.roomId;
    if (update.idleMs !== undefined) tab.activeAt = now - Math.max(0, update.idleMs);
    if (update.focus !== undefined) tab.focus = update.focus;
    tab.seenAt = now;
    await this.redis.hset(key.tabs(userId), tabId, JSON.stringify(tab));
    await this.settle(userId, now);
  }

  /**
   * A tab connected. Only creates it: the tab's own first report ("I'm in this room") can arrive
   * while this runs, and must not be overwritten.
   */
  async openTab(userId: string, tabId: string, now = Date.now()) {
    const tab: Tab = { roomId: null, activeAt: now, seenAt: now };
    await this.redis.hsetnx(key.tabs(userId), tabId, JSON.stringify(tab));
    await this.settle(userId, now);
  }

  async closeTab(userId: string, tabId: string, now = Date.now()) {
    await this.redis.hdel(key.tabs(userId), tabId);
    await this.settle(userId, now);
  }

  /**
   * Works out the person's state and, if it changed (or `force`: their privacy settings did),
   * updates who's inside which room and tells their friends.
   */
  async settle(userId: string, now = Date.now(), force = false) {
    const state = await this.raw(userId, now);
    const lastJson = await this.redis.get(key.last(userId));
    const last: RawPresence = lastJson ? (JSON.parse(lastJson) as RawPresence) : { status: 'offline', roomId: null, activity: null };
    if (!force && last.status === state.status && last.roomId === state.roomId && (last.activity ?? null) === state.activity) return;
    await this.redis.set(key.last(userId), JSON.stringify(state));

    if (last.roomId !== state.roomId) {
      if (last.roomId) await this.redis.srem(key.inside(last.roomId), userId);
      if (state.roomId) await this.redis.sadd(key.inside(state.roomId), userId);
      for (const roomId of [last.roomId, state.roomId]) {
        if (roomId) this.live.toChannel(`inside:${roomId}`, PRESENCE_EVENTS.inside, { roomId, inside: await this.insideCount(roomId) });
      }
    }
    if (state.status === 'offline' && last.status !== 'offline') {
      await this.prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date(now) } }).catch(() => {});
    }
    await this.tellFriends(userId, state).catch((error: unknown) => this.log.warn(`Couldn't send presence: ${String(error)}`));
  }

  // ── What the API reads ────────────────────────────────────────────────────────────────────────

  /** How each of these people looks to `viewerId` right now (call it for friends only). */
  async views(viewerId: string, userIds: string[], now = Date.now()): Promise<Map<string, Presence>> {
    const out = new Map<string, Presence>();
    if (!userIds.length) return out;
    const [states, users] = await Promise.all([
      Promise.all(userIds.map((id) => this.raw(id, now))),
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, appearOffline: true, showActivity: true, lastSeenAt: true },
      }),
    ]);
    const byId = new Map(users.map((u) => [u.id, u]));
    const rooms = await this.roomsFor(
      viewerId,
      states.flatMap((s) => (s.roomId ? [s.roomId] : [])),
    );
    userIds.forEach((id, i) => {
      const user = byId.get(id);
      if (user) out.set(id, this.view(states[i]!, user, rooms));
    });
    return out;
  }

  /** People inside a room right now (not the ones appearing offline, unless `everyone` for counting seats). */
  async inside(roomId: string, now = Date.now(), everyone = false): Promise<string[]> {
    const ids = await this.redis.smembers(key.inside(roomId));
    if (!ids.length) return [];
    // A crashed gateway can leave someone listed: check their tabs
    const states = await Promise.all(ids.map((id) => this.raw(id, now)));
    const really = ids.filter((_, i) => states[i]!.roomId === roomId);
    if (everyone) return really;
    const hidden = await this.prisma.user.findMany({ where: { id: { in: really }, appearOffline: true }, select: { id: true } });
    const skip = new Set(hidden.map((u) => u.id));
    return really.filter((id) => !skip.has(id));
  }

  async insideCount(roomId: string): Promise<number> {
    return (await this.inside(roomId)).length;
  }

  /**
   * Everyone online now and where (the admin site's Overview), before privacy. Walks every open tab
   * in Redis: fine at today's size; a counter kept by the gateway would replace it later.
   */
  async everyone(now = Date.now()): Promise<{ online: number; rooms: Map<string, number> }> {
    let cursor = '0';
    const ids: string[] = [];
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', key.tabs('*'), 'COUNT', 500);
      cursor = next;
      ids.push(...keys.map((k) => k.slice(key.tabs('').length)));
    } while (cursor !== '0');
    const states = await Promise.all(ids.map((id) => this.raw(id, now)));
    const rooms = new Map<string, number>();
    let online = 0;
    for (const st of states) {
      if (st.status === 'offline') continue;
      online++;
      if (st.roomId) rooms.set(st.roomId, (rooms.get(st.roomId) ?? 0) + 1);
    }
    return { online, rooms };
  }

  /** The room someone's in, before privacy (for "Ask to join"). */
  async roomOf(userId: string, now = Date.now()): Promise<string | null> {
    return (await this.raw(userId, now)).roomId;
  }

  // ── Inside ────────────────────────────────────────────────────────────────────────────────────

  private async raw(userId: string, now: number): Promise<RawPresence> {
    const all = await this.redis.hgetall(key.tabs(userId));
    const tabs: Tab[] = [];
    const stale: string[] = [];
    for (const [id, json] of Object.entries(all)) {
      const tab = JSON.parse(json) as Tab;
      if (now - tab.seenAt > STALE_MS) stale.push(id);
      else tabs.push(tab);
    }
    if (stale.length) await this.redis.hdel(key.tabs(userId), ...stale);
    if (!tabs.length) return { status: 'offline', roomId: null, activity: null };
    const activeAt = Math.max(...tabs.map((t) => t.activeAt));
    // The room of the most recently active tab that's in one
    const inRoom = tabs.filter((t) => t.roomId).sort((a, b) => b.activeAt - a.activeAt)[0];
    // Focusing is never Away: people study in other tabs, or with their hands off the keyboard
    const focusing = tabs.find((t) => typeof t.focus === 'string');
    return {
      status: focusing || now - activeAt <= AWAY_MS ? 'online' : 'idle',
      roomId: inRoom?.roomId ?? null,
      activity: focusing ? focusActivity(focusing.focus!) : null,
    };
  }

  private view(
    state: RawPresence,
    user: { appearOffline: boolean; showActivity: boolean; lastSeenAt: Date | null },
    rooms: Map<string, PresenceRoom>,
  ): Presence {
    if (user.appearOffline || state.status === 'offline') {
      return {
        status: 'offline',
        lastSeenAt: user.appearOffline ? null : (user.lastSeenAt?.toISOString() ?? null),
        activity: null,
        room: null,
      };
    }
    return {
      status: state.status,
      lastSeenAt: null,
      activity: user.showActivity ? state.activity : null,
      room: (state.roomId && rooms.get(state.roomId)) || null,
    };
  }

  /** Rooms as `viewerId` may see them: named if listed or if they're a member. */
  private async roomsFor(viewerId: string, roomIds: string[]): Promise<Map<string, PresenceRoom>> {
    const ids = [...new Set(roomIds)];
    if (!ids.length) return new Map();
    const [rooms, mine] = await Promise.all([
      this.prisma.room.findMany({ where: { id: { in: ids } } }),
      this.prisma.membership.findMany({ where: { userId: viewerId, roomId: { in: ids } }, select: { roomId: true } }),
    ]);
    const member = new Set(mine.map((m) => m.roomId));
    // Common room copies have no row: anyone may walk in, so they're always named
    const common = ids.flatMap((id): [string, PresenceRoom][] => {
      const copy = parseCommonCopy(id);
      if (!copy) return [];
      const { type, n } = copy;
      return [
        [
          id,
          { hidden: false, id, name: commonCopyName(type, n), emoji: '🏛️', mapId: type.mapId, member: false, open: true, common: type.id },
        ],
      ];
    });
    return new Map([
      ...common,
      ...rooms.map((r): [string, PresenceRoom] => {
        const isMember = member.has(r.id);
        const named = isMember || r.visibility !== 'private';
        return [
          r.id,
          {
            hidden: !named,
            id: named ? r.id : null,
            name: named ? r.name : null,
            emoji: named ? r.emoji : null,
            mapId: named ? r.mapId : null,
            member: isMember,
            open: !isMember && r.visibility === 'open',
            common: null,
          },
        ];
      }),
    ]);
  }

  /** Each friend gets the view meant for them (a private room is named only to its members). */
  private async tellFriends(userId: string, state: RawPresence) {
    const [friends, user] = await Promise.all([
      this.prisma.friendship.findMany({ where: { userId }, select: { friendId: true } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { appearOffline: true, showActivity: true, lastSeenAt: true } }),
    ]);
    if (!user || !friends.length) return;
    for (const { friendId } of friends) {
      const rooms = await this.roomsFor(friendId, state.roomId ? [state.roomId] : []);
      this.live.toUser(friendId, PRESENCE_EVENTS.presence, { userId, presence: this.view(state, user, rooms) });
    }
  }
}
