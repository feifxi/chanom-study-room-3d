# 7. How to…

Step-by-step for the changes people make most. Each one ends the same way: `pnpm check`, then the
docs in the same change ([`docs/README.md`](../README.md)).

## Run and look around

| To                                | Do                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| start everything                  | `docker compose up -d`, then `pnpm dev`; open http://localhost:3000                             |
| sign in as a seed person          | `fei@connecta.test` (team), `ter@connecta.test`…; the code is in Mailpit, http://localhost:8025 |
| try every API route               | Swagger at http://localhost:4000/api/docs                                                       |
| browse the database               | `pnpm db:studio`                                                                                |
| start the data over               | `pnpm db:reset` (drops the local database, migrates, seeds)                                     |
| fill a room with people, see perf | the dashed **Test tools** tab on the right (development only)                                   |
| be two people at once             | a second browser profile or a private window, signed in as another seed person                  |
| read logs                         | the `pnpm dev` terminal: each process prefixes its lines (`@connecta/api`, `@connecta/game`…)   |

## Run one test

```bash
cd apps/api && npx vitest run src/rooms            # one API folder
cd apps/api && npx vitest run -t "kick"            # tests whose name matches
cd apps/game && npx vitest run                     # the game server (boots on :4092)
cd packages/shared && npx vitest run src/chat.test.ts
```

## Add an API endpoint

1. **Schema** in the feature's `x.schemas.ts`: a Zod schema for the body and one for the answer,
   with `.meta({ id: 'Name' })` so the web client gets a named type.
2. **Route** in `x.controller.ts`: `@Get/@Post…`, `@ApiOkResponse({ standardSchema })`,
   `@Session()` for the user, `@Body({ schema })`. Mark it `@AllowAnonymous()` only if signed-out
   people need it. Keep logic out of the controller.
3. **Logic** in `x.service.ts`: check the rules (`requireSignedUp`, roles with `canActOn`), use
   `this.prisma`, throw Nest exceptions with a `code`.
4. **If others should see it live:** `this.live.toRoom(...)` / `toUser(...)`. **If people inside a
   3D room should feel it:** `this.game.roomEvent({...})`. **If it's a mod or team action:**
   `this.audit.record({...})`.
5. **Test** in `x.spec.ts` beside it: sign people up with the helpers in
   [`test/test-app.ts`](../../apps/api/test/test-app.ts) and call the route.
6. **Regenerate the client:** `pnpm api:client`, and commit `apps/api/openapi.json` and
   `apps/web/src/lib/api/schema.d.ts`.

## Add a database field or table

1. Edit [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) in the feature's
   section. Use `@map("snake_case")` for columns, `@@map("plural")` for tables, and a `///` comment.
2. `cd apps/api && npx prisma migrate dev --name what_changed`: this writes a migration and
   regenerates the client (`src/generated/`, not committed).
3. If the seed should show it, add it in [`prisma/seed/`](../../apps/api/prisma/seed) and make sure
   [`reset.ts`](../../apps/api/prisma/seed/reset.ts) clears it.

## Add a page

1. A folder under [`apps/web/src/app/`](../../apps/web/src/app), inside the right group (`(app)`
   for signed-in pages, `(browse)` for everyone, `(room)` for full screen).
2. Keep `page.tsx` thin: a server component that loads with `getMe()` / `getRoom()`, redirects if
   needed, and renders a component from `features/<x>/`.
3. Data in the browser through a hook in `features/<x>/` with TanStack Query and `api.GET(...)`.
4. **Next.js 16 differs from older versions:** read `apps/web/node_modules/next/dist/docs/` before
   using an API you don't know.
5. Check it: `pnpm --filter @connecta/web screens 390 dark guest /your-page` and at 1280 light, signed
   in and as a guest ([developer guide](../dev-guide.md#checking-ui-changes)).

## Add something to the 3D room (a game message)

1. **Protocol** in [`packages/shared/src/game.ts`](../../packages/shared/src/game.ts) (or the
   game's own shared file): the message's shape, and any private message the server sends back.
2. **Server** in [`apps/game/src/room.ts`](../../apps/game/src/room.ts) `messages`:
   `'thing:do': validate(z.object({...}), (client, msg) => {...})`. Check the sender may do it.
   Change the **state** for what everyone sees ([`state.ts`](../../apps/game/src/state.ts)), or
   `client.send` for what only they may see.
3. **Browser:** a method on [`LiveRoom`](../../apps/web/src/features/room3d/liveRoom.ts) (or the
   activity hub) that sends it, and read the mirrored state where the HUD or 3D needs it.
4. **Test** in [`room.spec.ts`](../../apps/game/src/room.spec.ts) with real clients.
5. Any 3D change: `pnpm --filter @connecta/web perf`.

## Tell the game server about an API change (a room event)

1. Add the event to `GameRoomEvent` in [`game.ts`](../../packages/shared/src/game.ts).
2. Send it from the API service: `this.game.roomEvent({ roomId, type: 'x', ... })` (`roomId: '*'`
   for every room the person is in).
3. Handle it in `apply(event)` in [`room.ts`](../../apps/game/src/room.ts).

## Add a background job or a timed job

- **Work that mustn't be lost:** a BullMQ queue. Register it in the module
  (`BullModule.registerQueue({ name })`), add jobs with an id that makes repeats harmless, and write
  a `@Processor` class (see [`focus.processor.ts`](../../apps/api/src/focus/focus.processor.ts)).
- **A clean-up or sweep:** a `@Cron(...)` method in a small `x-cleanup.ts` service (see
  [`todos-cleanup.ts`](../../apps/api/src/focus/todos-cleanup.ts)).

## Add an environment variable

1. Add it to the Zod schema in [`apps/api/src/config/env.ts`](../../apps/api/src/config/env.ts) (or
   [`apps/game/src/env.ts`](../../apps/game/src/env.ts)); the app refuses to start without it.
2. Add it to `.env.example` with a comment. Never commit `.env`.
3. Read it with `ConfigService<Env, true>`: `config.get('NAME', { infer: true })`.

## Change a shared rule

Edit [`packages/shared/src/`](../../packages/shared/src); `pnpm dev` rebuilds it. Both sides pick it
up, so check the API and game tests still pass. If it's a heavy file, give it its own entry in
[`package.json`](../../packages/shared/package.json) `exports` so the web app doesn't bundle it.

## Debug a room

- **Someone can't walk in:** the card says why; the API answers the ticket request with a `code`
  (`banned`, `closed`, `full`…). Check `POST /api/rooms/:id/ticket` in Swagger.
- **Something doesn't update live:** is the API calling `LiveService` / `roomEvent`? Is the tab's
  socket watching the room (`watch`)?
- **Inside the room:** in development, `window.__connecta` exposes the room for browser tests; the
  Test tools' perf overlay shows frame time and draw calls.
- **Movement fights you:** the server refused a move (speed or walls). Compare
  [`movement.ts`](../../packages/shared/src/movement.ts) on both sides.
