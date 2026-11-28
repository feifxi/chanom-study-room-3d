import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { SignJWT } from 'jose';
import { GAME_CHANNELS, TICKET_AUDIENCE, TICKET_SECONDS, type GameRoomEvent, type GameTicket } from '@connecta/shared';
import { DECK_PASS_AUDIENCE, DECK_PASS_SECONDS, type Deck } from '@connecta/shared/pick-a-side';
import type { Env } from '../config/env.js';

/**
 * The API's side of the game server (apps/game): it signs join tickets and tells the game server about
 * room changes (kick, ban, map…) through Redis.
 */
@Injectable()
export class GameService implements OnModuleDestroy {
  private readonly log = new Logger(GameService.name);
  private readonly redis: Redis;
  private readonly secret: Uint8Array;

  constructor(config: ConfigService<Env, true>) {
    const url = config.get('REDIS_URL', { infer: true });
    this.redis = new Redis(url, { maxRetriesPerRequest: 2 });
    this.redis.on('error', (err) => this.log.warn(`redis: ${err.message}`));
    this.secret = new TextEncoder().encode(config.get('GAME_SECRET', { infer: true }));
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => {});
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
}
