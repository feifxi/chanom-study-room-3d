# 2. The repo and its conventions

One pnpm workspace, built with Turborepo. `pnpm dev` starts all four programs; `pnpm check` runs
what CI runs (Prettier, typecheck, lint, every test). Setup steps are in
[`AGENTS.md`](../../AGENTS.md#commands).

```
apps/
  web/          Next.js 16: pages and the 3D room
  api/          NestJS 12: REST API, sign-in, jobs (src/main.ts) and the live gateway (src/gateway.ts)
  game/         Colyseus 0.18: rooms in 3D
packages/
  shared/       rules and types used by all three (built to dist/ before the others)
docker/         images for local services (the AWS Emulator)
docs/           specs, decisions, this guide
docker-compose.yml  Postgres, Redis, LiveKit, Mailpit, AWS Emulator
turbo.json      task order: shared builds first, the API's Prisma client is generated first
```

## packages/shared: what both sides must agree on

If the browser and a server both need a rule, it lives here once
([`packages/shared/src`](../../packages/shared/src)). The browser uses it to answer at once; the
server uses it as the final say.

| File                                                                                                             | What                                                                       |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `account.ts`, `avatar.ts`                                                                                        | @handle rules, ages, the character's colours and accessories               |
| `rooms.ts`                                                                                                       | roles (`canActOn`), tags, `ROOM_PLANS` (Free and Plus limits)              |
| `game.ts`, `player.ts`                                                                                           | the game server's protocol: tickets, room events, Redis channels, messages |
| `movement.ts`, `collision.ts`, `world.ts`, `navigation.ts`                                                       | walking speed, collisions, A* paths                                        |
| `maps/`                                                                                                          | each map's data: walls, seats, zones, spots                                |
| `activities.ts`, `chess.ts`, `slave.ts`, `pickASide.ts`, `drawGuess.ts`, `board.ts`, `watch.ts`                  | the games' rules                                                           |
| `focus.ts`, `quests.ts`, `shop.ts`, `plus.ts`, `npc.ts`, `common.ts`, `reports.ts`, `settings.ts`, `moderate.ts` | the rest                                                                   |

Heavy or private parts have their own entry so the web app doesn't download them: import
`@connecta/shared/moderate` (the word lists), `@connecta/shared/chess`, `/slave`, `/pick-a-side`,
`/draw-guess`, `/quests`, `/shop`, `/plus`, `/maps` instead of the root. The list is in
[`package.json`](../../packages/shared/package.json) `exports`.

**Shared is built to `dist/`.** After changing it, `pnpm dev` rebuilds it (watch mode); a lone
typecheck may need `pnpm --filter @connecta/shared build` first.

## apps/api: one module per feature

```
src/
  main.ts           the REST API: creates the app, applies setup.ts, serves Swagger at /api/docs
  gateway.ts        the live gateway: same code, second process
  setup.ts          what main.ts applies (prefix /api, validation); tests reuse it
  app.module.ts     every module, Better Auth, BullMQ, cron, rate limits
  config/env.ts     every environment variable, checked with Zod at startup
  <feature>/        one folder per feature (below)
  prisma/, live/, game/, mail/, storage/, audit/, settings/   services the features share
prisma/
  schema.prisma     the database, grouped by feature
  migrations/       one folder per change (pnpm db:migrate)
  seed/             local data, one file per area
test/test-app.ts    boots the whole app for tests
```

A feature folder always has the same files ([`src/focus/`](../../apps/api/src/focus) is a good
small example):

| File              | Holds                                                             |
| ----------------- | ----------------------------------------------------------------- |
| `x.module.ts`     | wires the controller and services; imports other modules it needs |
| `x.controller.ts` | the routes: decorators, the session, the body schema; no logic    |
| `x.service.ts`    | the logic: rules, Prisma queries, live events, room events        |
| `x.schemas.ts`    | Zod schemas for bodies and responses (also the OpenAPI document)  |
| `x.spec.ts`       | tests, beside the code, calling the real routes                   |
| `x.processor.ts`  | a BullMQ worker, when the feature has background jobs             |
| `x-cleanup.ts`    | a `@Cron` job that prunes old rows                                |

**How a route looks** ([`todos.controller.ts`](../../apps/api/src/focus/todos.controller.ts)):

```ts
@Post()
@ApiCreatedResponse({ standardSchema: TodoSchema })        // documents the answer for the web client
add(@Session() session: UserSession,                       // who's signed in (every route needs one…)
    @Body({ schema: AddTodoBodySchema }) body: z.infer<typeof AddTodoBodySchema>) {  // validated by Zod
  return this.todos.add(session.user.id, body.text);        // the service does the work
}
```

- **Every route needs a session** unless marked `@AllowAnonymous()` (anyone) or `@OptionalAuth()`
  (signed in or not). Most services also refuse guests and half-signed-up accounts with
  `requireSignedUp()` ([`accounts/signed-up.ts`](../../apps/api/src/accounts/signed-up.ts)).
- **Errors** are Nest exceptions with a `code` the web app can switch on:
  `throw new ForbiddenException({ message: 'A mod timed you out…', code: 'timed_out' })`.
- **NestJS 12 is ESM:** relative imports end in `.js` even in `.ts` files.
- **No class-validator:** bodies are Zod schemas through `@Body({ schema })`.

## apps/game: one Colyseus room class

```
src/
  main.ts       starts Colyseus, connects Redis and LiveKit
  server.ts     one room type, matched by `place` (the Connecta room id)
  room.ts       ConnectaRoom: joining, every message handler, room events, timers
  state.ts      the synced state (players, cats, spots, games, the TV)
  ticket.ts     checks the API's signed ticket and deck pass
  redis.ts      room events in; presence, focus rounds and quest steps out
  links.ts      what the room reports outward (so tests can swap Redis for functions)
  voice.ts      LiveKit: voice passes and who may talk
  rules.ts      pure movement checks
  activity.ts   the activity framework and chess; pickASide.ts, slave.ts, drawGuess.ts, board.ts, watch.ts, focus.ts
  npc/          cats and study buddies (director.ts runs them)
```

Each client message has a handler in `ConnectaRoom.messages`, validated with Zod, that checks the
sender may do it and changes the state. See [chapter 3](03-techniques.md#the-game-server).

## apps/web: routes, features, components, lib

```
src/
  app/            routes only (Next.js App Router); pages stay thin
  features/<x>/   everything for one feature: hooks, panels, 3D parts
  components/     things used across features: the app frame, the chat, settings, ui/ (shadcn)
  lib/            small helpers: the API client, time, the server clock, your look
```

**Route groups** (folders in brackets don't appear in the URL):

| Group                                                | Pages                                                      | Who gets in                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `app/(app)/`                                         | Home `/home/*`, a room's page `/r/<id>`                    | finished accounts ([layout](<../../apps/web/src/app/(app)/layout.tsx>)) |
| `app/(browse)/`                                      | Discover                                                   | anyone, signed in or not                                                |
| `app/(room)/`                                        | the 3D room `/r/<id>/walk`, a Common room `/common/<type>` | members, guests with a pass; full screen, no header                     |
| `app/admin/`                                         | the admin site                                             | the team (404 for everyone else)                                        |
| `app/login`, `i/`, `g/`, `f/`, `checkout`, `receipt` | sign-in, invite links, guest passes, friend links, paying  | as each page says                                                       |

**Server or client?** Pages and layouts are server components: they read the API with the
request's cookies (`getMe()` in [`features/account/server.ts`](../../apps/web/src/features/account/server.ts),
`getRoom()` in [`features/rooms/server.ts`](../../apps/web/src/features/rooms/server.ts)), redirect
if needed, and render client components. Anything interactive is `'use client'` and fetches with
TanStack Query through the typed client. The 3D room only renders in the browser
([`RoomLoader.tsx`](../../apps/web/src/features/room/RoomLoader.tsx)).

**A data hook** ([`useTodos.ts`](../../apps/web/src/features/focus/useTodos.ts)) is the usual shape:
a `useQuery` with a key, mutations that update the cache at once and roll back with a toast if the
API says no, and a live listener that invalidates the key when another tab changes it.

## Conventions everyone follows

- **Comments explain why**, not what. Each file starts with a comment saying what it is for; read
  those first when you open a folder.
- **Names:** rooms are rooms (never "server" or "channel"); generic game names only.
- **Prettier** formats everything (`pnpm format`). Lines up to 140 characters. Don't format
  `apps/web/src/lib/api/schema.d.ts` (generated).
- **Small modules:** one component or hook per file, named after it.
- **Real app only:** no mock data and no fake buttons. The Test tools are the one exception, in
  development only.
- **UI copy:** mood first, English, short.
- **Docs in the same change:** the spec, the decision log, hand-test checks, open issues
  ([`docs/README.md`](../README.md)).

## Tests

- **Vitest everywhere.** `pnpm check` needs `docker compose up -d`.
- **API tests boot the whole app** ([`test/test-app.ts`](../../apps/api/test/test-app.ts)) against a
  real `connecta_test` database and Redis; only email is faked (mail lands in a `sent` list, and files in memory). They
  sign people up and call real routes: see any `*.spec.ts`.
- **Game tests** ([`room.spec.ts`](../../apps/game/src/room.spec.ts)) boot a game server on :4092
  and join with real Colyseus clients and signed tickets.
- **Shared tests** are plain unit tests (`*.test.ts`).
- **The web app** has no unit tests; it's checked with typecheck, lint, the screenshot script and
  the perf check ([developer guide](../dev-guide.md)).

## The seed

`pnpm db:seed` fills the local database with one coherent world
([`prisma/seed/`](../../apps/api/prisma/seed), one file per area): the seed people, four rooms
with chat, friends, DMs, decks, two weeks of focus, coins, Plus payments, reports and inbox items.
Running it again replaces what it made ([`reset.ts`](../../apps/api/prisma/seed/reset.ts)); your
own accounts stay. Who's who is in [manual tests](../manual-tests.md#the-seed).
