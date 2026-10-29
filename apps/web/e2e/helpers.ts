import { expect, type Page } from '@playwright/test';

/** Names are unique per test so assertions never match someone from another test. */
export const uniqueName = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 6)}`;

/** Save a profile before the app loads, so we join with a known nickname. */
export async function useProfile(page: Page, name: string) {
  await page.addInitScript((n) => {
    const key = 'chanom-study:profile';
    try {
      const profile = JSON.parse(localStorage.getItem(key) ?? '{}');
      localStorage.setItem(key, JSON.stringify({ ...profile, name: n }));
    } catch {
      localStorage.setItem(key, JSON.stringify({ name: n }));
    }
  }, name);
}

/** Open the room and wait until we're connected and the dev test handle is ready. */
export async function enterRoom(page: Page) {
  await page.goto('/room');
  // The first visit after a dev-server restart compiles the 3D room, which can take a while
  await expect(page.getByText('Connected')).toBeVisible({ timeout: 45_000 });
  await page.waitForFunction(() => {
    const w = window as unknown as { __study?: { room?: { state?: { players?: Map<string, unknown> } } } };
    return !!w.__study?.room?.state?.players?.size;
  });
}

/**
 * Walk the local player to (x, z) the way the client does: small server-validated
 * steps, then line the local prediction up with where the server put us.
 */
export async function walkTo(page: Page, x: number, z: number) {
  await page.evaluate(
    async ([tx, tz]) => {
      type P = { x: number; z: number };
      const s = (
        window as unknown as {
          __study: {
            room: { sessionId: string; state: { players: Map<string, P> }; send: (t: string, m: unknown) => void };
            motion: { current: P };
          };
        }
      ).__study;
      const me = () => s.room.state.players.get(s.room.sessionId)!;
      for (let i = 0; i < 200; i++) {
        const p = me();
        const dx = tx - p.x;
        const dz = tz - p.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.05) break;
        const step = Math.min(d, 0.25);
        s.room.send('move', { x: p.x + (dx / d) * step, z: p.z + (dz / d) * step, yaw: 0, moving: true });
        await new Promise((r) => setTimeout(r, 70));
      }
      s.room.send('move', { x: me().x, z: me().z, yaw: 0, moving: false });
      Object.assign(s.motion.current, { x: me().x, z: me().z });
      // Let the client's own position update reach the server before we act on it
      await new Promise((r) => setTimeout(r, 200));
    },
    [x, z] as const,
  );
}

/** The local player as the server sees it. */
export function me(page: Page) {
  return page.evaluate(() => {
    const s = (
      window as unknown as {
        __study: { room: { sessionId: string; state: { players: Map<string, { x: number; z: number; seatId: string }> } } };
      }
    ).__study;
    const p = s.room.state.players.get(s.room.sessionId)!;
    return { x: p.x, z: p.z, seatId: p.seatId };
  });
}
