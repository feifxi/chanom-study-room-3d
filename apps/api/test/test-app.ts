import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import type { Mail } from '../src/mail/mail.service.js';
import { MailService } from '../src/mail/mail.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { StorageService } from '../src/storage/storage.service.js';
import { APP_OPTIONS, configureApp } from '../src/setup.js';
import { GatewayModule } from '../src/gateway/gateway.module.js';
import { LIVE_PATH } from '../src/gateway/live.gateway.js';
import { RedisIoAdapter } from '../src/gateway/redis-io.adapter.js';
import type { AddressInfo } from 'node:net';
import { io, type Socket as ClientSocket } from 'socket.io-client';

export const ORIGIN = 'http://localhost:3000';

/** S3 in memory: CI has no AWS Emulator, and storage leaves the machine in production. */
export class MemoryStorage {
  readonly files = new Map<string, { body: Buffer; contentType: string }>();
  async put(key: string, body: Buffer, contentType: string) {
    this.files.set(key, { body, contentType });
  }
  async get(key: string) {
    const file = this.files.get(key);
    if (!file) throw new Error(`No file ${key}`);
    return file.body;
  }
  /** Tests "upload" by putting the file at the key themselves */
  async uploadUrl(key: string) {
    return `memory://put/${key}`;
  }
  async downloadUrl(key: string) {
    return `memory://get/${key}`;
  }
  async remove(keys: string[]) {
    for (const key of keys) this.files.delete(key);
  }
}

/**
 * The whole app on the test database, with email caught in `sent` instead of delivered and files
 * kept in `storage` instead of S3.
 */
export async function createTestApp() {
  const sent: Mail[] = [];
  const storage = new MemoryStorage();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue({ deliver: async (mail: Mail) => void sent.push(mail) })
    .overrideProvider(StorageService)
    .useValue(storage)
    .compile();
  const app = moduleRef.createNestApplication({ ...APP_OPTIONS, logger: false });
  configureApp(app);
  await app.init();
  return { app, sent, storage, prisma: app.get(PrismaService) };
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
    /** The session cookie after signing in, for the live gateway's handshake */
    cookie: '',
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
  const res = await b.post('/api/auth/sign-in/email-otp', { email, otp }).expect(200);
  b.cookie = ([] as string[])
    .concat(res.headers['set-cookie'] ?? [])
    .map((c) => c.split(';')[0])
    .join('; ');
}

/**
 * The live gateway on a free port, sharing Redis with the API under test. `connect` opens a socket
 * as a signed-in browser.
 */
export async function createTestGateway() {
  const moduleRef = await Test.createTestingModule({ imports: [GatewayModule] }).compile();
  const gateway = moduleRef.createNestApplication({ logger: false });
  const adapter = new RedisIoAdapter(gateway);
  await adapter.connect();
  gateway.useWebSocketAdapter(adapter);
  await gateway.listen(0);
  const { port } = gateway.getHttpServer().address() as AddressInfo;
  const connect = (b: Browser) =>
    new Promise<ClientSocket>((resolve, reject) => {
      const socket = io(`http://localhost:${port}`, {
        path: LIVE_PATH,
        addTrailingSlash: false,
        transports: ['websocket'],
        extraHeaders: { cookie: b.cookie },
        reconnection: false,
      });
      // Resolves the moment it's open: the gateway must be ready for "watch" straight away
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);
    });
  return { gateway, connect };
}

/** Waits for one live event (or fails after a second). */
export function nextEvent<T = unknown>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No ${event} event`)), 1000);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
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
