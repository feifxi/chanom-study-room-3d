import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { anonymous, emailOTP } from 'better-auth/plugins';
import type { Env } from '../config/env.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { MailService } from '../mail/mail.service.js';
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
