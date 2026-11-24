import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Emitter } from '@socket.io/redis-emitter';
import { Redis } from 'ioredis';
import type { Env } from '../config/env.js';

/** Socket.IO rooms the gateway puts people in. */
export const liveRoom = {
  /** Everyone watching a room's chat */
  room: (roomId: string) => `room:${roomId}`,
  /** Every tab a person has open */
  user: (userId: string) => `user:${userId}`,
};

/**
 * Sends live events from the API to people's open tabs: the API writes to Redis and every gateway
 * process delivers to its own sockets (Socket.IO's Redis emitter). The API never holds sockets.
 */
@Injectable()
export class LiveService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly io: Emitter;

  constructor(config: ConfigService<Env, true>) {
    this.redis = new Redis(config.get('REDIS_URL', { infer: true }), { maxRetriesPerRequest: 2 });
    this.io = new Emitter(this.redis);
  }

  toRoom(roomId: string, event: string, payload: unknown) {
    this.io.to(liveRoom.room(roomId)).emit(event, payload);
  }

  toUser(userId: string, event: string, payload: unknown) {
    this.io.to(liveRoom.user(userId)).emit(event, payload);
  }

  /** A named channel tabs subscribe to through the gateway (a room's "inside now" numbers). */
  toChannel(channel: string, event: string, payload: unknown) {
    this.io.to(channel).emit(event, payload);
  }

  /** Each person once, however many tabs they have open (a DM's two people). */
  toUsers(userIds: string[], event: string, payload: unknown) {
    this.io.to(userIds.map(liveRoom.user)).emit(event, payload);
  }

  /**
   * Signed out everywhere (a suspension): every open tab hears it, then the gateway drops their
   * sockets itself, so nothing more reaches them even if a tab ignores the event. Same Redis
   * connection, so the event goes out before the disconnect.
   */
  signOut(userId: string) {
    this.io.to(liveRoom.user(userId)).emit('account', { signedOut: true });
    this.io.in(liveRoom.user(userId)).disconnectSockets(true);
  }

  /** Someone left, was kicked or banned: their open tabs stop getting the room's chat. */
  leaveRoom(userId: string, roomId: string) {
    this.io.in(liveRoom.user(userId)).socketsLeave(liveRoom.room(roomId));
  }

  async onModuleDestroy() {
    await this.redis.quit().catch(() => {});
  }
}
