import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { GAME_CHANNELS, type GamePresence } from '@connecta/shared';
import type { Env } from '../config/env.js';
import { PresenceService } from '../presence/presence.service.js';

/**
 * Who's in which room comes from the game server: each connection there is a tab of
 * its own (`game:<session>`), refreshed every minute and closed when you leave. The gateway stays the
 * one writer of presence.
 */
@Injectable()
export class GamePresenceBridge implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(GamePresenceBridge.name);
  private readonly sub: Redis;

  constructor(
    config: ConfigService<Env, true>,
    private readonly presence: PresenceService,
  ) {
    this.sub = new Redis(config.get('REDIS_URL', { infer: true }), { maxRetriesPerRequest: 2 });
    this.sub.on('error', (err) => this.log.warn(`redis: ${err.message}`));
  }

  async onModuleInit() {
    await this.sub.subscribe(GAME_CHANNELS.presence);
    this.sub.on('message', (_channel, raw) => {
      const u = JSON.parse(raw) as GamePresence;
      // The game tab says where you are and whether you're focusing; how active you are comes from your browser tabs
      const done = u.roomId
        ? this.presence.tab(u.userId, u.tabId, { roomId: u.roomId, focus: u.focus ?? null })
        : this.presence.closeTab(u.userId, u.tabId);
      done.catch((err: unknown) => this.log.warn(`presence: ${String(err)}`));
    });
  }

  async onModuleDestroy() {
    await this.sub.quit().catch(() => {});
  }
}
