/**
 * End-to-end smoke test against a running game server:
 *   pnpm --filter @study/game smoke   (server must be running on GAME_URL)
 *
 * Checks room sharding, the server-side speed limit, seat rules and chat.
 */
import { Client, Callbacks, type Room } from '@colyseus/sdk';
import { GACHA_MACHINE, MAX_PLAYERS, ROOM_NAME, SEATS, SEAT_BY_ID, SPIN_COOLDOWN_MS, SPIN_REVEAL_MS, type RoomListing } from '@study/shared';

const URL = process.env.GAME_URL ?? 'http://localhost:2567';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(label: string, ok: boolean, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const client = new Client(URL);
const look = { hair: '#f59ac0', outfit: '#7c5cff', accessory: 'ribbon' };
async function join(name: string) {
  const room = await client.joinOrCreate(ROOM_NAME, { name, look });
  room.onMessage('chat', () => {}); // bots ignore chat; avoids "not registered" warnings
  return room;
}
const me = (room: Room) => (room.state as any).players.get(room.sessionId);

// 1. Sharding: MAX_PLAYERS + 1 people should open a second room
const rooms: Room[] = [];
for (let i = 0; i <= MAX_PLAYERS; i++) rooms.push(await join(`bot${i}`));
const ids = new Set(rooms.map((r) => r.roomId));
check('extra visitor opens a second room', ids.size === 2, `${ids.size} rooms`);
const listing = (await (await fetch(`${URL}/rooms`)).json()) as RoomListing[];
check('lobby lists both rooms', listing.length === 2, listing.map((l) => `${l.label} ${l.clients}/${l.maxClients}`).join(', '));

const [a, b] = rooms as [Room, Room];
await sleep(300);

// 2. Speed limit: a teleport is cut down to a plausible step
const start = { x: me(a).x, z: me(a).z };
a.send('move', { x: start.x + 50, z: start.z, yaw: 0, moving: true });
await sleep(300);
const moved = Math.hypot(me(a).x - start.x, me(a).z - start.z);
check('teleport is rejected by the speed limit', moved < 2, `moved ${moved.toFixed(2)}m`);

// 3. Seats: too far fails; walking over and sitting works; a taken seat is refused
const seat = SEATS.find((s) => s.id === 't10-f0')!;
a.send('sit', { seatId: seat.id });
await sleep(200);
check('cannot sit from across the room', me(a).seatId === '');

async function walkTo(room: Room, x: number, z: number) {
  for (let i = 0; i < 60; i++) {
    const p = me(room);
    const dx = x - p.x;
    const dz = z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.1) return;
    const step = Math.min(d, 0.3);
    room.send('move', { x: p.x + (dx / d) * step, z: p.z + (dz / d) * step, yaw: 0, moving: true });
    await sleep(70);
  }
}
await walkTo(a, seat.x, seat.z + 0.6);
a.send('sit', { seatId: seat.id });
await sleep(200);
check('sits after walking to the seat', me(a).seatId === seat.id);

await walkTo(b, seat.x + 0.3, seat.z + 0.6);
b.send('sit', { seatId: seat.id });
await sleep(200);
check('a taken seat is refused', me(b).seatId === '');

a.send('stand', {});
await sleep(200);
check('stand clears the seat', me(a).seatId === '');

// 4. Chat reaches everyone in the room
const received = new Promise<string>((resolve) => b.onMessage('chat', (m: any) => resolve(m.text)));
a.send('chat', { text: '  hello study room!  ' });
const text = await Promise.race([received, sleep(2000).then(() => 'timeout')]);
check('chat is broadcast and trimmed', text === 'hello study room!', text);

// 5. Typing indicator: visible to others, cleared by sending, and times out if the client goes quiet
const playerOf = (viewer: Room, target: Room) => (viewer.state as any).players.get(target.sessionId);
a.send('typing', { on: true });
await sleep(300);
check('others see who is typing', playerOf(b, a).typing === true);
a.send('chat', { text: 'done typing' });
await sleep(300);
check('sending a message clears typing', playerOf(b, a).typing === false);
a.send('typing', { on: true });
await sleep(7500);
check('typing clears itself after going quiet', playerOf(b, a).typing === false);

// 6. Pomodoro (personal only): status, subject, focus time and away
a.send('timer:personal', { phase: 'focus', endsAt: Date.now() + 25 * 60_000 });
a.send('subject', { text: '  Calculus  ' });
await sleep(400);
check('focus shows up with its subject and end time', me(a).status === 'focus' && me(a).subject === 'Calculus' && me(a).statusEndsAt > Date.now());
check('others see when the focus stretch started', Math.abs(playerOf(b, a).focusSince - Date.now()) < 3000);
check('people without a timer stay idle', me(b).status === 'idle' && me(b).focusSince === 0);
a.send('away', { on: true });
await sleep(300);
check('away overrides the timer and ends the focus stretch', me(a).status === 'away' && me(a).focusSince === 0);
a.send('away', { on: false });
await sleep(300);
check('back from away resumes focus with a fresh start time', me(a).status === 'focus' && me(a).focusSince > 0);
a.send('timer:personal', { phase: 'break', endsAt: Date.now() + 5 * 60_000 });
await sleep(300);
check('break ends the focus stretch', me(a).status === 'break' && me(a).focusSince === 0);
a.send('timer:personal', { phase: 'idle', endsAt: 0 });
await sleep(300);
check('stopping returns to idle', me(a).status === 'idle');

const t0 = Date.now();
const clock = await new Promise<number>((resolve) => {
  a.onMessage('clock', (m: any) => resolve(m.serverNow));
  a.send('clock', {});
});
check('clock sync replies with server time', Math.abs(clock - (t0 + Date.now()) / 2) < 1000);

const voice = await new Promise<{ url: string; token: string } | null>((resolve) => {
  a.onMessage('voice:token', resolve);
  a.send('voice:token', {});
  setTimeout(() => resolve(null), 2000);
});
const grant = voice ? JSON.parse(Buffer.from(voice.token.split('.')[1]!, 'base64url').toString()) : null;
check('voice token is issued for this room and session', grant?.video?.room === a.roomId && grant?.sub === a.sessionId, voice?.url);

// 7. NPCs and the Buddy Machine
{
  const npcs = () => (a.state as any).npcs as Map<string, any>;
  const list = () => [...npcs().entries()];
  check('a new room starts with a resident cat', list().some(([, n]) => n.kind === 'cat'));

  const errors: string[] = [];
  const spun: any[] = [];
  const announcements: string[] = [];
  const reactions: any[] = [];
  a.onMessage('gacha:error', (m: any) => errors.push(m.message));
  a.onMessage('gacha:spun', (m: any) => spun.push(m));
  a.onMessage('npc:react', (m: any) => reactions.push(m));
  b.onMessage('chat', () => {});
  a.onMessage('chat', (m: any) => m.system && announcements.push(m.text));

  if (me(a).seatId) a.send('stand', {});
  await sleep(200);
  a.send('gacha:spin', { kind: 'cat' });
  await sleep(300);
  check('spinning from across the room is refused', errors.length === 1 && spun.length === 0, errors[0]);

  await walkTo(a, GACHA_MACHINE.x + 1.1, GACHA_MACHINE.z + 0.6);
  const before = npcs().size;
  a.send('gacha:spin', { kind: 'cat' });
  await sleep(300);
  check('spin announces the capsule to everyone first', spun.length === 1 && npcs().size === before, spun[0]?.label);
  a.send('gacha:spin', { kind: 'cat' });
  await sleep(300);
  check('a second spin right away hits the cooldown', errors.length === 2, errors[1]);
  await sleep(SPIN_REVEAL_MS + 300);
  const catId = spun[0]?.npcId;
  check('the NPC appears after the reveal, with a chat announcement', npcs().has(catId) && announcements.some((t) => t.includes('summoned')), announcements.at(-1));

  a.send('npc:update', { id: catId, name: '  Captain Fluff  ' });
  await sleep(300);
  check('anyone can rename an NPC', npcs().get(catId)?.name === 'Captain Fluff');

  const cat = npcs().get(catId);
  await walkTo(a, cat.x + 0.5, cat.z + 0.5);
  a.send('npc:pet', { id: catId });
  await sleep(400);
  check('petting a cat makes hearts', reactions.some((r) => r.npcId === catId && r.emote === '❤️'));

  // Study buddy: summon, wait for it to find a seat, then take that seat
  await sleep(SPIN_COOLDOWN_MS);
  await walkTo(a, GACHA_MACHINE.x + 1.1, GACHA_MACHINE.z + 0.6);
  a.send('gacha:spin', { kind: 'buddy' });
  await sleep(SPIN_REVEAL_MS + 400);
  const buddyId = spun.at(-1)?.npcId;
  let buddy: any;
  for (let i = 0; i < 40; i++) {
    buddy = npcs().get(buddyId);
    if (buddy?.seatId) break;
    await sleep(500);
  }
  check('a study buddy walks to a free seat and starts focusing', !!buddy?.seatId && buddy.status === 'focus' && buddy.focusSince > 0, buddy?.seatId);

  if (buddy?.seatId) {
    const seat = SEAT_BY_ID.get(buddy.seatId)!;
    const taken = buddy.seatId;
    await walkTo(a, seat.x - Math.sin(seat.yaw) * 0.6, seat.z - Math.cos(seat.yaw) * 0.6);
    a.send('sit', { seatId: taken });
    await sleep(600);
    check('the buddy gives its seat to a person', me(a).seatId === taken && npcs().get(buddyId)?.seatId !== taken);
    a.send('stand', {});
  }

  a.send('npc:remove', { id: catId });
  let gone = false;
  for (let i = 0; i < 40 && !gone; i++) {
    await sleep(500);
    gone = !npcs().has(catId);
  }
  check('saying goodbye walks the NPC back into the machine', gone);
}

// 8. State callbacks fire for joins
let added = 0;
Callbacks.get(b).onAdd('players', () => added++);
const late = await join('late');
await sleep(300);
check('players onAdd fires on join', added > 0);

await Promise.all([...rooms, late].map((r) => r.leave()));
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
