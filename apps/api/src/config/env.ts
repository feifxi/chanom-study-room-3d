import { z } from 'zod';

/**
 * Every environment variable the API reads, checked once at startup so a missing or malformed value
 * fails fast with a clear message instead of surfacing later as a confusing runtime error.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.url(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  return result.data;
}
