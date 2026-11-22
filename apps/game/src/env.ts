import { z } from 'zod';

/** Every environment variable the game server reads, checked at startup. */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().nonnegative().default(4002),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
  /** Room events from the API, presence to the gateway */
  REDIS_URL: z.url().default('redis://localhost:6379'),
  /** Checks the API's join tickets: the same value as the API's GAME_SECRET (32+ characters) */
  GAME_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(raw: Record<string, unknown> = process.env): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  return result.data;
}
