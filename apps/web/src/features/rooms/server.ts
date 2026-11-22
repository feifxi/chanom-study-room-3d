import 'server-only';
import { cookies } from 'next/headers';
import type { Schemas } from '@/lib/api/client';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/**
 * A room, asked on the server while rendering (with the request's cookies, like getMe). Null when
 * it doesn't exist or this person can't see it (a private room they're not in).
 */
export async function getRoom(id: string): Promise<Schemas['Room'] | null> {
  const cookie = (await cookies()).toString();
  try {
    const res = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(id)}`, { headers: { cookie }, cache: 'no-store' });
    return res.ok ? ((await res.json()) as Schemas['Room']) : null;
  } catch {
    return null;
  }
}
