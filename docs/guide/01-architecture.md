# 1. The big picture

Connecta is four programs that share one TypeScript package, plus five services in Docker.

```
                          ┌────────────────────────────────────────────┐
  Browser ───────────────▶│ web  (Next.js, :3000)                      │  pages, the 3D room
   (one origin:           │  /api/*  ──▶ API      (NestJS, :4000)      │  REST, sign-in, database
    localhost:3000)       │  /live   ──▶ gateway  (NestJS, :4001)      │  pushes live events
                          │  /game/* ──▶ game     (Colyseus, :4002)    │  3D rooms in real time
                          └────────────────────────────────────────────┘
                                   │            │            │
                              Postgres       Redis        LiveKit (voice)   S3 (files)   email
                               :5433         :6379          :7880          :9297 local   Mailpit :8025
```

The browser only ever talks to **its own origin**. Next.js forwards `/api`, `/live` and `/game` to
the right process ([`next.config.ts`](../../apps/web/next.config.ts)); in production nginx does
the same. So the session cookie goes everywhere and there is no CORS.

## The four programs

| Program     | Folder                                          | Owns                                                                                     | Never does                          |
| ----------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------- |
| **web**     | [`apps/web`](../../apps/web)                    | every page and the 3D room in the browser                                                | decide anything; it asks the others |
| **API**     | [`apps/api`](../../apps/api) (`src/main.ts`)    | the database, sign-in, every rule, every write, background jobs                          | hold live connections               |
| **gateway** | [`apps/api`](../../apps/api) (`src/gateway.ts`) | the browser's live connection: delivers what the API publishes; writes presence          | write anything else                 |
| **game**    | [`apps/game`](../../apps/game)                  | each room in 3D: who's inside, positions, bubbles, activities, timers, cats              | read the database                   |
| shared      | [`packages/shared`](../../packages/shared)      | rules and types the others agree on: maps, movement, game protocol, account rules, games | run on its own                      |

The gateway is the same code and Docker image as the API, started from a second entry point, so
live connections can scale apart from REST.

## Where data lives

| Where                  | What                                                                                       | Lifetime                  |
| ---------------------- | ------------------------------------------------------------------------------------------ | ------------------------- |
| **Postgres** (Prisma)  | accounts, rooms, members, messages, friends, focus rounds, coins, payments, reports, audit | forever (some jobs prune) |
| **Redis**              | presence per tab, report counts, Common room seats, BullMQ jobs, Socket.IO and game events | minutes to hours          |
| **Game server memory** | everything happening inside a room right now: positions, bubbles, games, TV, cats          | until the room empties    |
| **S3**                 | chat pictures and room thumbnails (the AWS Emulator locally)                               | forever                   |
| **LiveKit**            | voice and screen-share streams                                                             | live only, never recorded |

**Rule of thumb:** if it should survive everyone leaving, it's in Postgres and goes through the
API. If it only matters while people are inside, it lives on the game server.

## Three ways data moves

### 1. A normal write: REST

Example: you send a message in Room chat.

1. The browser calls `POST /api/rooms/:id/messages` through the typed client
   ([`lib/api/client.ts`](../../apps/web/src/lib/api/client.ts)).
2. The API checks the session and the rules, saves the message
   ([`chat.service.ts`](../../apps/api/src/chat/chat.service.ts)) and answers.
3. Because others should see it live, the API also calls `LiveService.toRoom(...)`
   ([`live.service.ts`](../../apps/api/src/live/live.service.ts)), which writes the event to Redis.

### 2. A live push: the gateway

4. Every gateway process listens to Redis (Socket.IO's Redis adapter,
   [`redis-io.adapter.ts`](../../apps/api/src/gateway/redis-io.adapter.ts)) and delivers the event
   to the sockets in that room's Socket.IO room
   ([`live.gateway.ts`](../../apps/api/src/gateway/live.gateway.ts)).
5. The browser's one live socket ([`features/chat/live.ts`](../../apps/web/src/features/chat/live.ts))
   hears it, and the hook ([`useRoomChat.ts`](../../apps/web/src/features/chat/useRoomChat.ts))
   updates the TanStack Query cache, so the message appears.

The gateway **only delivers**. The one thing a browser sends it is "typing" and its own idle time
(presence). Every write goes through REST.

### 3. Inside a room: the game server

Example: you walk into a room and move.

1. The page asks the API for a **ticket**: `POST /api/rooms/:id/ticket`. The API checks you may go
   in and signs a one-minute JWT with who you are, your role, the room's capacity and map
   ([`game.service.ts`](../../apps/api/src/game/game.service.ts)).
2. The browser joins the Colyseus room for that Connecta room with the ticket
   ([`useGame.ts`](../../apps/web/src/features/game/useGame.ts)). The game server checks the
   signature ([`ticket.ts`](../../apps/game/src/ticket.ts)); that's all it trusts.
3. From then on the browser sends small messages (`move`, `sit`, `say`…) and the game server checks
   each one ([`room.ts`](../../apps/game/src/room.ts)) and changes the **room state**
   ([`state.ts`](../../apps/game/src/state.ts)). Colyseus syncs the state to every browser in the
   room automatically, about 20 times a second.
4. The browser mirrors that state into plain objects the 3D scene reads every frame
   ([`liveRoom.ts`](../../apps/web/src/features/room3d/liveRoom.ts)).

## How the servers talk to each other

All through **Redis**, never direct calls. Channel names are in
[`packages/shared/src/game.ts`](../../packages/shared/src/game.ts) (`GAME_CHANNELS`).

| From → to      | What                                                                        | Code                                                                                                                                        |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| API → browsers | live events (new message, friend request, inbox item…)                      | `LiveService` → gateway                                                                                                                     |
| API → game     | room events: kick, ban, role, map, delete, timeout, look, notice            | `GameService.roomEvent` → [`game/src/redis.ts`](../../apps/game/src/redis.ts) → `ConnectaRoom.apply`                                        |
| game → gateway | who's in which room (presence)                                              | [`gateway/game-presence.ts`](../../apps/api/src/gateway/game-presence.ts)                                                                   |
| game → API     | finished focus rounds, quest steps (BullMQ queues); "a full room has space" | [`focus.processor.ts`](../../apps/api/src/focus/focus.processor.ts), [`quests.processor.ts`](../../apps/api/src/quests/quests.processor.ts) |
| game → game    | "you walked into another room" (one room at a time)                         | `GAME_CHANNELS.walkedIn`                                                                                                                    |
| API → everyone | platform settings changed (word list, switches, Common seats)               | [`settings.service.ts`](../../apps/api/src/settings/settings.service.ts)                                                                    |

## Trust

- **The API decides everything about people and rooms.** The web app hides buttons, but every rule
  is checked again on the server.
- **The game server trusts only signed passes from the API**: the join ticket, and the deck pass
  for room decks. Both are signed with `GAME_SECRET`, which the two share.
- **Voice is enforced by LiveKit itself**: the game server decides who may talk and tells LiveKit;
  each speaker's client tells LiveKit who may hear it (private zones).
- **Secrets stay on servers.** The browser never sees Stripe keys, LiveKit secrets or other
  people's emails.
