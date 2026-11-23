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
5. [`docs/v2/manual-tests.md`](docs/v2/manual-tests.md): the owner's hand-test list, run at the end.
6. [`docs/v2/review-notes.md`](docs/v2/review-notes.md): for the owner's final review: per build
   part, what changed, bugs found and fixed while building, and what was noticed but not fixed.

## What's next

Step 5 of the plan, **the rest, a feature at a time**, in the agreed order: focus, the activity
framework with Watch together and photo mode, party and table games, coins and quests, Plus,
moderation with Common and open rooms, the admin site and map editor. Agree each feature's details
with the owner before building. **Focus** is done (the timer on the game server, the to-do list,
the Focus page and rankings). **Watch together and photo mode** are done. **Party and table games**
are done (the round flow, chess, Slave, the whiteboard, Pick a Side and Draw & Guess on the game
server). **Coins and quests** are in progress: quests, coins and the Shop's first set are real; next is
pets (agree the details with the owner first).
Steps 1–4 are done: the skeleton; accounts and rooms; the gateway
(friends, chat, pictures, DMs, presence and the 🔔 inbox); walking in a room (the Colyseus game
server `apps/game` with movement, capacity and live room changes, bubbles, Away, the people list,
LiveKit proximity voice, screen share, and server-run cats, study buddies and the Buddy Machine).
The plan's [What's left](docs/v2-plan.md#whats-left) is the source of truth.

## Working agreements

**Process**

- **Feature by feature:** discuss a feature in detail with the owner before building (how it works,
  how it feels, panel or 3D), build it in `demo/` for approval, then write or update its spec and
  the plan. Don't build ahead of a decision.
- **Ask in plain text** with options and a recommendation. Don't use pop-up question dialogs.
- **The owner tests by hand at the end:** every feature you build adds its checks to
  [`docs/v2/manual-tests.md`](docs/v2/manual-tests.md) in the same change (what to try and what
  should happen). Tell the owner in your summary which checks you added.
- **Review notes in the same change:** each build part adds its entry to
  [`docs/v2/review-notes.md`](docs/v2/review-notes.md) (what changed, bugs found and fixed while
  building) and puts anything you noticed but didn't fix in its Open list, not only in your summary.
- **The seed is written once, at the end:** when every feature is on the API, one seed fills all
  the data (people, rooms, members, friends, DMs…) for the owner to test with. Don't grow it feature
  by feature; until then it holds only the demo people (to sign in) and the S3 bucket. Test a new
  feature with the API tests and by hand.
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
  boot the whole app (`apps/api/test/test-app.ts`) against a real test database, `connecta_test`
  in the compose Postgres (created and migrated on each run), with fakes only for what leaves the
  machine (email). So `pnpm check` needs `docker compose up -d`; CI runs Postgres and Redis as services.
- **Sign-in is Better Auth** (`apps/api/src/auth/auth.ts`), served under `/api/auth/*`. A global
  guard protects every route: mark public ones `@AllowAnonymous()`, read the user with
  `@Session()`. Better Auth owns the users, sessions, accounts and verifications tables; Connecta's
  own user fields (`handle`, `birthday`, `look`) are `input: false` there and written only by the
  accounts module.
- **The web app calls the API through the generated client** (`apps/web/src/lib/api/client.ts`,
  `api.GET('/api/me')`) with relative paths and TanStack Query; sign-in goes through `authClient`.
  After changing an endpoint or schema, run `pnpm api:client` and commit `apps/api/openapi.json`
  and `apps/web/src/lib/api/schema.d.ts` (CI fails if they're stale).
- **`.npmrc` uses `node-linker=hoisted` on purpose:** Colyseus packages peer-depend in a cycle, and
  an isolated layout installs two `@colyseus/core` copies ("seat reservation expired" on every join).
- **Headless Chrome and Playwright always run with `--mute-audio`.**
- **Processes:** stop only this project's processes, by PID, port or the task that started them.
  Never pattern-kill.

**Infra and secrets**

- **Local development only** until the owner says to deploy. The cloud is AWS, behind nginx
  ([spec 15](docs/v2/features/15-business-infra.md#architecture)). Code talks to AWS only through
  the AWS SDK with `AWS_ENDPOINT_URL`, so locally it hits the AWS Emulator; email goes through the
  API's mail module (Mailpit locally, SES in production).
- **Only the owner provisions** cloud resources. Agents suggest steps and run read-only checks only.
- Never commit secrets (`.env` files are ignored; examples are `.env.example`).

## Commands

Node 24 (`.nvmrc`) and pnpm 9 (`packageManager`, via corepack).

```bash
pnpm install
docker compose up -d                 # Postgres :5433, Redis :6379, LiveKit :7880, Mailpit :8025,
                                     # AWS Emulator :9297 (the first run builds its image)
cp apps/api/.env.example apps/api/.env
cp apps/game/.env.example apps/game/.env   # same GAME_SECRET as the API's
pnpm db:migrate && pnpm db:seed      # schema, then the demo people and the S3 bucket
pnpm dev                             # web :3000, API :4000 (Swagger UI at /api/docs), gateway :4001,
                                     # game server :4002 (the web app proxies /api, /live and /game)
pnpm check                           # what CI runs: prettier --check, then typecheck + lint + tests
pnpm build
pnpm format                          # prettier --write
pnpm db:migrate                      # create and apply a migration after a schema change
pnpm db:seed                         # safe to rerun; also after restarting the AWS Emulator
pnpm db:reset                        # drop the local database, migrate, seed
pnpm db:studio                       # browse the local database
pnpm api:client                      # after an API change: OpenAPI document → web types
pnpm --filter @connecta/web screens 390 dark guest   # screenshots; needs the web app running
pnpm --filter @connecta/web perf                     # 3D budget check; needs the web app running
```

Signing in locally: use the email code; it arrives in Mailpit (http://localhost:8025). The seed
people sign in as `<handle>@connecta.test` (`maimai@connecta.test`). Google and Discord need
their keys in `apps/api/.env` (see `.env.example`).

Single tests: `cd apps/api && npx vitest run src/accounts`, `cd packages/shared && npx vitest run
src/navigation.test.ts`, `cd apps/game && npx vitest run` (boots the game server on :4092).

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
  api/       NestJS 12: REST + OpenAPI, sign-in, jobs, and a second entry point, the live
             gateway (src/gateway.ts: Socket.IO at /live, chat, typing and presence). Owns the
             database: Prisma schema + migrations
  game/      Colyseus 0.18: one game room per Connecta room (movement, seats, capacity); trusts
             only the API's signed join ticket, talks to the API and gateway through Redis
packages/
  shared/    Built to dist/ (tsc; `pnpm dev` watches it): account rules (handles, age), avatars, the
             maps' data (`@connecta/shared/maps`), the game protocol, map world types, movement
             rules, collisions, A* navigation, NPC types. Used by the web
             app, the demo, the API and the game server
docker/      Images built for local services (the AWS Emulator, which AWS ships only as a package)
demo/        The design sandbox (mock data only)
docs/        The plan, the decision log, the specs
```

- **Live events:** a REST write that others should see live calls `LiveService` (`toRoom`,
  `toUser`); the gateway delivers it through Redis. A write the people inside a 3D room should feel
  (kick, ban, leave, role, map, delete) also calls `GameService.roomEvent`, which the game server
  hears through Redis; the game server reports who's in which room the same way, and the gateway
  writes it into presence. The gateway itself writes nothing but presence
  (`PresenceService`: each tab's state in Redis, "last seen" in Postgres), which the API reads for
  lists. API tests boot the gateway too (`createTestGateway`), so they need Redis as well as Postgres.
- **Background jobs:** BullMQ on Redis (`@nestjs/bullmq`), workers in the API process for now; the
  pictures worker is the first (`src/chat/pictures.processor.ts`). Timed jobs stay `@Cron`.
- **Files:** browsers move the bytes through presigned links from `StorageService`; locally those
  go through `/api/dev-storage` because the AWS Emulator refuses browsers (see the decision log).
  Tests use `MemoryStorage`.
- **API conventions:** one Nest module per feature (`src/<feature>/`: module, controller, service,
  schemas, `*.spec.ts` beside the code). Config is validated with Zod at startup
  (`src/config/env.ts`); add every new variable there and to `.env.example`. `src/setup.ts` holds
  what `main.ts` applies (the `/api` prefix, CORS, validation, logging), so tests boot the app the
  same way. Logs are pino (JSON in production, pretty locally).
- **Web conventions:** `features/<feature>/` holds everything per feature (`features/account/useMe`
  is who's signed in, `features/rooms/useRooms` the rooms). Server components read the API with the
  request's cookies (`getMe`, `getRoom` in each feature's `server.ts`). Mock data in `lib/mock.ts` is the API boundary: each mock function becomes an
  API call as its feature is ported.
- CI (`.github/workflows/ci.yml`) runs `pnpm check` and `pnpm build`. There's no deploy yet.
