# Demo Chanom Study Room

A 3D online study room: walk around a cosy library as an anime chibi character, sit at a desk, and study alongside other people in real time.

> The earlier **Agent HQ** prototype (Three.js + Vite AI-agent office) lives on the `agent-hq` branch.

## Stack

| Part      | Tech                                                                                   |
| --------- | -------------------------------------------------------------------------------------- |
| Web       | Next.js 16 (App Router), React Three Fiber + drei, Tailwind CSS v4                     |
| Real-time | Colyseus 0.18 (rooms, delta state sync), `@colyseus/sdk`                               |
| Shared    | `@study/shared`: room layout, avatar looks, protocol types, constants                  |
| Voice     | LiveKit (proximity voice, desk screen sharing)                                         |
| Data      | `@study/db`: Drizzle ORM + PostgreSQL for anonymous study stats                        |
| Infra     | Docker, Terraform on AWS `ap-southeast-7`, Grafana/Prometheus/Loki + CloudWatch alarms |

```
apps/
  web/     Next.js client: lobby (/) and the 3D room (/room?id=…)
  game/    Colyseus server: StudyRoom, lobby endpoint, smoke test and bots
packages/
  shared/  Code used by both apps
  db/      Drizzle schema, migrations and stats queries
```

## Run it locally

Requirements: Node 24 (see `.nvmrc`), pnpm (`corepack enable pnpm`), Docker.

```bash
pnpm install
pnpm dev                 # web on http://localhost:3000, game server on :2567
```

Useful extras:

```bash
docker compose up -d                    # Postgres (:5433) and LiveKit (:7880): start these first
pnpm --filter @study/game smoke         # end-to-end checks against a running game server
pnpm --filter @study/game stats-check   # study-stats queries against Postgres
pnpm --filter @study/game bots 5        # five wandering test students
```

## Development

```bash
pnpm check        # what CI runs: Prettier check, then typecheck, lint and unit tests in every package
pnpm test         # unit tests only (Vitest)
pnpm format       # apply Prettier
pnpm build        # production builds (Next standalone + tsup)
```

The `smoke` script above is the end-to-end test: it needs `pnpm dev` (or at least the game server) running.

### Where things live

```
apps/game/src/
  index.ts              HTTP routes (/rooms, /stats, /leaderboard, /metrics) and server boot
  rooms/StudyRoom.ts    Colyseus room: message handlers, join/leave, focus tracking
  rooms/rules.ts        Pure game rules (speed limit, status, input sanitising), unit tested
  npc/NpcDirector.ts    Buddy Machine and NPC API used by the room
  npc/cat.ts, buddy.ts  NPC behaviour; npc/motion.ts walks them along A* paths
apps/web/src/
  app/                  Next routes; the lobby and room render client-side only
  features/room/        3D scene, avatars, labels, local player (LocalPlayerDriver), connection (useStudyRoom + roomSession reducer)
  features/<feature>/   chat, focus, npc, voice, stats, todo, avatar, lobby
  lib/                  profile (localStorage), config, time helpers
packages/shared/src/    Protocol types, room layout, navigation (A*), collisions, NPC data: used by both apps
packages/db/            Drizzle schema, migrations, stats queries
```

### Conventions

- **The server decides.** Positions, seats, timers and NPCs are validated or simulated on the server. Clients predict their own movement and render.
- **Shared first.** Anything both sides need (layout, constants, message shapes, pathfinding) goes in `@study/shared`, so they can't drift apart.
- **Pure logic is separate and tested.** Rules, reducers and pathfinding are plain functions with `*.test.ts` next to them. React components and Colyseus handlers stay thin.
- **Per-frame work stays out of React.** Things that change every frame (movement, label positions) live in plain classes driven by `useFrame`. React state is for what the UI shows.
- **Renders stay pure.** Read time with `useNow()` rather than `Date.now()`, and derive state instead of syncing it in effects. ESLint (React Compiler rules) enforces this.
- UI text is English. Comments explain _why_.

## How rooms work

- Joining is anonymous: pick a nickname and an outfit (kept in localStorage) and walk in. There are no accounts in this demo.
- Every room is public. `joinOrCreate` puts you in the first room with space; when a room reaches 20 people it locks and the next visitor gets a fresh one ("Library #2", …).
- The server is authoritative: it caps movement speed, keeps everyone inside the room, and checks seats (in reach, not taken) before letting anyone sit.
- Clients predict their own movement and send it at 15 Hz; other people are smoothed between 20 Hz state patches.

## Who's talking?

Everything a person says shows above their head:

- **• • •** while they have unsent text in the chat box (synced through the room state; it clears when they send, empty the box, or go quiet for 6 s)
- a speech bubble with their message for a few seconds after they send it
- a mic indicator while they speak

## Room friends (NPCs)

A pastel gachapon **Buddy Machine** stands near the entrance. Walk up and press **E**:

- **Summon** a 🐈 library cat or a 🧑‍🎓 study buddy. Everyone sees the capsule roll out and pop open; cats roll a random coat (5% chance of a ✨ golden one).
- **Residents**: anyone can rename a friend, change its habits (cat: roam / stay in the nook; buddy: subject, 25/5 or 50/10, chatty / quiet) or say goodbye.
- Cats wander, groom and nap on the sofa (more at night). Press **E** next to one to pet it: hearts, a purr, and it follows you for a bit.
- Study buddies take a free seat, run their own pomodoro (shown on their name tag), cheer you when you finish a focus stretch, and give up their seat if you want it.
- Up to 6 friends per room; every new room starts with one cat, and friends go home when the room closes. NPC logic runs on the server (grid A* pathfinding in `@study/shared`), so everyone sees the same thing.

## Controls

WASD / arrow keys to walk · Shift to run · E to interact (sit/stand, pet a cat, talk to a buddy, open the Buddy Machine) · Enter to chat · drag to orbit, scroll to zoom.

## Roadmap

1. ✅ Monorepo, Colyseus rooms with auto-sharding, 3D library, real-time movement, sitting, text chat
2. ✅ Anonymous join, typing indicator and speech bubbles above heads
3. ✅ Personal pomodoro; focus status and minutes focused shown above heads
4. ✅ LiveKit proximity voice (with a speaking indicator above heads) and Zoom-style screen sharing visible only to your table
5. ✅ Study stats, streaks, leaderboard, to-do list, real-time day/night
6. ✅ Room NPCs from the Buddy Machine; join/leave lines in chat
7. ✅ Maintainability pass: unit tests, lint everywhere, Prettier, CI workflow (`.github/workflows/ci.yml`)
8. Terraform on AWS (EC2 + RDS + S3 in `ap-southeast-7`), deploys, Grafana stack and CloudWatch alarms
