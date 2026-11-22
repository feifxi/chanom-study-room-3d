import { StandardSchemaValidationPipe, type INestApplication, type NestApplicationOptions } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

/**
 * Options for creating the app. Body parsing is off because Better Auth reads its own request
 * bodies; the auth module adds the JSON parser back for every other route.
 */
export const APP_OPTIONS: NestApplicationOptions = { bodyParser: false };

/** Everything main.ts applies to the app, shared with tests so they run the app as production does. */
export function configureApp(app: INestApplication) {
  app.useLogger(app.get(Logger));
  // The browser reaches the API on the web app's own origin (a Next rewrite locally, nginx in
  // production), so there's no CORS: cross-origin requests are simply refused
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();
}

/** The OpenAPI document (served at /api/docs outside production); the web app's typed client will be generated from it. */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder().setTitle('Connecta API').setVersion('0.1.0').build();
  return SwaggerModule.createDocument(app, config);
}
