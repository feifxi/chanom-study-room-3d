import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { APP_OPTIONS, configureApp, createOpenApiDocument } from './setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { ...APP_OPTIONS, bufferLogs: true });
  configureApp(app);
  const config = app.get(ConfigService<Env, true>);
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    SwaggerModule.setup('api/docs', app, createOpenApiDocument(app));
  }
  await app.listen(config.get('PORT', { infer: true }));
}

void bootstrap();
