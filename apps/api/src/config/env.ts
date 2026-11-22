import { z } from 'zod';

/** An optional secret: empty strings in .env count as unset. */
const optional = z
  .string()
  .optional()
  .transform((v) => v || undefined);

/**
 * Every environment variable the API reads, checked once at startup so a missing or malformed value
 * fails fast with a clear message instead of surfacing later as a confusing runtime error.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    /** Where people open Connecta. The browser only calls this origin; /api is routed here. */
    WEB_ORIGIN: z.url().default('http://localhost:3000'),
    DATABASE_URL: z.url(),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
    /** The live gateway (chat, presence) listens here; the web app proxies /live to it */
    GATEWAY_PORT: z.coerce.number().int().positive().default(4001),
    /** Carries live events from the API to the gateway, and between gateways */
    REDIS_URL: z.url().default('redis://localhost:6379'),

    /** Signs join tickets for the game server (apps/game has the same value): 32+ random characters */
    GAME_SECRET: z.string().min(32),

    /** Signs session cookies and encrypts OAuth tokens: 32+ random characters (openssl rand -base64 32) */
    AUTH_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
    DISCORD_CLIENT_ID: optional,
    DISCORD_CLIENT_SECRET: optional,

    /** smtp: Mailpit locally. ses: Amazon SES in production. */
    MAIL_DRIVER: z.enum(['smtp', 'ses']).default('smtp'),
    SMTP_URL: z.url().default('smtp://localhost:1025'),
    MAIL_FROM: z.string().default('Connecta <hello@connecta.local>'),

    /** Set in production; the AWS Emulator accepts any region */
    AWS_REGION: z.string().default('us-east-1'),
    /** Set only locally and in tests (the AWS Emulator); production talks to AWS itself */
    AWS_ENDPOINT_URL: optional.pipe(z.url().optional()),
    /** The AWS Emulator's certificate (it serves HTTPS with its own CA) */
    AWS_CA_BUNDLE: optional,
    S3_BUCKET: z.string().default('connecta-files'),
  })
  .refine((env) => !env.GOOGLE_CLIENT_ID === !env.GOOGLE_CLIENT_SECRET, {
    message: 'Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither',
  })
  .refine((env) => !env.DISCORD_CLIENT_ID === !env.DISCORD_CLIENT_SECRET, {
    message: 'Set both DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET, or neither',
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  return result.data;
}
