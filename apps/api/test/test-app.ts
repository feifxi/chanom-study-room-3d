import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import type { Mail } from '../src/mail/mail.service.js';
import { MailService } from '../src/mail/mail.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { APP_OPTIONS, configureApp } from '../src/setup.js';

export const ORIGIN = 'http://localhost:3000';

/** The whole app on the test database, with email caught in `sent` instead of delivered. */
export async function createTestApp() {
  const sent: Mail[] = [];
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue({ deliver: async (mail: Mail) => void sent.push(mail) })
    .compile();
  const app = moduleRef.createNestApplication({ ...APP_OPTIONS, logger: false });
  configureApp(app);
  await app.init();
  return { app, sent, prisma: app.get(PrismaService) };
}

/** Empties the tables between tests (rooms and everything in them go with their users). */
export async function resetAccounts(prisma: PrismaService) {
  await prisma.$executeRawUnsafe('TRUNCATE users, sessions, accounts, verifications, age_locks, handle_holds, rooms CASCADE');
}

/**
 * A browser: an agent that keeps cookies and sends the web app's Origin (Better Auth refuses
 * cookie-carrying POSTs from other origins).
 */
export function browser(app: INestApplication) {
  const agent = request.agent(app.getHttpServer());
  return {
    get: (path: string) => agent.get(path).set('Origin', ORIGIN),
    post: (path: string, body: object = {}) => agent.post(path).set('Origin', ORIGIN).send(body),
    put: (path: string, body: object = {}) => agent.put(path).set('Origin', ORIGIN).send(body),
    patch: (path: string, body: object = {}) => agent.patch(path).set('Origin', ORIGIN).send(body),
    delete: (path: string, body?: object) => agent.delete(path).set('Origin', ORIGIN).send(body),
  };
}

export type Browser = ReturnType<typeof browser>;

/** Signs in with an email code, reading the code from the caught email. */
export async function signInWithCode(b: Browser, sent: Mail[], email: string) {
  await b.post('/api/auth/email-otp/send-verification-otp', { email, type: 'sign-in' }).expect(200);
  const mail = sent.findLast((m) => m.to === email);
  const otp = mail?.subject.match(/^(\d{6})/)?.[1];
  if (!otp) throw new Error(`No code was sent to ${email}`);
  await b.post('/api/auth/sign-in/email-otp', { email, otp }).expect(200);
}

/** A browser signed in to a finished account (birthday, character and @handle done). */
export async function signedUp(app: INestApplication, sent: Mail[], handle: string) {
  const b = browser(app);
  await signInWithCode(b, sent, `${handle}@example.com`);
  await b.post('/api/me/birthday', { birthday: '2004-05-14' }).expect(200);
  const me = await b.post('/api/me/sign-up', { name: handle, handle, look: LOOK }).expect(200);
  return Object.assign(b, { id: me.body.id as string });
}

export const LOOK = { hair: '#f59ac0', outfit: '#7c5cff', accessory: 'ribbon' } as const;
