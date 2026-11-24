# 6. The 3D room

Walking around a room together: click to walk, stereo proximity voice for crowds, private zones,
bubbles, away, and an announcement tool for owners and mods. The HUD is in
[1](01-app-shell.md); the maps in [7](07-maps.md).

## Moving

- WASD or arrows, Shift to run, a joystick on phones. Sit at desks and sofas with E or a tap.
- **Click to walk** (on by default): click the floor and you walk there around furniture (A\*).
  Keys take over at once; a drag turns the camera; a click that closes a panel doesn't walk.
- Movement is server-authoritative with client prediction and reconciliation.

## Voice

- Full volume within **2.5 m**, silent at **9 m**, in **stereo**.
- At most the **12 nearest** voices are streamed (a phone can't take 100).
- Deafen turns the mic off too. Guests listen only, unless the room lets them talk.
- **Mute for me** (remembered per browser) and **Mute for everyone** (mods; lasts until lifted or
  the room empties, survives rejoining).
- **Screen share:** seated at a desk, to your table (one share per table); or on the TV
  ([10](10-watch-and-photo.md)). With sound, heard only by that audience. No cameras, ever.

## Private zones

Rugs built into each map (at least 2): inside, you hear only people in the zone at full volume, and
bubbles stay inside. No locks: anyone can walk in. A "🔇 Private zone" tag floats over the rug.
**Enforced by LiveKit, not hidden:** each speaker's client tells LiveKit who may receive its voice,
so a tampered client outside can't listen in.

## Bubbles, Away, Talk to everyone

- **Bubbles:** up to 120 characters, ~6 s over your head, then in the Bubbles tab. They reach the
  whole room, except from inside a private zone. One every 0.4 s.
- **Away** after 10 minutes without input: 💤, and the mic turns off. **Focusing is never away.**
- **Talk to everyone** (owners and mods, under 🛡️ Room): everyone hears you at full volume,
  zones included; "On air" with a pulsing button.

## Leaving

- **Leave** on the Room card is the only one-click way out. Links out and the browser's Back ask
  "Leave {room}?" with Stay as the default (`LeaveRoomLink`, `useLeaveRoom().ask(href)`).
- **One of you per room** (the newest tab wins) and **one room at a time per account** (walking
  into another room takes you out of this one).
- Can't walk in or sent out: a card says why, mood first, with the one next step (full: Notify
  me; removed; banned; in another tab: Walk in here; the room is gone; can't connect: Try again).

## Cats, study buddies and the Buddy Machine

- Every map starts with two **resident cats** (Mochi napping, Tofu by the door). Pet one (E):
  hearts, and it follows you for 20 s.
- **The Buddy Machine** (E): summon a cat or a **study buddy** (sits at a free desk and runs 25/5),
  or say Goodbye to one. Anyone can do either, guests too. Up to 4 cats and 5 buddies, 9 in all.
  **Pets** bought in the Shop come out of it too, and only their owner sends them home
  ([15](15-plus-coins-shop.md)).
- You walk through cats and buddies, so they never block a doorway.

## What resets

When the last person leaves: bubbles, seats, drawings, games, the TV, summoned cats and buddies.
The room, its settings, members and Room chat stay.

## Performance

Checked while building. Budget per frame (`apps/web/src/features/room3d/perf.ts`):

| Per frame  | Map's share | Each person             |
| ---------- | ----------- | ----------------------- |
| Draw calls | 130         | 6                       |
| Triangles  | 150k        | 20k (battery saver ~4k) |
| Textures   | 32          | 1                       |
| Our JS     | 8 ms total  |                         |
| Shaders    | 40 total    |                         |

- Characters and cats are merged into skinned meshes (~4 meshes each); furniture into a few static
  batches.
- **Battery saver:** half-detail characters, no shadows, 60 fps while you're active and 30 while
  you're still. On by default on touch screens; a slow device steps down quietly.
- **Check:** `pnpm --filter @connecta/web perf` loads every map zoomed out with 3, 52 and 102
  people and fails over budget; the crowd runs add a full Buddy Machine (4 cats, 5 buddies, 4
  pets). Overlay: `?perf` or Test tools.
- **Clocks:** countdowns and timers read the game server's clock (the room asks it on joining,
  `lib/serverClock.ts`), so a computer clock that's off doesn't show them off.

## In the code

- **Game server** `apps/game` (Colyseus 0.18, `/game`): one Colyseus room per Connecta room,
  matched by the `place` option. It never reads the database: it trusts a one-minute **join
  ticket** the API signs (`POST /api/rooms/:id/ticket`, HS256 with `GAME_SECRET`: account, role,
  look, capacity, map). Room changes (kick, ban, role, map, delete) arrive through Redis
  (`game:rooms`); it reports who's inside through Redis for the gateway to write.
- Capacity, seats, bubbles (`say`), Away (`status`), Talk to everyone (`stage`), looks, shares and
  voice passes (10-minute LiveKit tokens with publish permission decided live) are all checked there.
- Cats and buddies: `apps/game/src/npc/` (in memory only).
- Maps' data (seats, walls, zones, door): `packages/shared/src/maps`, read by both sides.
- Web: `apps/web/src/features/room/` (HUD), `room3d/` (scene), `voice/useVoice.ts`.
- Browser tests use `window.__connecta` (dev only) and Chrome's fake mic, always with `--mute-audio`.

## Not built yet

- Baked lighting with the Blender maps; full detail only for the ~30 nearest people.
- A test on a mid-range Android phone before launch; the perf check in CI.
