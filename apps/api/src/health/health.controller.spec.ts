import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configureApp } from '../setup.js';

/** Boots the whole app with a fake database, so the test covers routing, the /api prefix and the response shape. */
async function appWithDatabase(answers: boolean) {
  const fakePrisma = {
    $queryRaw: async () => {
      if (!answers) throw new Error('connection refused');
      return [{ '?column?': 1 }];
    },
    $disconnect: async () => {},
  };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(fakePrisma)
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return app;
}

describe('GET /api/health', () => {
  let app: INestApplication | undefined;
  afterEach(() => app?.close());

  it('is ok while the database answers', async () => {
    app = await appWithDatabase(true);
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', info: { database: { status: 'up' } } });
  });

  it('answers 503 when the database is down', async () => {
    app = await appWithDatabase(false);
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'error', error: { database: { status: 'down', message: 'Database unreachable' } } });
    expect(JSON.stringify(res.body)).not.toContain('connection refused');
  });
});
