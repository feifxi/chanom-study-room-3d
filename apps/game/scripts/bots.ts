/**
 * Spawns a few wandering test students in the first open room:
 *   pnpm --filter @study/game bots [count]
 * Each bot walks between random spots, sometimes sits at a free seat and says hi.
 */
import { Client, type Room } from '@colyseus/sdk';
import { OBSTACLES, ROOM_NAME, SEATS, randomLook } from '@study/shared';

const URL = process.env.GAME_URL ?? 'http://localhost:2567';
const COUNT = Number(process.argv[2] ?? 4);
const NAMES = ['Mint', 'Ploy', 'Bank', 'Fern', 'Nine', 'Beam', 'June', 'Pond'];
const SUBJECTS = ['Calculus', 'English', 'Physics', 'History', 'Coding', 'Chemistry'];
const LINES = ['Hi everyone 👋', 'What are you studying?', 'You got this ✨', 'Mind if I sit here?', 'Quick break ☕'];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]!;

const blocked = (x: number, z: number) =>
  OBSTACLES.some((o) => (o.kind === 'box' ? x > o.minX - 0.4 && x < o.maxX + 0.4 && z > o.minZ - 0.4 && z < o.maxZ + 0.4 : Math.hypot(x - o.x, z - o.z) < o.r + 0.4));

async function walk(room: Room, me: () => any, tx: number, tz: number) {
  for (let i = 0; i < 200; i++) {
    const p = me();
    const dx = tx - p.x;
    const dz = tz - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.15) break;
    const step = Math.min(d, 0.2);
    const nx = p.x + (dx / d) * step;
    const nz = p.z + (dz / d) * step;
    if (blocked(nx, nz) && d > 1) break; // give up on paths through furniture
    room.send('move', { x: nx, z: nz, yaw: Math.atan2(dx, dz), moving: true });
    await sleep(66);
  }
  const p = me();
  room.send('move', { x: p.x, z: p.z, yaw: p.yaw, moving: false });
}

async function bot(i: number) {
  const room = await new Client(URL).joinOrCreate(ROOM_NAME, { name: NAMES[i % NAMES.length], look: randomLook() });
  room.onMessage('chat', () => {});
  const me = () => (room.state as any).players.get(room.sessionId);
  await sleep(500);
  for (;;) {
    if (Math.random() < 0.45) {
      const taken = new Set<string>();
      (room.state as any).players.forEach((p: any) => p.seatId && taken.add(p.seatId));
      const seat = pick(SEATS.filter((s) => !taken.has(s.id)));
      // Approach from the aisle side of the seat
      await walk(room, me, seat.x, seat.z - Math.cos(seat.yaw) * 0.7);
      await walk(room, me, seat.x, seat.z - Math.cos(seat.yaw) * 0.4);
      room.send('sit', { seatId: seat.id });
      // Study at the desk on a personal pomodoro
      room.send('subject', { text: pick(SUBJECTS) });
      room.send('timer:personal', { phase: 'focus', endsAt: Date.now() + 25 * 60_000 });
      await sleep(6000 + Math.random() * 8000);
      room.send('timer:personal', { phase: 'idle', endsAt: 0 });
      room.send('stand', {});
    } else {
      let x = 0;
      let z = 0;
      do {
        x = (Math.random() - 0.5) * 16;
        z = (Math.random() - 0.5) * 10;
      } while (blocked(x, z));
      await walk(room, me, x, z);
      if (Math.random() < 0.5) {
        room.send('typing', { on: true });
        await sleep(1800 + Math.random() * 1500);
        room.send('chat', { text: pick(LINES) });
      }
      await sleep(1500 + Math.random() * 2500);
    }
  }
}

console.log(`Spawning ${COUNT} bots on ${URL}`);
await Promise.all(Array.from({ length: COUNT }, (_, i) => bot(i)));
