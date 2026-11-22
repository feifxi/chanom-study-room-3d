import type { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';
import type { Env } from '../config/env.js';

/**
 * Socket.IO with the Redis adapter: events the API publishes (LiveService) and events from other
 * gateway processes reach this process's sockets.
 */
export class RedisIoAdapter extends IoAdapter {
  private pub?: Redis;
  private sub?: Redis;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  async connect() {
    const url = this.app.get(ConfigService<Env, true>).get('REDIS_URL', { infer: true });
    this.pub = new Redis(url);
    this.sub = this.pub.duplicate();
    await Promise.all([this.pub.ping(), this.sub.ping()]);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    server.adapter(createAdapter(this.pub!, this.sub!));
    return server;
  }

  override async close(server: Server) {
    await super.close(server);
    await Promise.all([this.pub?.quit(), this.sub?.quit()].map((p) => p?.catch(() => {})));
  }
}
