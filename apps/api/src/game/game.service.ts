import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { SignJWT } from 'jose';
import { GAME_CHANNELS, TICKET_AUDIENCE, TICKET_SECONDS, type GameRoomEvent, type GameTicket } from '@connecta/shared';
import { DECK_PASS_AUDIENCE, DECK_PASS_SECONDS, type Deck } from '@connecta/shared/pick-a-side';
import type { Env } from '../config/env.js';
import { NotificationsService } from '../notifications/notifications.service.js';

/** People waiting for space in a full room ("Full · notify me"), told once and then forgotten. */
const waitingKey = (roomId: string) => `game:waiting:${roomId}`;
/** A wait that never ends (the room stays full) is dropped after this */
const WAIT_SECONDS = 6 * 60 * 60;

/**
 * The API's side of the game server (apps/game): it signs join tickets, tells the game server about
 * room changes (kick, ban, map…) through Redis, and turns "there's space" into 🔔 items.
 */
@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(GameService.name);
  private readonly redis: Redis;
  private readonly sub: Redis;
  private readonly secret: Uint8Array;

  constructor(
    config: ConfigService<Env, true>,
    private readonly inbox: NotificationsService,
  ) {
    const url = config.get('REDIS_URL', { infer: true });
    this.redis = new Redis(url, { maxRetriesPerRequest: 2 });
    this.sub = new Redis(url, { maxRetriesPerRequest: 2 });
    for (const r of [this.redis, this.sub]) r.on('error', (err) => this.log.warn(`redis: ${err.message}`));
    this.secret = new TextEncoder().encode(config.get('GAME_SECRET', { infer: true }));
  }

  async onModuleInit() {
    await this.sub.subscribe(GAME_CHANNELS.space);
    this.sub.on('message', (_channel, raw) => {
      const { roomId } = JSON.parse(raw) as { roomId: string };
      this.space(roomId).catch((err: unknown) => this.log.warn(`space: ${String(err)}`));
    });
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.redis.quit(), this.sub.quit()]);
  }

  /** A short-lived pass into the room's game server: who you are, your role and the room's capacity. */
  ticket(t: GameTicket): Promise<string> {
    return new SignJWT({ ...t })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience(TICKET_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${TICKET_SECONDS}s`)
      .sign(this.secret);
  }

  /**
   * A room deck, signed for this room's game server: the host's page hands it over to start Pick a
   * Side, and the game server trusts it like a join ticket (it has no database).
   */
  deckPass(roomId: string, deck: Deck): Promise<string> {
    return new SignJWT({ roomId, deck })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience(DECK_PASS_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${DECK_PASS_SECONDS}s`)
      .sign(this.secret);
  }

  /** Something the people inside should feel at once (removed, a new role, a new map, the room gone). */
  roomEvent(event: GameRoomEvent) {
    void this.redis.publish(GAME_CHANNELS.rooms, JSON.stringify(event)).catch(() => {});
  }

  async waitForSpace(roomId: string, userId: string) {
    await this.redis.multi().sadd(waitingKey(roomId), userId).expire(waitingKey(roomId), WAIT_SECONDS).exec();
  }

  /** Someone left a full room: everyone waiting hears once. Taking the list is atomic, so two API processes never both send. */
  async space(roomId: string) {
    const result = await this.redis.multi().smembers(waitingKey(roomId)).del(waitingKey(roomId)).exec();
    const waiting = (result?.[0]?.[1] as string[] | undefined) ?? [];
    for (const userId of waiting) await this.inbox.space(userId, roomId);
  }
}
