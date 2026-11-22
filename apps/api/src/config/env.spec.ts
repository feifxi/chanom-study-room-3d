import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.js';

const REQUIRED = { DATABASE_URL: 'postgresql://u:p@localhost:5433/db', AUTH_SECRET: 'x'.repeat(32) };

describe('validateEnv', () => {
  it('fills in defaults around the required values', () => {
    const env = validateEnv(REQUIRED);
    expect(env).toMatchObject({ NODE_ENV: 'development', PORT: 4000, LOG_LEVEL: 'info', MAIL_DRIVER: 'smtp' });
  });

  it('coerces the port from a string', () => {
    expect(validateEnv({ ...REQUIRED, PORT: '5000' }).PORT).toBe(5000);
  });

  it('treats empty optional values as unset', () => {
    const env = validateEnv({ ...REQUIRED, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', AWS_ENDPOINT_URL: '' });
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.AWS_ENDPOINT_URL).toBeUndefined();
  });

  it('wants both halves of a sign-in provider', () => {
    expect(() => validateEnv({ ...REQUIRED, DISCORD_CLIENT_ID: 'id' })).toThrow(/DISCORD_CLIENT_SECRET/);
  });

  it('fails at startup with every problem listed', () => {
    expect(() => validateEnv({ PORT: 'abc' })).toThrow(/DATABASE_URL[\s\S]*AUTH_SECRET|AUTH_SECRET[\s\S]*DATABASE_URL/);
  });
});
