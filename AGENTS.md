# AGENTS.md

Shared context for everyone working on this repo: developers and coding agents (Claude Code, Codex,
others). `CLAUDE.md` loads this file. Agents' own memories aren't shared, so **anything another
person or agent needs goes into the repo docs**, kept current in the same change that makes them
stale.

## What this repo is

**Connecta**: cosy 3D rooms where friend groups and communities hang out, study and play together
("Discord is a communication tool; this is a place").

## Read first

Start at [`docs/README.md`](docs/README.md). In short:

1. [`docs/roadmap.md`](docs/roadmap.md): where things stand and what's next.
2. [`docs/features/`](docs/features/README.md): what each feature does and where its code lives.
3. [`docs/decisions.md`](docs/decisions.md): why. Check it before proposing something "new".
4. [`docs/dev-guide.md`](docs/dev-guide.md): UI checks, maps, gotchas.
5. [`docs/manual-tests.md`](docs/manual-tests.md) and [`docs/open-issues.md`](docs/open-issues.md).

## What's next

Every feature is built except the map editor (it waits for the Blender work, starting with the
Library, the one main map). Next: the owner's hand tests, then infra on AWS when the owner says
deploy. [The roadmap](docs/roadmap.md) is the source of truth.

## Working agreements

**Process**

- **Feature by feature:** discuss a feature with the owner first (how it works, how it feels,
  panel or 3D), then build it and show screenshots (`screens`) for approval. Don't build ahead of
  a decision.
- **Ask in plain text** with options and a recommendation. Don't use pop-up question dialogs.
- **In the same change:** update the feature's spec; add a dated line to `docs/decisions.md` for
  any decision; add hand-test checks to `docs/manual-tests.md` (tell the owner which); add anything
  noticed but not fixed to `docs/open-issues.md`; update `docs/roadmap.md` if the status changed.
- **Each fact lives in one place:** specs hold the what, the decision log the why, the roadmap the
  status. Link instead of copying. Keep docs short.
- **One seed for the whole app** (`apps/api/prisma/seed/`, one file per area): a feature that adds
  data adds it to the seed, and the rerun clears it (`reset.ts`).
- **Keep scope:** do what was asked; mention anything else instead of doing it.
- **Commits:** only when asked, straight to `main` so far. Never push unless asked.

**Product and design**

- **Attractive by default:** design pages like well-known products (Nitro, Spotify, Duolingo,
  Gather). Check every UI change at phone and desktop width, light and dark, and as a guest.
- **Real app only:** no demo, mock or scripted data, and no fake actions: every button calls the
  real thing or isn't shown (never a success toast standing in for it). Unbuilt work goes in the
  specs or `docs/open-issues.md`, not in placeholder code. The Test tools (development only) are
  the one exception.
- **Simple and uniform:** one flow for every activity, no extra modes or settings unless asked.
  Mood first in all copy. UI text is English.
- **Inside a 3D room nothing navigates away silently:** only Leave leaves; links out confirm.
- **Generic names only:** never other products' game or mode names (Gartic Phone, Uno…).
- **Music is royalty-free** (Pixabay).

**Engineering**

- **Comments explain why.** Match the surrounding style (Prettier, small modules).
- **Rooms are the top level.** Don't use "server" or "channel" for rooms in new code.
- **3D work runs the perf check** and stays within the budget in
  [06-3d-room.md](docs/features/06-3d-room.md#performance).
- **Next.js 16 differs from older versions:** read `node_modules/next/dist/docs/` before using an
  unfamiliar Next API (`apps/web/AGENTS.md`).
- **NestJS 12 is ESM-only and newer than most training data:** relative imports end in `.js`,
  validation uses Zod schemas through `StandardSchemaValidationPipe` (`@Body({ schema })`, no
  class-validator), and Swagger reads the same schemas. Check Nest's first-party packages before
  adding a library (https://docs.nestjs.com/llms.txt).
- **Prisma 7:** the client is generated into `apps/api/src/generated/` (git-ignored; turbo runs
  `generate` first). Every schema change is a migration (`pnpm db:migrate`).
- **Tests:** Vitest everywhere. API tests compile through SWC and boot the whole app
  (`apps/api/test/test-app.ts`) and the gateway against a real `connecta_test` database and Redis,
  faking only email. So `pnpm check` needs `docker compose up -d`.
- **Sign-in is Better Auth** (`apps/api/src/auth/auth.ts`) under `/api/auth/*`. A global guard
  protects every route: mark public ones `@AllowAnonymous()` or `@OptionalAuth()`, read the user
  with `@Session()`. Connecta's own user fields (`handle`, `birthday`, `look`) are written only by
  the accounts module.
- **The web app calls the API through the generated client** (`apps/web/src/lib/api/client.ts`)
  with relative paths and TanStack Query. After changing an endpoint run `pnpm api:client` and
  commit `apps/api/openapi.json` and `apps/web/src/lib/api/schema.d.ts` (CI fails if stale).
- **`.npmrc` uses `node-linker=hoisted` on purpose** (Colyseus would otherwise install two
  `@colyseus/core` copies: "seat reservation expired" on every join).
- **Headless Chrome and Playwright always run with `--mute-audio`.**
- **Processes:** stop only this project's processes, by PID, port or the task that started them.
  Never pattern-kill.

**Infra and secrets**

- **Local development only** until the owner says deploy ([infra.md](docs/infra.md)). Code talks
  to AWS only through the AWS SDK with `AWS_ENDPOINT_URL`; email goes through the API's mail module.
- **Only the owner provisions** cloud resources. Agents suggest steps and run read-only checks.
- Never commit secrets (`.env` files are ignored; examples are `.env.example`).

## Commands

Node 24 (`.nvmrc`) and pnpm 9 (`packageManager`, via corepack).

```bash
pnpm install
docker compose up -d                 # Postgres :5433, Redis :6379, LiveKit :7880, Mailpit :8025,
                                     # AWS Emulator :9297 (the first run builds its image)
cp apps/api/.env.example apps/api/.env
cp apps/game/.env.example apps/game/.env   # same GAME_SECRET as the API's
pnpm --filter @connecta/shared build && pnpm --filter @connecta/api generate   # a fresh clone
pnpm db:migrate && pnpm db:seed
pnpm dev                             # web :3000, API :4000 (Swagger at /api/docs), gateway :4001,
                                     # game server :4002 (the web app proxies /api, /live, /game)
pnpm check                           # what CI runs: prettier --check, typecheck, lint, tests
pnpm build
pnpm format                          # prettier --write
pnpm db:reset                        # drop the local database, migrate, seed
pnpm db:studio                       # browse the local database
pnpm --filter @connecta/api team <handle> [off]   # put someone on the Connecta team
pnpm api:client                      # after an API change: OpenAPI document → web types
pnpm --filter @connecta/web screens 390 dark guest   # screenshots; needs the web app running
pnpm --filter @connecta/web perf                     # 3D budget check; needs the web app running
```

Signing in locally: use the email code from Mailpit (http://localhost:8025). Seed people sign in
as `<handle>@connecta.test` (`fei@connecta.test` is on the Connecta team). Google and Discord need
their keys in `apps/api/.env`.

Single tests: `cd apps/api && npx vitest run src/accounts`, `cd packages/shared && npx vitest run
src/navigation.test.ts`, `cd apps/game && npx vitest run` (boots the game server on :4092).

## Layout

```
apps/
  web/       Next.js 16, React Three Fiber, Tailwind v4
  api/       NestJS 12: REST + OpenAPI, sign-in, jobs, and a second entry point, the live
             gateway (src/gateway.ts: Socket.IO at /live). Owns the database (Prisma)
  game/      Colyseus 0.18: one game room per Connecta room; trusts only the API's signed join
             ticket, talks to the API and gateway through Redis
packages/
  shared/    Built to dist/: account rules, avatars, maps' data, the game protocol, movement,
             collisions, A* navigation, NPC types. Used by web, api and game
docker/      Images for local services (the AWS Emulator)
docs/        Roadmap, feature specs, decisions, guides
```

- **Live events:** a REST write others should see live calls `LiveService` (`toRoom`, `toUser`);
  the gateway delivers it through Redis. A write people inside a 3D room should feel (kick, ban,
  leave, role, map, delete) also calls `GameService.roomEvent`. The game server reports who's in
  which room through Redis; the gateway is presence's only writer.
- **Background jobs:** BullMQ on Redis, workers in the API process. Timed jobs stay `@Cron`.
- **Files:** browsers move bytes through presigned links from `StorageService`; locally through
  `/api/dev-storage` (the AWS Emulator refuses browsers). Tests use `MemoryStorage`.
- **API conventions:** one Nest module per feature (`src/<feature>/`: module, controller, service,
  schemas, `*.spec.ts` beside the code). Config is validated with Zod at startup
  (`src/config/env.ts`); add every new variable there and to `.env.example`. `src/setup.ts` holds
  what `main.ts` applies, so tests boot the app the same way.
- **Web conventions:** `features/<feature>/` holds everything per feature. Server components read
  the API with the request's cookies (`getMe`, `getRoom`). There is no mock data: every room runs on
  the game server (the Test tools' pretend crowd is the one stand-in, development only).
- CI (`.github/workflows/ci.yml`) runs `pnpm check` and `pnpm build`. No deploy yet.
