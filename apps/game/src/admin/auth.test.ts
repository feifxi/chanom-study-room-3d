import { describe, expect, it } from 'vitest';
import { AdminAuth, readCookie } from './auth';

describe('AdminAuth', () => {
  it('is off without a password', () => {
    const auth = new AdminAuth('');
    expect(auth.enabled).toBe(false);
    expect(auth.login('ip', '')).toBeNull();
  });

  it('issues a session for the right password only', () => {
    const auth = new AdminAuth('s3cret');
    expect(auth.login('ip', 'nope')).toBeNull();
    const token = auth.login('ip', 's3cret')!;
    expect(auth.verify(token)).toBe(true);
    expect(auth.verify(`${token}x`)).toBe(false);
    expect(auth.verify(undefined)).toBe(false);
  });

  it('expires sessions and rejects tampered expiry', () => {
    const auth = new AdminAuth('s3cret');
    const token = auth.login('ip', 's3cret', 0)!;
    expect(auth.verify(token, 8 * 86_400_000)).toBe(false);
    const [, sig] = token.split('.');
    expect(auth.verify(`99999999999999.${sig}`)).toBe(false);
  });

  it('signs everyone out when the password changes', () => {
    const token = new AdminAuth('old').login('ip', 'old')!;
    expect(new AdminAuth('new').verify(token)).toBe(false);
  });

  it('locks an address out after five wrong passwords for ten minutes', () => {
    const auth = new AdminAuth('s3cret');
    for (let i = 0; i < 5; i++) auth.login('ip', 'wrong', 1000);
    expect(auth.isLockedOut('ip', 1000)).toBe(true);
    expect(auth.isLockedOut('other', 1000)).toBe(false);
    expect(auth.isLockedOut('ip', 1000 + 11 * 60_000)).toBe(false);
  });
});

describe('readCookie', () => {
  it('finds a cookie among others', () => {
    expect(readCookie('a=1; chanom_admin=abc.def; b=2', 'chanom_admin')).toBe('abc.def');
    expect(readCookie(undefined, 'x')).toBeUndefined();
  });
});
