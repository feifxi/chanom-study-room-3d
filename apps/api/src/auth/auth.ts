import type { ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { anonymous, emailOTP } from 'better-auth/plugins';
import type { Env } from '../config/env.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { MailService } from '../mail/mail.service.js';
import { whenUtc } from '../mail/account-mail.js';
import { signInCodeMail } from '../mail/sign-in-code.js';

export interface AuthDeps {
  env: Pick<
    Env,
    'NODE_ENV' | 'WEB_ORIGIN' | 'AUTH_SECRET' | 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'DISCORD_CLIENT_ID' | 'DISCORD_CLIENT_SECRET'
  >;
  prisma: PrismaClient;
  mail: Pick<MailService, 'deliver'>;
}

/** Guests get an address on a reserved domain that can never receive mail. */
export const GUEST_EMAIL_DOMAIN = 'guest.connecta.invalid';

/**
 * Sign-in (docs/v2/features/02-accounts.md), served by Better Auth under /api/auth/*: Google,
 * Discord, a 6-digit email code, and guests. Sessions are rows in Postgres with an HttpOnly cookie
 * holding only the token. What comes after signing in (birthday, @handle, character) is the
 * accounts module's job.
 */
export function createAuth({ env, prisma, mail }: AuthDeps) {
  return betterAuth({
    appName: 'Connecta',
    // The browser reaches the API through the web origin (a Next rewrite locally, nginx in production)
    baseURL: env.WEB_ORIGIN,
    basePath: '/api/auth',
    secret: env.AUTH_SECRET,
    trustedOrigins: [env.WEB_ORIGIN],
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    telemetry: { enabled: false },
    advanced: {
      cookiePrefix: 'connecta',
      // Rate limits are per client IP. In production nginx sets X-Real-IP to the connecting address
      // (overwriting anything the client sent); X-Forwarded-For's first entry could be made up, so
      // it's only trusted locally, where the Next rewrite sets it
      ipAddress: {
        ipAddressHeaders: env.NODE_ENV === 'production' ? ['x-real-ip'] : ['x-real-ip', 'x-forwarded-for'],
      },
    },
    // Suspended or banned by the Connecta team (admin site): no new session, whichever way in
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const why = await restriction(prisma, session.userId);
            if (why) throw new APIError('FORBIDDEN', { message: why, code: 'ACCOUNT_RESTRICTED' });
          },
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // extended at most once a day while in use
    },
    user: {
      // Connecta's own fields. input: false keeps them out of Better Auth's sign-up and update-user
      // routes; the accounts module writes them after checking the rules.
      additionalFields: {
        handle: { type: 'string', required: false, input: false },
        handleChangedAt: { type: 'date', required: false, input: false },
        birthday: { type: 'date', required: false, input: false, returned: false },
        look: { type: 'json', required: false, input: false },
      },
    },
    account: {
      // One person, several ways in: Google, Discord and email link to the same account when the
      // provider has verified the address
      // An email code always works too (it has no row here), so Google or Discord can be disconnected
      // even when it's the only one linked
      accountLinking: { enabled: true, trustedProviders: ['google', 'discord'], allowUnlinkingAll: true },
    },
    socialProviders: {
      ...(env.GOOGLE_CLIENT_ID &&
        env.GOOGLE_CLIENT_SECRET && {
          google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: 'select_account' },
        }),
      ...(env.DISCORD_CLIENT_ID &&
        env.DISCORD_CLIENT_SECRET && {
          discord: { clientId: env.DISCORD_CLIENT_ID, clientSecret: env.DISCORD_CLIENT_SECRET },
        }),
    },
    // Limits sign-in attempts per IP. In memory: one API process for now (Redis when there are more)
    rateLimit: { enabled: env.NODE_ENV !== 'test', storage: 'memory' },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        storeOTP: 'hashed',
        sendVerificationOTP: async ({ email, otp }) => {
          await mail.deliver(signInCodeMail(email, otp));
        },
      }),
      anonymous({
        emailDomainName: GUEST_EMAIL_DOMAIN,
        // A guest who signs up keeps their character: copy the look (and the name, if the account
        // has none yet) before Better Auth deletes the guest
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          const guest = await prisma.user.findUnique({ where: { id: anonymousUser.user.id } });
          const account = await prisma.user.findUnique({ where: { id: newUser.user.id } });
          if (!guest || !account || account.handle) return;
          await prisma.user.update({
            where: { id: account.id },
            data: { name: guest.name, look: guest.look ?? undefined },
          });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Why this account can't sign in now, in the words the sign-in page shows; null when it can */
export async function restriction(prisma: PrismaClient, userId: string, now = new Date()): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { suspendedUntil: true, bannedAt: true } });
  if (!user) return null;
  const suspended = user.suspendedUntil && user.suspendedUntil > now;
  if (!user.bannedAt && !suspended) return null;
  const last = await prisma.accountAction.findFirst({
    where: { userId, kind: user.bannedAt ? 'ban' : 'suspend' },
    orderBy: { createdAt: 'desc' },
    select: { reason: true },
  });
  const head = user.bannedAt ? 'Your account is banned.' : `Your account is suspended until ${whenUtc(user.suspendedUntil!)}.`;
  const reason = last?.reason && `Reason: ${last.reason}${/[.!?]$/.test(last.reason) ? '' : '.'}`;
  return [head, reason, 'Reply to our email to appeal.'].filter(Boolean).join(' ');
}

/** Better Auth from the app's config: the API serves it; the gateway uses it to read sessions. */
export function authFromConfig(config: ConfigService<Env, true>, prisma: PrismaClient, mail: AuthDeps['mail']) {
  const get = <K extends keyof Env>(key: K) => config.get(key, { infer: true });
  return createAuth({
    env: {
      NODE_ENV: get('NODE_ENV'),
      WEB_ORIGIN: get('WEB_ORIGIN'),
      AUTH_SECRET: get('AUTH_SECRET'),
      GOOGLE_CLIENT_ID: get('GOOGLE_CLIENT_ID'),
      GOOGLE_CLIENT_SECRET: get('GOOGLE_CLIENT_SECRET'),
      DISCORD_CLIENT_ID: get('DISCORD_CLIENT_ID'),
      DISCORD_CLIENT_SECRET: get('DISCORD_CLIENT_SECRET'),
    },
    prisma,
    mail,
  });
}
