import type { AdminOverview } from '@study/shared';
import { API_URL } from '@/lib/config';
import { api } from '@/lib/api';

// The API keeps the admin session in an HttpOnly cookie on the same origin, so fetch sends it as is.

export type OverviewResult = { kind: 'ok'; data: AdminOverview } | { kind: 'signedOut' } | { kind: 'error'; message: string };

const UNREACHABLE = "Can't reach the API server";
const errorOf = async (res: Response, fallback: string) => ((await res.json().catch(() => ({}))) as { error?: string }).error ?? fallback;

export async function fetchOverview(): Promise<OverviewResult> {
  try {
    const res = await api.admin.overview.$get();
    // 401 comes from the requireAdmin middleware, which the route types don't include
    if ((res.status as number) === 401) return { kind: 'signedOut' };
    if (!res.ok) return { kind: 'error', message: await errorOf(res, `HTTP ${res.status}`) };
    return { kind: 'ok', data: await res.json() };
  } catch {
    return { kind: 'error', message: UNREACHABLE };
  }
}

/** Returns an error message, or null when signed in. */
export async function login(password: string): Promise<string | null> {
  try {
    const res = await api.admin.login.$post({ json: { password } });
    return res.ok ? null : await errorOf(res, 'Could not sign in');
  } catch {
    return UNREACHABLE;
  }
}

export const deleteFeedback = (id: number) => api.admin.feedback[':id'].$delete({ param: { id: String(id) } });

export const logout = () => api.admin.logout.$post();

export const FEEDBACK_CSV_URL = `${API_URL}/admin/feedback.csv`;
