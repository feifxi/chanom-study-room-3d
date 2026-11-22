import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import type { Env } from './config/env.js';
import { GatewayModule } from './gateway/gateway.module.js';
import { RedisIoAdapter } from './gateway/redis-io.adapter.js';

/**
 * The second entry point: the live gateway (chat, typing, later presence). Same code and image as
 * the API, its own process, so live connections scale apart from REST.
 */
async function bootstrap() {
  const app = await NestFactory.create(GatewayModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const adapter = new RedisIoAdapter(app);
  await adapter.connect();
  app.useWebSocketAdapter(adapter);
  app.enableShutdownHooks();
  await app.listen(app.get(ConfigService<Env, true>).get('GATEWAY_PORT', { infer: true }));
}

void bootstrap();
