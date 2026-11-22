// Writes the OpenAPI document to apps/api/openapi.json (`pnpm api:client` runs this, then the web
// app's type generator). Boots the app without listening or touching the database, so it runs
// without .env (CI).
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';

process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL ??= 'postgresql://unused@localhost/unused';
process.env.AUTH_SECRET ??= 'only-for-writing-the-openapi-document';

// Imported after the variables above are set: config is read when the module loads
const { AppModule } = await import('./app.module.js');
const { APP_OPTIONS, configureApp, createOpenApiDocument } = await import('./setup.js');

const app = await NestFactory.create(AppModule, { ...APP_OPTIONS, logger: false });
configureApp(app);
const document = createOpenApiDocument(app);
writeFileSync(new URL('../openapi.json', import.meta.url), `${JSON.stringify(document, null, 2)}\n`);
await app.close();
