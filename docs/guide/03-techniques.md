# 3. Techniques

The patterns the whole codebase reuses. Learn these once and every feature reads the same way.

## Sign-in and sessions

**Better Auth** runs inside the API under `/api/auth/*` ([`auth/auth.ts`](../../apps/api/src/auth/auth.ts)).

- **Ways in:** a 6-digit email code (`emailOTP` plugin), Google, Discord. No passwords. Guests use
  the `anonymous` plugin: a real account with a throwaway address, in that browser.
- **Sessions** live in Postgres for 30 days, in an HttpOnly cookie (`connecta.*`). The browser
  never handles a token.
- **Connecta's own fields** on the user (`handle`, `birthday`, `look`) are marked `input: false`, so
  Better Auth can't write them; only the accounts module does, after checking the rules.
- **Suspensions** are refused in `databaseHooks.session.create.before`: a suspended person can't
  get a new session by any way in.
- **In the web app:** sign in and out with [`lib/auth-client.ts`](../../apps/web/src/lib/auth-client.ts);
  read who you are with `useMe()` ([`features/account/useMe.ts`](../../apps/web/src/features/account/useMe.ts))
  in the browser, or `getMe()` on the server.
- **In the API:** a global guard protects every route. Read the user with `@Session()`; open a
  route with `@AllowAnonymous()` or `@OptionalAuth()`.

## The typed API client

The browser never writes a URL or a response type by hand.

1. Each API route declares its body and answer with Zod schemas (`x.schemas.ts`) and
   `@ApiOkResponse({ standardSchema })`.
2. `pnpm api:client` boots the API without listening, writes
   [`apps/api/openapi.json`](../../apps/api/openapi.json) ([`openapi.ts`](../../apps/api/src/openapi.ts)),
   then generates [`apps/web/src/lib/api/schema.d.ts`](../../apps/web/src/lib/api/schema.d.ts).
3. The web app calls `api.GET('/api/todos')`, `api.POST('/api/rooms/{id}/ticket', { params })`
   ([`lib/api/client.ts`](../../apps/web/src/lib/api/client.ts), `openapi-fetch`). Paths, bodies and
   answers are all typed; a wrong one fails `pnpm typecheck`.
4. Types for components come from `Schemas['Todo']`.

**After changing an endpoint, run `pnpm api:client` and commit both generated files.** CI fails if
they're stale.

## Server data in the browser: TanStack Query

Every piece of API data is a query with a key (`['todos']`, `['rooms', id]`). Hooks own the key
for their feature (`useRooms.ts`, `useFriends.ts`…), so "refresh rooms" is one
`invalidateQueries` everywhere. Mutations update the cache first (**optimistic**), then roll back
with a toast if the API refuses. Server components hand what they already loaded to the cache
(`MeSeed`), so the first render doesn't fetch again.

## Live events

How the API reaches open tabs without holding a connection:

```
API service ──LiveService.toRoom/toUser──▶ Redis ──▶ every gateway process ──▶ the tabs in that Socket.IO room
```

- **Sending** (API): inject `LiveService` ([`live/live.service.ts`](../../apps/api/src/live/live.service.ts))
  and call `toRoom(roomId, event, payload)`, `toUser(userId, …)`, `toUsers([...], …)` or
  `toChannel(…)`. `signOut(userId)` tells every tab and drops its sockets.
- **Socket.IO rooms** a tab is in: `user:<id>` always; `room:<id>` while it watches a room's chat
  (it asks with `watch`; the gateway checks membership).
- **Receiving** (web): one socket per tab, opened on first use
  ([`features/chat/live.ts`](../../apps/web/src/features/chat/live.ts)): `liveSocket().on('event', fn)`.
  Usually the handler just invalidates a query key.
- **The gateway accepts only a few browser messages:** `watch` / `unwatch` a room's chat,
  `watch:inside` (Discover's live counts), `typing`, `typing:dm` and `presence`.

## Presence

Who's online, away, and in which room ([`presence/presence.service.ts`](../../apps/api/src/presence/presence.service.ts)).

- **Each open tab is a row in Redis** (`presence:tabs:<userId>`): browser tabs report their idle
  time to the gateway every minute; the game server reports which room each connection is in
  ([`gateway/game-presence.ts`](../../apps/api/src/gateway/game-presence.ts)). A tab silent for
  2.5 minutes is dropped.
- **Your status is computed from all your tabs** (online if any is active, away after 10 minutes,
  focusing from the game tab). Only "last seen" is saved in Postgres.
- **The gateway is the only writer.** Each friend gets their own view (a private room they're not
  in is never named).

## The game server

**Colyseus** keeps one room per Connecta room ([`apps/game/src/room.ts`](../../apps/game/src/room.ts)).

- **Joining:** `onAuth` checks the ticket; `onJoin` adds a `Player` to the state with the ticket's
  name, role and look; capacity is checked against the ticket (owners and mods always fit).
- **State** ([`state.ts`](../../apps/game/src/state.ts)) is declared with Colyseus's `schema()`;
  every field change is synced to every client 20 times a second (`PATCH_RATE_MS`). Only put in the
  state what everyone may see.
- **Messages in:** `messages = { move: validate(zodSchema, handler), … }`. Every handler checks the
  sender is allowed (in range, seated, the host, not timed out) and changes the state.
- **Private messages out:** what only one player may see goes with `client.send(...)`, never in the
  state: a Slave hand (`slave:hand`), a Draw & Guess turn (`tel:turn`), "you're timed out" (`quiet`).
- **Room events in** from the API through Redis: `apply(event)` handles kick, ban, role, map, look,
  timeout, notice, deleted.
- **Timers** run on the server's clock (`setInterval` in the room), never the browser's.
- **Out:** presence, "space in a full room", focus rounds and quest steps go through
  [`links.ts`](../../apps/game/src/links.ts), wired to Redis in [`redis.ts`](../../apps/game/src/redis.ts)
  and to plain functions in tests.

**In the browser**, [`useGame.ts`](../../apps/web/src/features/game/useGame.ts) gets the ticket and
joins; [`LiveRoom`](../../apps/web/src/features/room3d/liveRoom.ts) mirrors the state into plain
objects and exposes methods (`room.say(text)`, `room.sit(id)`…) that send messages. The activity
hub ([`features/activities/hub.ts`](../../apps/web/src/features/activities/hub.ts)) does the same
for spots and games.

## Moving: prediction and reconciliation

Waiting for the server before moving would feel laggy, so your own character moves at once
([`LocalPlayerDriver.ts`](../../apps/web/src/features/room3d/LocalPlayerDriver.ts)):

1. Each frame, keys, the joystick or a click-to-walk path move you locally, with the same speed and
   collision rules as the server ([`packages/shared/src/movement.ts`](../../packages/shared/src/movement.ts),
   `collision.ts`).
2. 15 times a second the position goes to the server with a sequence number; the server checks the
   speed (a move budget) and the walls, and echoes the last number it applied.
3. [`reconcile.ts`](../../apps/web/src/features/room3d/reconcile.ts) compares the server's position
   with what we predicted _for that same move_, and corrects smoothly only if they disagree.

Other people's characters are eased toward their latest synced position. Click to walk and the
cats use A* over a grid built from the furniture ([`navigation.ts`](../../packages/shared/src/navigation.ts)).

## Voice and screen share: LiveKit

- **The game server decides who may talk** ([`voice.ts`](../../apps/game/src/voice.ts)): it hands
  each player a 10-minute LiveKit token, publishing allowed or not (guests, Mute for everyone,
  time outs, away), and changes it live.
- **Each browser decides what it hears** ([`features/voice/useVoice.ts`](../../apps/web/src/features/voice/useVoice.ts)):
  it subscribes to the 12 nearest voices only, sets each one's volume by distance (full within
  2.5 m, silent at 9 m) and pans it left or right (a `StereoPannerNode`).
- **Private zones are enforced by LiveKit:** each speaker's client tells LiveKit which identities
  may receive its track, so a tampered client outside a zone can't subscribe.
- **Screen shares** are LiveKit video tracks with the same "only this audience" rule.

## Background jobs and timed jobs

- **BullMQ on Redis** for work that must not be lost: `pictures` (make the WebP, run the picture
  check), `focus-rounds` and `quest-events` (from the game server). A worker is a `@Processor`
  class in the API ([`chat/pictures.processor.ts`](../../apps/api/src/chat/pictures.processor.ts)).
  Jobs retry; ids keep them from counting twice.
- **`@Cron`** for clean-ups and sweeps: deleting accounts after 7 days, guest accounts, old to-dos
  and quest progress, Plus ending ([`plus/plus-ending.service.ts`](../../apps/api/src/plus/plus-ending.service.ts)).

## Files: presigned S3 links

Bytes never pass through the API.

1. The browser asks the API for an upload (`POST /api/pictures`); the API checks size and rate and
   answers with a presigned S3 `PUT` link ([`storage/storage.service.ts`](../../apps/api/src/storage/storage.service.ts)).
2. The browser uploads straight to S3, then tells the API (`/uploaded`).
3. A BullMQ job shrinks it to WebP and checks it; then it shows.
4. Viewing is a members-only redirect to a one-hour link.

Locally the AWS Emulator refuses browsers, so links go through `/api/dev-storage`
([`dev-storage.controller.ts`](../../apps/api/src/storage/dev-storage.controller.ts)); production
uses S3 directly. Code only talks to AWS through the SDK with `AWS_ENDPOINT_URL`.

## Platform settings

The word list, the moderation switches and Common room seats are edited on the admin site and live
in Postgres. [`settings.service.ts`](../../apps/api/src/settings/settings.service.ts) keeps them in
memory, writes the whole set to Redis on every change and publishes it, so every API process and
game server applies it at once ([`packages/shared/src/settings.ts`](../../packages/shared/src/settings.ts)).

## The audit log

Every team action, automatic moderation step and room mod action is one row:
`AuditService.record({ by, action, targetKind, targetId, reason, details })`
([`audit/audit.service.ts`](../../apps/api/src/audit/audit.service.ts)). `by` is null for automatic
steps. Action codes are dotted (`account.suspend`, `room.close`, `roommod.kick`); the admin site
turns them into words ([`auditLabels.ts`](../../apps/web/src/features/admin/auditLabels.ts)).

## 3D rendering and performance

The room is React Three Fiber ([`RoomCanvas.tsx`](../../apps/web/src/features/room3d/RoomCanvas.tsx)).
It has to run 100 people on a phone, so:

- **Static furniture is merged** into a few meshes by `<StaticBatch>`
  ([`StaticBatch.tsx`](../../apps/web/src/features/room3d/StaticBatch.tsx)).
- **Characters and cats are skinned meshes** built from simple shapes and merged to ~4 draw calls
  each ([`avatar/skin.ts`](../../apps/web/src/features/avatar/skin.ts)).
- **Shadows** are drawn once for the furniture ([`StaticShadows.tsx`](../../apps/web/src/features/room3d/StaticShadows.tsx));
  moving things get a soft blob instead.
- **The frame rate is capped** ([`FrameDriver.tsx`](../../apps/web/src/features/room3d/FrameDriver.tsx)):
  60 fps while you're active, 30 while still in battery saver ([`quality.ts`](../../apps/web/src/features/room3d/quality.ts)).
- **Name tags and bubbles are one DOM layer** over the canvas, not 3D text
  ([`labels.tsx`](../../apps/web/src/features/room3d/labels.tsx)).
- **A budget per frame** ([`perf.ts`](../../apps/web/src/features/room3d/perf.ts)) is checked by
  `pnpm --filter @connecta/web perf` on every map with 3, 50 and 100 people. Run it after any 3D
  change.

## Clocks

Countdowns compare against **the game server's clock**, learned when you join
([`lib/serverClock.ts`](../../apps/web/src/lib/serverClock.ts)), so a wrong computer clock doesn't
show them wrong. Components read time through `useNow()` ([`lib/time.ts`](../../apps/web/src/lib/time.ts)),
never `Date.now()` while rendering (React Compiler keeps renders pure).

## Word filter

One function, `maskWords` in [`packages/shared/src/moderate.ts`](../../packages/shared/src/moderate.ts),
used by the API (chat, decks, names) and the game server (bubbles, Draw & Guess). Messages are
masked; names are refused. The team edits the list on the admin site.
