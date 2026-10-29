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
pnpm e2e          # Playwright end-to-end tests (starts the dev servers if needed; Chrome, muted)
pnpm format       # apply Prettier
pnpm build        # production builds (Next standalone + tsup)
```

`pnpm e2e` drives the real app in a browser. The older `smoke` script tests the game server directly over WebSockets and needs `pnpm dev` (or at least the game server) running.

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

A small **Buddy Machine** stands against the left wall. Walk up and press **E** to summon a friend for the whole room. That's all it does; there's nothing to configure.

- **Summon** a 🐈 library cat or a 🧑‍🎓 study buddy. Everyone sees a capsule roll out, then the friend appears and chat announces it.
- **Goodbye**: anyone can send a friend home; it walks back into the machine.
- Cats wander, groom and nap on the sofa arms (more at night). Press **E** next to one to pet it: hearts, a purr, and it follows you for a while. A cat that's following you never blocks a seat, and it stops following when you sit down.
- Study buddies pick a random free desk, run a 25/5 pomodoro (shown on their name tag), cheer you when you finish a focus stretch, and give up their seat if you want it.
- Up to 5 study buddies and 4 cats per room; every new room starts with one cat, and friends go home when the room closes. NPC logic runs on the server (grid A* pathfinding in `@study/shared`), so everyone sees the same thing.

## Feedback and the admin page

- When someone leaves a room the first time, a small card asks how it was: five faces (1–5), optional tags (bug / idea / love it) and an optional comment. **Skip** leaves right away and the card comes back at most once a day; after sending it never asks again. The visit's context is attached automatically (time in the room, whether they used voice, screen size, browser).
- **`/admin`** is the product analytics page: feedback first (average score, 1–5 breakdown, tags, every comment with its context, CSV export, delete), then visitors (unique per day, visits, average visit, focus minutes) and who is online per room. Service health and performance are deliberately left to Grafana (see below).
- The admin password lives in **`ADMIN_PASSWORD`** on the game server, never in code. `pnpm dev` uses `chanom-dev` unless you set it. Signing in sets a signed, HttpOnly cookie for 7 days; 5 wrong passwords lock that address out for 10 minutes. Without `ADMIN_PASSWORD` the admin API is off.

### Two dashboards, two jobs

|          | `/admin` (in the app)                          | Grafana (Prometheus + Loki)                           |
| -------- | ---------------------------------------------- | ----------------------------------------------------- |
| Question | Do people like it? How do they use it?         | Is the service healthy? Why did it break?             |
| Data     | Feedback, ratings, visitors, visits (Postgres) | Metrics from `/metrics`, container logs, alerts       |
| Audience | Product (you, deciding what to build next)     | SRE practice: SLIs/SLOs, alerting, incident debugging |

## Controls

WASD / arrow keys to walk · Shift to run · E to interact with whatever is closest (sit at a desk or on the sofa, pet a cat, open the Buddy Machine) · Enter to chat · drag to orbit, scroll or − / + to zoom. The sun / moon switch at the top right pins the room to day or night; the clock icon follows real time.

## Roadmap

1. ✅ Monorepo, Colyseus rooms with auto-sharding, 3D library, real-time movement, sitting, text chat
2. ✅ Anonymous join, typing indicator and speech bubbles above heads
3. ✅ Personal pomodoro; focus status and minutes focused shown above heads
4. ✅ LiveKit proximity voice (with a speaking indicator above heads) and Zoom-style screen sharing visible only to your table
5. ✅ Study stats, streaks, leaderboard, to-do list, real-time day/night
6. ✅ Room NPCs from the Buddy Machine; join/leave lines in chat
7. ✅ Maintainability pass: unit tests, lint everywhere, Prettier, CI workflow (`.github/workflows/ci.yml`)
8. ✅ Connecta-style UI refresh, day / night switch, sofa seating, simpler Buddy Machine, Playwright tests
9. Terraform on AWS (EC2 + RDS + S3 in `ap-southeast-7`), deploys, Grafana stack and CloudWatch alarms
