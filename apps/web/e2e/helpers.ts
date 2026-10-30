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
  await expect(page.getByRole('status', { name: 'Connected' })).toBeVisible({ timeout: 45_000 });
  await page.waitForFunction(() => {
    const w = window as unknown as { __study?: { room?: { state?: { players?: Map<string, unknown> } } } };
    return !!w.__study?.room?.state?.players?.size;
  });
}

/**
 * Walk the local player to (x, z) through the client, like real input: move its predicted position
 * in small steps and let it send the (sequence-numbered) moves itself, then wait until the server
 * agrees. Sending moves behind the client's back would fight its reconciliation.
 */
export async function walkTo(page: Page, x: number, z: number) {
  await page.evaluate(
    async ([tx, tz]) => {
      type P = { x: number; z: number };
      const s = (
        window as unknown as { __study: { room: { sessionId: string; state: { players: Map<string, P> } }; motion: { current: P } } }
      ).__study;
      const m = s.motion.current;
      for (let i = 0; i < 400; i++) {
        const dx = tx - m.x;
        const dz = tz - m.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.02) break;
        const step = Math.min(d, 0.2); // ~3 m/s at this pace, a walk
        m.x += (dx / d) * step;
        m.z += (dz / d) * step;
        await new Promise((r) => setTimeout(r, 66));
      }
      Object.assign(m, { x: tx, z: tz });
      // Wait for the server to catch up with the last move (CI runners are slow: allow 6 s)
      for (let i = 0; i < 120; i++) {
        const p = s.room.state.players.get(s.room.sessionId)!;
        if (Math.hypot(p.x - tx, p.z - tz) < 0.05) break;
        await new Promise((r) => setTimeout(r, 50));
      }
    },
    [x, z] as const,
  );
  // Fail here, with the details, rather than later with a vague "hint not visible"
  const where = await roomSnapshot(page);
  const off = Math.max(Math.hypot(where.client.x - x, where.client.z - z), Math.hypot(where.server.x - x, where.server.z - z));
  if (off > 0.3) throw new Error(`walkTo(${x.toFixed(2)}, ${z.toFixed(2)}) didn't arrive: ${JSON.stringify(where)}`);
}

/** Where we are (client prediction and server), the NPCs, and the hint button: for failure messages. */
export function roomSnapshot(page: Page) {
  return page.evaluate(() => {
    type P = { x: number; z: number };
    const s = (
      window as unknown as {
        __study: {
          room: { sessionId: string; state: { players: Map<string, P>; npcs: Map<string, P & { kind: string }> } };
          motion: { current: P };
        };
      }
    ).__study;
    const p = s.room.state.players.get(s.room.sessionId)!;
    const round = (v: number) => Math.round(v * 100) / 100;
    return {
      client: { x: round(s.motion.current.x), z: round(s.motion.current.z) },
      server: { x: round(p.x), z: round(p.z) },
      npcs: [...s.room.state.npcs.values()].map((n) => `${n.kind}@${round(n.x)},${round(n.z)}`),
      hint: document.querySelector('button.panel.absolute')?.textContent ?? null,
    };
  });
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
