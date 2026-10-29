import type { AdminOverview } from '@study/shared';
import { GAME_URL } from '@/lib/config';

/** The game server keeps the admin session in an HttpOnly cookie, so every call sends credentials. */
const call = (path: string, init?: RequestInit) => fetch(`${GAME_URL}${path}`, { credentials: 'include', ...init });

export type OverviewResult = { kind: 'ok'; data: AdminOverview } | { kind: 'signedOut' } | { kind: 'error'; message: string };

export async function fetchOverview(): Promise<OverviewResult> {
  try {
    const res = await call('/admin/overview');
    if (res.status === 401) return { kind: 'signedOut' };
    if (!res.ok)
      return { kind: 'error', message: ((await res.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${res.status}` };
    return { kind: 'ok', data: (await res.json()) as AdminOverview };
  } catch {
    return { kind: 'error', message: "Can't reach the game server" };
  }
}

/** Returns an error message, or null when signed in. */
export async function login(password: string): Promise<string | null> {
  try {
    const res = await call('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) return null;
    return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not sign in';
  } catch {
    return "Can't reach the game server";
  }
}

export const deleteFeedback = (id: number) => call(`/admin/feedback/${id}`, { method: 'DELETE' });

export const logout = () => call('/admin/logout', { method: 'POST' });

export const FEEDBACK_CSV_URL = `${GAME_URL}/admin/feedback.csv`;
