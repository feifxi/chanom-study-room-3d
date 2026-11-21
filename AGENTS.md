# AGENTS.md

Shared context for everyone working on this repo: developers and coding agents (Claude Code, Codex,
others). `CLAUDE.md` loads this file. Agents' own memories aren't shared, so **anything another
person or agent needs to know goes into the repo**: this file, the plan, the specs or the decision
log. Keep them current in the same change that makes them stale.

## What this repo is

**Connecta**: cosy 3D rooms where friend groups and communities hang out, study and play together
("Discord is a communication tool; this is a place").

- **`demo/`**, the design sandbox: a frontend-only Next.js prototype with mock data. Every page and
  3D design is built and approved here first, then written up as a spec. All features are built.
- **`apps/` and `packages/`**, the real app, being built fresh (started 2026-11-21). `apps/web`
  began as a copy of the demo; its mock data is replaced by real calls one feature at a time.
- **V1 (Chanom Study Room)** is finished and no longer on `main`: it lives at tag `v1.0.0`. Look
  something up there with `git show v1.0.0:<path>`, and copy a proven piece over on purpose, never
  its structure (the [decision log](docs/v2/decisions.md#engineering-and-infra) lists what's worth
  lifting).

## Read first

1. [`docs/v2-plan.md`](docs/v2-plan.md): the overview: **status**, the concept, every feature in a
   line, **What's left** (the build steps), and the port checklist.
2. [`docs/v2/decisions.md`](docs/v2/decisions.md): why things are the way they are, reversals, and
   ideas that were turned down. Check it before proposing something "new".
3. [`docs/v2/features/`](docs/v2/features/): one spec per feature, all in the same shape (status and
   try-it link, a summary, how it works, backend notes).
4. [`docs/v2/demo-guide.md`](docs/v2/demo-guide.md): how the demo is laid out, how maps work, its
   checks and gotchas. It applies to `apps/web` too until each part is ported.

## What's next

Build step 2 of the plan, **the core**: accounts (Google, Discord, email code, guests), rooms,
members and roles, invites, with the web app's screens moved onto the real API. The plan's
[What's left](docs/v2-plan.md#whats-left) is the source of truth.

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
  as a guest (the `screens` scripts).
- **Simple and uniform:** one flow for every activity, simple rules, no extra modes or settings
  unless asked. Mood first in all copy. UI text is English.
- **Inside a 3D room nothing navigates away silently:** only Leave leaves; links out confirm.
- **Generic names only:** never use other products' game or mode names (Gartic Phone, Telestrations,
  Uno) in the app.
- **Music is royalty-free** (Pixabay); never rips from YouTube or Spotify.

**Engineering**

- **Comments explain why.** Match the surrounding style (Prettier, small modules).
- **Rooms are the top level.** Don't carry the demo's old "server" names into new code; the
  [port checklist](docs/v2-plan.md#port-checklist) lists them.
- **3D work runs the perf check** and stays within the budget in
  [06-3d-room.md](docs/v2/features/06-3d-room.md#performance).
- **Next.js 16 differs from older versions:** read `node_modules/next/dist/docs/` before using an
  unfamiliar Next API (`apps/web/AGENTS.md`, `demo/AGENTS.md`).
- **NestJS 12 is ESM-only and newer than most training data:** relative imports end in `.js`,
  validation uses Zod schemas through `StandardSchemaValidationPipe` (`@Body({ schema })`, no
  class-validator), and Swagger reads the same schemas. Check Nest's first-party packages before
  adding a library (the index is at https://docs.nestjs.com/llms.txt).
- **Prisma 7:** the client is generated into `apps/api/src/generated/` (git-ignored; turbo runs
  `generate` before dev, typecheck, lint, test and build). Every schema change is a migration
  (`pnpm db:migrate`).
- **Tests:** Vitest everywhere. API tests compile through SWC (Nest needs decorator metadata) and
  boot the real module with fakes for outside services (`apps/api/src/health/*.spec.ts`).
- **`.npmrc` uses `node-linker=hoisted` on purpose:** Colyseus packages peer-depend in a cycle, and
  an isolated layout installs two `@colyseus/core` copies ("seat reservation expired" on every join).
- **Headless Chrome and Playwright always run with `--mute-audio`.**
- **Processes:** stop only this project's processes, by PID, port or the task that started them.
  Never pattern-kill.

**Infra and secrets**

- **Local development only** until the owner says to deploy. The cloud is being reconsidered (Azure
  instead of AWS); it's discussed when the build reaches the infra step, so don't add cloud-specific
  code before then.
- **Only the owner provisions** cloud resources. Agents suggest steps and run read-only checks only.
- Never commit secrets (`.env` files are ignored; examples are `.env.example`).

## Commands

Node 24 (`.nvmrc`) and pnpm 9 (`packageManager`, via corepack).

```bash
pnpm install
docker compose up -d                 # Postgres :5433, Redis :6379, LiveKit :7880
cp apps/api/.env.example apps/api/.env
pnpm dev                             # web :3000, API :4000 (Swagger UI at /api/docs)
pnpm check                           # what CI runs: prettier --check, then typecheck + lint + tests
pnpm build
pnpm format                          # prettier --write
pnpm db:migrate                      # create and apply a migration after a schema change
pnpm db:studio                       # browse the local database
pnpm --filter @connecta/web screens 390 dark guest   # screenshots; needs the web app running
pnpm --filter @connecta/web perf                     # 3D budget check; needs the web app running
```

Single tests: `cd apps/api && npx vitest run src/health`, `cd packages/shared && npx vitest run
src/navigation.test.ts`.

The demo has its own scripts, which turbo and CI skip:

```bash
pnpm --filter @connecta/demo demo:dev        # http://localhost:3100
pnpm --filter @connecta/demo demo:typecheck
pnpm --filter @connecta/demo demo:lint
pnpm --filter @connecta/demo demo:perf       # needs demo:dev running
pnpm --filter @connecta/demo demo:screens 390 dark guest
```

## Layout

```
apps/
  web/       Next.js 16, React Three Fiber, Tailwind v4. Started as a copy of demo/
  api/       NestJS 12: REST + OpenAPI, sign-in, jobs; a second entry point will run the
             WebSocket gateway (chat, DMs, presence). Owns the database: Prisma schema + migrations
  game/      (build step 4) Colyseus rooms: movement, seats, NPCs, activities
packages/
  shared/    Consumed as TypeScript source: avatars, map world types, movement rules, collisions,
             A* navigation, NPC types. Used by the web app, the demo and (later) the game server
demo/        The design sandbox (mock data only)
docs/        The plan, the decision log, the specs
```

- **API conventions:** one Nest module per feature (`src/<feature>/`: module, controller, service,
  schemas, `*.spec.ts` beside the code). Config is validated with Zod at startup
  (`src/config/env.ts`); add every new variable there and to `.env.example`. `src/setup.ts` holds
  what `main.ts` applies (the `/api` prefix, CORS, validation, logging), so tests boot the app the
  same way. Logs are pino (JSON in production, pretty locally).
- **Web conventions:** `features/<feature>/` holds everything per feature. Mock data in `lib/mock.ts`
  is the API boundary: each mock function becomes an API call as its feature is ported.
- CI (`.github/workflows/ci.yml`) runs `pnpm check` and `pnpm build`. There's no deploy yet.
