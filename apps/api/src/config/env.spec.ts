import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.js';

describe('validateEnv', () => {
  it('fills in defaults around the required values', () => {
    const env = validateEnv({ DATABASE_URL: 'postgresql://u:p@localhost:5433/db' });
    expect(env).toMatchObject({ NODE_ENV: 'development', PORT: 4000, LOG_LEVEL: 'info' });
  });

  it('coerces the port from a string', () => {
    expect(validateEnv({ DATABASE_URL: 'postgresql://u:p@h/db', PORT: '5000' }).PORT).toBe(5000);
  });

  it('fails at startup with every problem listed', () => {
    expect(() => validateEnv({ PORT: 'abc' })).toThrow(/DATABASE_URL[\s\S]*PORT|PORT[\s\S]*DATABASE_URL/);
  });
});
