import { StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import type { Env } from './config/env.js';

/** Everything main.ts applies to the app, shared with tests so they run the app as production does. */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService<Env, true>);
  app.useLogger(app.get(Logger));
  // Same origin as the web app in production (the reverse proxy routes /api here)
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }), credentials: true });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();
}

/** The OpenAPI document (served at /api/docs outside production); the web app's typed client will be generated from it. */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder().setTitle('Connecta API').setVersion('0.1.0').build();
  return SwaggerModule.createDocument(app, config);
}
