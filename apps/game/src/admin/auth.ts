/**
 * Password login for the admin page. The password comes from ADMIN_PASSWORD
 * (never from code); a successful login gets a signed, HttpOnly cookie, so the
 * password itself is only sent once.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'chanom_admin';
export const SESSION_DAYS = 7;
const LOGIN_WINDOW_MS = 10 * 60_000;
const MAX_FAILED_LOGINS = 5;

const sha256 = (s: string) => createHash('sha256').update(s).digest();

export class AdminAuth {
  /** Changing the password signs everyone out, since the key derives from it. */
  private readonly key: Buffer | null;
  private failures = new Map<string, { count: number; since: number }>();

  constructor(private readonly password = process.env.ADMIN_PASSWORD ?? '') {
    this.key = password ? sha256(`chanom-admin:${password}`) : null;
  }

  get enabled() {
    return this.key !== null;
  }

  /** Too many wrong passwords from this address recently? */
  isLockedOut(ip: string, now = Date.now()) {
    const f = this.failures.get(ip);
    if (!f || now - f.since > LOGIN_WINDOW_MS) return false;
    return f.count >= MAX_FAILED_LOGINS;
  }

  /** Check a password attempt. Returns a session token on success. */
  login(ip: string, attempt: unknown, now = Date.now()): string | null {
    if (!this.key || typeof attempt !== 'string') return null;
    // Compare hashes so the comparison takes the same time whatever the input length
    if (timingSafeEqual(sha256(attempt), sha256(this.password))) {
      this.failures.delete(ip);
      return this.sign(now + SESSION_DAYS * 86_400_000);
    }
    const f = this.failures.get(ip);
    if (!f || now - f.since > LOGIN_WINDOW_MS) this.failures.set(ip, { count: 1, since: now });
    else f.count++;
    return null;
  }

  /** Is this cookie value a valid, unexpired session? */
  verify(token: string | undefined, now = Date.now()) {
    if (!this.key || !token) return false;
    const [exp, sig] = token.split('.');
    if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false;
    const expected = this.signature(exp);
    const given = Buffer.from(sig, 'base64url');
    return given.length === expected.length && timingSafeEqual(given, expected);
  }

  private sign(expiresAt: number) {
    const exp = String(expiresAt);
    return `${exp}.${this.signature(exp).toString('base64url')}`;
  }

  private signature(exp: string) {
    return createHmac('sha256', this.key!).update(exp).digest();
  }
}

/** Read one cookie from a Cookie header. */
export function readCookie(header: string | undefined, name: string) {
  for (const part of header?.split(';') ?? []) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}
