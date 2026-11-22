import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

const COOKIE = 'connecta_device';

/**
 * A random id for this browser, kept in a cookie for a year. Only the age lock uses it: an under-13
 * birthday locks the browser too, not only the sign-in.
 */
export function deviceId(req: Request, res: Response, secure: boolean): string {
  const existing = req.headers.cookie
    ?.split(';')
    .map((c) => c.trim().split('='))
    .find(([name]) => name === COOKIE)?.[1];
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing;
  const id = randomUUID();
  res.cookie(COOKIE, id, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: 365 * 24 * 60 * 60 * 1000 });
  return id;
}
