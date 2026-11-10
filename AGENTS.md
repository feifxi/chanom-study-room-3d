# AGENTS.md

Shared context for everyone working on this repo: developers and coding agents (Claude Code, Codex,
others). `CLAUDE.md` loads this file. Agents' own memories aren't shared, so **anything another
person or agent needs to know goes into the repo**: this file, the plan, the specs or the decision
log. Keep them current in the same change that makes them stale.

## What this repo is

Two things, at different stages:

- **Connecta (V2), being designed now.** Cosy 3D rooms where friend groups and communities hang out,
  study and play together ("Discord is a communication tool; this is a place"). Every page and 3D
  design is built first in **`demo/`**, a frontend-only Next.js prototype with mock data, then
  written up as a spec. Nothing is deployed.
- **Chanom Study Room (V1), finished** (tag `v1.0.0`). The working multiplayer app in `apps/` and
  `packages/`, with its AWS stack in `infra/`. It's the base the V2 backend will grow from, and is
  live only during playtests.

## Read first

1. [`docs/v2-plan.md`](docs/v2-plan.md): the overview: **status**, the concept, every feature in a
   line, **What's left**, and the port checklist.
2. [`docs/v2/decisions.md`](docs/v2/decisions.md): why things are the way they are, reversals, and
   ideas that were turned down. Check it before proposing something "new".
3. [`docs/v2/features/`](docs/v2/features/): one spec per feature, all in the same shape (status and
   try-it link, a summary, how it works, backend notes). Feature 12 is an undecided draft.
4. [`docs/v2/demo-guide.md`](docs/v2/demo-guide.md): how the demo is laid out, how maps work, its
   checks and gotchas.
5. `README.md`, `infra/README.md`, `infra/observability/README.md`: V1 features, AWS, CI/CD, SLOs.

## What's next

Feature 12 (card games and Werewolf), resuming from
[the draft](docs/v2/features/12-cards-and-werewolf-draft.md); then the port to `apps/web`. The
plan's [status and What's left](docs/v2-plan.md#whats-left) is the source of truth.

## Working agreements

**Process**

- **Feature by feature:** discuss a feature in detail with the owner before building (how it works,
  how it feels, panel or 3D), build it in `demo/` for approval, then write or update its spec and
  the plan. Don't build ahead of a decision.
- **Ask in plain text** with options and a recommendation. Don't use pop-up question dialogs.
- **Record decisions in the same change:** update the feature's spec, add a dated line to
  `docs/v2/decisions.md`, and update `docs/v2-plan.md` if the status or a one-line summary changed.
- **Each fact lives in one place:** specs hold the what, the decision log the why, the plan the
  overview. Link instead of copying.
- **Keep scope:** do what was asked; if you notice something else, mention it instead of doing it.
- **Commits:** only when asked. So far the owner has committed straight to `main` with no branches;
  as more people join, follow whatever branch and PR flow the team agrees. Never push unless asked.

**Product and design**

- **Attractive by default:** design pages like well-known products (Nitro, Spotify, Duolingo,
  Gather), not function-first. Check every UI change at phone and desktop width, light and dark, and
  as a guest (`demo:screens`).
- **Simple and uniform:** one flow for every activity, simple rules, no extra modes or settings
  unless asked. Mood first in all copy. UI text is English.
- **Inside a 3D room nothing navigates away silently:** only Leave leaves; links out confirm.
- **Generic names only:** never use other products' game or mode names (Gartic Phone, Telestrations,
  Uno) in the app.
- **Music is royalty-free** (Pixabay); never rips from YouTube or Spotify.

**Engineering**

- **Comments explain why.** Match the surrounding style (Prettier, small modules).
- **3D work runs `demo:perf`** and stays within the budget in
  [06-3d-room.md](docs/v2/features/06-3d-room.md#performance).
- **Don't carry the old "server" concept into new code.** Rooms are the top level now.
- **Next.js 16 differs from older versions:** read `node_modules/next/dist/docs/` before using an
  unfamiliar Next API (`apps/web/AGENTS.md`, `demo/AGENTS.md`).
- **`.npmrc` uses `node-linker=hoisted` on purpose:** Colyseus packages peer-depend in a cycle, and
  an isolated layout installs two `@colyseus/core` copies ("seat reservation expired" on every join).
- **Headless Chrome and Playwright always run with `--mute-audio`.**
- **Processes:** stop only this project's processes, by PID, port or the task that started them.
  Never pattern-kill.

**Infra and secrets**

- **Only the owner provisions:** `terraform apply` and `pnpm infra:up | infra:deploy | infra:down`.
  Agents suggest steps and run read-only AWS checks only.
- **Local development only** until the owner says to deploy V2.
- Never commit secrets (`.env` files are ignored; examples are `*.example`).

## Connecta demo (`demo/`)

```bash
pnpm --filter @study/demo demo:dev        # http://localhost:3100
pnpm --filter @study/demo demo:typecheck
pnpm --filter @study/demo demo:lint
pnpm --filter @study/demo demo:perf       # needs demo:dev running
pnpm --filter @study/demo demo:screens 390 dark guest
```

These aren't part of `pnpm check` or CI, so run them yourself. More in the
[demo guide](docs/v2/demo-guide.md).

## Chanom Study Room (V1: `apps/`, `packages/`, `infra/`)

A 3D multiplayer study room (cosy library, anime chibi avatars): walk around, sit at desks, chat,
proximity voice, desk screen share, personal pomodoro, room NPCs. pnpm + Turborepo monorepo,
TypeScript everywhere. **Status:** finished; the AWS stack is down unless a playtest is running.

### Commands

```bash
pnpm install
docker compose up -d                 # Postgres :5433 + LiveKit :7880 (start before dev)
pnpm dev                             # web :3000 + game server :2567 + API :2568
pnpm check                           # what CI runs: prettier --check, then typecheck + lint + unit tests everywhere
pnpm e2e                             # Playwright (starts dev servers if needed; Chrome, muted)
pnpm format                          # prettier --write
pnpm --filter @study/game smoke      # WebSocket checks against a running game server
pnpm --filter @study/game bots 5     # wandering test players
pnpm obs:up / obs:down               # local Prometheus/Grafana/Loki/Alertmanager (profile)
pnpm infra:up | infra:deploy | infra:down   # AWS playtest stack (the owner runs these, never an agent)
```

Single tests:

```bash
cd apps/web && npx vitest run src/features/room/reconcile.test.ts
cd apps/web && npx playwright test e2e/touch.spec.ts          # or e2e/room.spec.ts:60 for one test
CI=1 npx playwright test                                       # reproduce CI: Playwright's Chromium, retries
cd apps/game && npx vitest run src/rooms/rules.test.ts
cd apps/api && npx vitest run src/app.test.ts
```

Lint is `--max-warnings 0`. Web typecheck runs `next typegen` first (route types like `LayoutProps`
don't exist in a fresh clone otherwise). Runtime env vars only reach `pnpm dev` if listed under
`passThroughEnv` in `turbo.json` — Turborepo 2 silently drops others.

### Architecture

- `apps/game` — Colyseus 0.18 server + express. `rooms/StudyRoom.ts` handles messages (zod-validated)
  and join/leave; pure, unit-tested rules live in `rooms/rules.ts`; NPCs (cats, study buddies) are
  simulated server-side in `npc/` with A* from shared. Rooms are in memory: a deploy disconnects
  everyone (accepted). HTTP routes: `/rooms`, `/metrics`, `/health`, and `/internal/live` (admin
  live data for the API; Caddy hides it). The transport is an explicit `WebSocketTransport` (needed
  for the tsup bundle). It writes visits and focus sessions but doesn't run migrations.
- `apps/api` — Hono REST API on :2568, same-origin under `/api` (Caddy in production, a Next
  `rewrites()` in dev): `/api/stats/:visitorId`, `/api/leaderboard`, `/api/feedback`, `/api/admin/*`
  (behind `ADMIN_PASSWORD`, signed HttpOnly cookie on `Path=/api`), `/api/health`; `/metrics` outside
  `/api`. `createApp(deps)` takes the db, auth and the live-data fetcher, so tests use
  `app.request()` with fakes. It owns the schema (runs the migrations; the prod game container waits
  for it). Exports `AppType`; the web app's typed client is `lib/api.ts` (`hc<AppType>('/api')`).
  The admin overview's 401 comes from middleware, which the client types don't include. Postgres is
  optional: without `DATABASE_URL` rooms work, stats and feedback answer 503.
- `apps/web` — Next.js 16 (App Router, Turbopack), React Three Fiber 9, Tailwind v4. The lobby, room
  and admin render client-side only. `features/<feature>/` holds everything per feature;
  `features/room/` is the 3D scene, HUD (`hud/`), connection (`useStudyRoom` + `roomSession`
  reducer) and local player.
- `packages/shared` — consumed as TypeScript source (`exports: ./src/index.ts`, no build step):
  protocol types, room layout/seats/obstacles, collisions, A* navigation, constants such as
  `WALK_SPEED`/`RUN_SPEED`. Every app imports it; change layout or protocol here.
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
  without a database. CI runners have no GPU (SwiftShader, 2–5 fps and slower on busy runners), so
  timing-sensitive tests must not assume smooth frames. To reproduce a CI-only failure: `CI=1`, and
  slow only the frames with `page.addInitScript` replacing `requestAnimationFrame` with a 500 ms
  `setTimeout` (CPU throttling also slows the test's timers, so it doesn't reproduce it). There is
  no `gh` CLI here; CI artifacts can't be downloaded, so make failing assertions print state
  (`roomSnapshot` in `e2e/helpers.ts`).

### Infra and deploys

`infra/terraform/bootstrap` (Route 53 delegation set, GitHub OIDC deploy role) and
`infra/terraform/app` (EC2 t4g + Docker Compose behind Caddy, RDS Postgres 17, ECR, S3 bundle, SSM),
region `ap-southeast-7`, domain `studyroom.chanombude.me`. `.github/workflows/ci-cd.yml`: check →
e2e → deploy on `main` (skips when the stack is down). `infra/scripts/deploy.sh` reads
`/chanom/deploy/config` from SSM. Images are arm64; the web image copies `public/` (Next standalone
output omits it; the lo-fi MP3s live there).
