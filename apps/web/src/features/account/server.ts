import 'server-only';
import { cookies } from 'next/headers';
import type { Me } from '@/lib/api/client';

// Seen from this server: localhost locally, the api container in production (same as the rewrite)
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/**
 * Who's signed in, asked on the server while rendering: the request's cookies go along to the API,
 * which checks the session. Null when signed out (or when the API is unreachable).
 */
export async function getMe(): Promise<Me | null> {
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  try {
    const res = await fetch(`${API_URL}/api/me`, { headers: { cookie }, cache: 'no-store' });
    // 204: signed out
    return res.status === 200 ? ((await res.json()) as Me) : null;
  } catch {
    return null;
  }
}
