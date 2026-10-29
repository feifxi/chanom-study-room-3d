# Demo Chanom Study Room

A 3D online study room: walk around a cosy library as an anime chibi character, sit at a desk, and study alongside other people in real time.

> The earlier **Agent HQ** prototype (Three.js + Vite AI-agent office) lives on the `agent-hq` branch.

**Docs:** [Roadmap and next steps](docs/ROADMAP.md) · [Architecture](docs/ARCHITECTURE.md) · [Decision log](docs/DECISIONS.md) · [Observability and SRE guide](infra/observability/README.md)

## Stack

| Part      | Tech                                                                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web       | Next.js 16 (App Router), React Three Fiber + drei, Tailwind CSS v4                                                                                                   |
| Real-time | Colyseus 0.18 (rooms, delta state sync), `@colyseus/sdk`                                                                                                             |
| Shared    | `@study/shared`: room layout, avatar looks, protocol types, constants                                                                                                |
| Voice     | LiveKit (proximity voice, desk screen sharing)                                                                                                                       |
| Data      | `@study/db`: Drizzle ORM + PostgreSQL for study stats, visits and feedback                                                                                           |
| Ops       | Prometheus, Loki, Grafana Alloy, Alertmanager, Grafana (SLOs + burn-rate alerts, see `infra/observability/`); Terraform on AWS `ap-southeast-7` (`infra/terraform/`) |

```
apps/
  web/     Next.js client: lobby (/) and the 3D room (/room?id=…)
  game/    Colyseus server: StudyRoom, NPCs, HTTP API (rooms, stats, feedback, admin, metrics)
packages/
  shared/  Code used by both apps
  db/      Drizzle schema, migrations, stats and admin queries
docs/      Roadmap, architecture, decision log
infra/     Everything that runs the app (see infra/README.md)
  terraform/      AWS: bootstrap (DNS delegation set) and the playtest stack
  compose/        Production Docker Compose stack, Caddyfile, LiveKit config
  observability/  Prometheus, Alertmanager, Loki, Alloy, Grafana config and the SRE guide
  scripts/        infra:up / infra:down
compose.yaml      Local dev dependencies: Postgres, LiveKit, and the monitoring stack (profile)
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
pnpm --filter @study/game load 8 10     # ~8 API requests/s for 10 minutes (for the SLO panels)
pnpm obs:up                             # Grafana :3001, Prometheus :9090, Alertmanager :9093
```

Open http://localhost:3000 to play and http://localhost:3000/admin for analytics (dev password `chanom-dev`).

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
  index.ts              Server boot and HTTP routes (/rooms, /stats, /leaderboard, /health, /metrics)
  rooms/StudyRoom.ts    Colyseus room: message handlers, join/leave, focus tracking
  rooms/rules.ts        Pure game rules (speed limit, status, input sanitising), unit tested
  npc/NpcDirector.ts    Buddy Machine and NPC API used by the room
  npc/cat.ts, buddy.ts  NPC behaviour; npc/motion.ts walks them along A* paths
  admin/                Admin auth (signed cookie, lockout) and the /feedback + /admin/* routes
  metrics.ts, log.ts    Prometheus metrics (HTTP RED, sessions, NPC ticks), chaos switches, pino logger
apps/web/src/
  app/                  Next routes; the lobby and room render client-side only
  features/room/        3D scene, avatars, labels, local player (LocalPlayerDriver), connection (useStudyRoom + roomSession reducer)
  features/<feature>/   chat, focus, music, npc, voice, feedback, admin, stats, todo, avatar, lobby
  e2e/ (in apps/web)    Playwright tests
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
- Clients predict their own movement and send it at 15 Hz, each move numbered. The server echoes the last move it applied, and the client corrects only where the server disagreed with its prediction for that move, blending the fix in, so a slow connection doesn't pull you back. The speed limit is a budget that refills over time, so moves that arrive late in a burst still count.
- Other people are smoothed between 20 Hz state patches.

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

Run the monitoring stack with `pnpm obs:up` (Grafana on http://localhost:3001). **[infra/observability/README.md](infra/observability/README.md)** has the SLOs, chaos drills and runbooks.

## Music

A personal lo-fi player in the left rail (🎵): one track at a time with ‹ › to switch, play/pause and volume.
Only you hear it, it dips while anyone is talking on voice, it never starts on its own, and it
remembers your track and volume. Media keys work too. The tracks are royalty-free from Pixabay
(Alex Morgan) in `apps/web/public/music`; add more in `apps/web/src/features/music/tracks.ts`.
Only use tracks you have the rights to (Pixabay, other royalty-free libraries), never rips from
YouTube or Spotify.

## Controls

WASD / arrow keys to walk · Shift to run · E (or the hint button) to interact with whatever is closest (sit at a desk or on the sofa, pet a cat, open the Buddy Machine) · Enter to chat · drag to orbit, scroll or − / + to zoom. The sun / moon switch at the top right pins the room to day or night; the clock icon follows real time. The 🍃 leaf turns on battery saver (30 fps, no shadows, lower resolution); it also turns on by itself when a device can't keep up.

**Phones and tablets** (either way up): walk with the joystick at the bottom left. The button at the bottom right sits, stands, pets or opens the machine. Drag to turn the camera, pinch to zoom. On small screens the tools rail runs along the top (Pomodoro lives there), chat opens as a sheet, and phones start in battery saver. Screen sharing is hidden where the browser can't do it.

## Roadmap

Done so far: the multiplayer library, presence, focus, voice and screen share, stats, room NPCs,
a maintainability pass, the cosy UI, feedback and analytics, observability, the AWS playtest stack
with CI/CD, and the fixes from the first playtest (performance, rubber-banding, lo-fi music).
**Next: activities to do together**, the top request from friends. Phones and tablets are supported (try them on real devices next). Details in [docs/ROADMAP.md](docs/ROADMAP.md).
