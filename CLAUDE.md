# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A 3D multiplayer study room (cosy library, anime chibi avatars): walk around, sit at desks, chat,
proximity voice, desk screen share, personal pomodoro, room NPCs. pnpm + Turborepo monorepo,
TypeScript everywhere. Docs: `docs/ROADMAP.md` (status and next steps), `docs/ARCHITECTURE.md`,
`docs/DECISIONS.md` (decision log — add a row when making a notable choice), `infra/README.md`,
`infra/observability/README.md` (SLOs, chaos drills, runbooks).

## Commands

```bash
pnpm install
docker compose up -d                 # Postgres :5433 + LiveKit :7880 (start before dev)
pnpm dev                             # web :3000 + game server :2567
pnpm check                           # what CI runs: prettier --check, then typecheck + lint + unit tests everywhere
pnpm e2e                             # Playwright (starts dev servers if needed; Chrome, muted)
pnpm format                          # prettier --write
pnpm --filter @study/game smoke      # WebSocket checks against a running game server
pnpm --filter @study/game bots 5     # wandering test players
pnpm obs:up / obs:down               # local Prometheus/Grafana/Loki/Alertmanager (profile)
pnpm infra:up | infra:deploy | infra:down   # AWS playtest stack (the user runs these, not Claude)
```

Single tests:

```bash
cd apps/web && npx vitest run src/features/room/reconcile.test.ts
cd apps/web && npx playwright test e2e/touch.spec.ts          # or e2e/room.spec.ts:60 for one test
CI=1 npx playwright test                                       # reproduce CI: Playwright's Chromium, retries
cd apps/game && npx vitest run src/rooms/rules.test.ts
```

Lint is `--max-warnings 0`. Web typecheck runs `next typegen` first (route types like `LayoutProps`
don't exist in a fresh clone otherwise). Runtime env vars only reach `pnpm dev` if listed under
`passThroughEnv` in `turbo.json` — Turborepo 2 silently drops others.

## Architecture

- `apps/game` — Colyseus 0.18 server + express. `rooms/StudyRoom.ts` handles messages (zod-validated)
  and join/leave; pure, unit-tested rules live in `rooms/rules.ts`; NPCs (cats, study buddies) are
  simulated server-side in `npc/` with A* from shared. Rooms are in memory: a deploy disconnects
  everyone (accepted). HTTP routes: `/rooms`, `/stats`, `/leaderboard`, `/feedback`, `/admin/*`
  (behind `ADMIN_PASSWORD`), `/metrics`, `/health`. The transport is an explicit `WebSocketTransport`
  (needed for the tsup bundle). Postgres is optional: without `DATABASE_URL` rooms work, stats and
  feedback are off.
- `apps/web` — Next.js 16 (App Router, Turbopack), React Three Fiber 9, Tailwind v4. The lobby, room
  and admin render client-side only. `features/<feature>/` holds everything per feature;
  `features/room/` is the 3D scene, HUD (`hud/`), connection (`useStudyRoom` + `roomSession`
  reducer) and local player.
- `packages/shared` — consumed as TypeScript source (`exports: ./src/index.ts`, no build step):
  protocol types, room layout/seats/obstacles, collisions, A* navigation, constants such as
  `WALK_SPEED`/`RUN_SPEED`. Both apps import it; change layout or protocol here.
- `packages/db` — Drizzle schema, migrations (`pnpm db:generate`, `db:migrate`), stats/admin queries.

Key cross-file mechanics:

- **Server is authoritative; the client predicts its own movement.** `LocalPlayerDriver` (plain class,
  outside React) reads keys/joystick, moves in ≤0.05 s sub-steps (long frames still cover full
  distance), sends `move` at 15 Hz with a `seq`. The server applies it under a refilling speed budget
  (`refillMoveBudget`/`spendMove`) and echoes `moveSeq`; `reconcile.ts` corrects only where the server
  disagreed with the prediction for that seq. Before an action (E key / action button) the driver
  flushes its latest position so the server's reach check sees it — but never while seated (a move
  stands you up on the server).
- **Render loop:** `<Canvas frameloop="never">` driven by `FrameDriver`, which caps fps and calls R3F
  `advance()` with **seconds** (passing rAF milliseconds once made every animation 1000× fast).
  `StaticBatch` merges static furniture meshes (skips named, transparent, emissive meshes or
  `userData.dynamic`); `StaticShadows` redraws the shadow map only when the light changes; characters
  use `BlobShadow`. `quality.ts`: battery saver (30 fps, 1×, no shadows) turns on automatically on slow
  frames and by default on touch screens.
- **Phones:** `lib/screen.ts` (`useTouchScreen`, `useCompactScreen`, `canShareScreen`) switches the HUD
  to a compact layout (rail along the top with the Pomodoro inside, chat as a sheet, icon-only dock,
  joystick + action button, no zoom buttons). The joystick always walks (never runs).
- **Dev test handle:** in non-production builds the room exposes `window.__study` (`room`, `motion`,
  `scene`, `camera`, `gl`, `clock`, `lk`); e2e helpers (`e2e/helpers.ts`: `enterRoom`, `walkTo`, `me`)
  rely on it. `walkTo` moves through the client's predicted position, never by sending raw moves.
- **e2e** tests share one public room, so they run serially (`workers: 1`); feedback tests skip
  without a database. CI runners have no GPU (SwiftShader, ~5 fps), so timing-sensitive tests must
  not assume smooth frames.

## Infra and deploys

`infra/terraform/bootstrap` (Route 53 delegation set, GitHub OIDC deploy role) and
`infra/terraform/app` (EC2 t4g + Docker Compose behind Caddy, RDS Postgres 17, ECR, S3 bundle, SSM),
region `ap-southeast-7`, domain `studyroom.chanombude.me`. `.github/workflows/ci-cd.yml`: check →
e2e → deploy on `main` (skips when the stack is down). `infra/scripts/deploy.sh` reads
`/chanom/deploy/config` from SSM. Images are arm64; the web image copies `public/` (Next standalone
output omits it; the lo-fi MP3s live there).

## Working agreements

- UI text is English. Comments explain _why_. Match the surrounding style (Prettier, small modules).
- The user runs all provisioning (`terraform apply`, `infra:up/down/deploy`) themselves; suggest
  steps, only do read-only AWS checks.
- Stop only this project's processes (by PID/port or the task that started them); never pattern-kill.
- Headless Chrome/Playwright always runs with `--mute-audio` (already in `playwright.config.ts`).
- Next.js 16 differs from older versions: check `apps/web/node_modules/next/dist/docs/` before using
  unfamiliar Next APIs (see `apps/web/AGENTS.md`).
- `.npmrc` uses `node-linker=hoisted` on purpose: Colyseus packages peer-depend in a cycle and an
  isolated layout installs two `@colyseus/core` copies ("seat reservation expired" on every join).
- Music must be royalty-free (Pixabay); never rips from YouTube/Spotify.
