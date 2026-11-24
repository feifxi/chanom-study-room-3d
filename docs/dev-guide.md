# Developer guide

How the code is laid out beyond what [`AGENTS.md`](../AGENTS.md) says, how maps are built, and the
gotchas that have bitten before.

## Test tools

A dashed **Test tools** tab on the right of every page (development only): theme, a pretend
crowd (with it, a full Buddy Machine of pretend cats, buddies and pets), the perf overlay, "Go away
now" and your Plus.

## Checking UI changes

Typecheck and lint don't catch layout problems. With `pnpm dev` running:

```bash
pnpm --filter @connecta/web screens 390 dark guest     # width, theme, me|guest; optional paths
pnpm --filter @connecta/web screens 1280 light me /discover
pnpm --filter @connecta/web perf                       # the 3D budget, every map
```

Look at the pictures in `apps/web/.screens/` at phone (390) and desktop (1280), light and dark,
signed in and as a guest. `screens` signs in as `fei@connecta.test` (`SCREENS_AS` to change).

## Maps

A map is two halves:

- **Data** (`packages/shared/src/maps/library.ts`, `cafe.ts`, `rooftop.ts`): bounds, door, seats,
  obstacles, private zones, activity areas (rugs), tables, nap spots. Read by the game server and
  the web app.
- **Scene** (`apps/web/src/features/room3d/Library.tsx`, `Cafe.tsx`, `Rooftop.tsx`): the 3D build.
  `Library.tsx` exports the shared props (Box, Cyl, Rug, Plant…).

They meet in `apps/web/src/features/map/active.ts`; data files never import their scene (that
cycle crashed the module loader). The standard kit every map needs is in
[maps.md](features/06-maps.md).

## 3D performance rules

- Static furniture goes inside `<StaticBatch>`, which merges it into a few meshes. It skips named,
  transparent, emissive, instanced and `userData.dynamic` meshes: use those only when something
  must move, glow or be looked up.
- Many copies of one small thing (books, bulbs, flames) → one `InstancedMesh`.
- Run the perf check after any 3D change. Budget: [room-3d.md](features/05-room-3d.md#performance).

## Gotchas

- **React Compiler lint:** never write a ref during render.
- **"What does E do here":** one key listener plus a ref updated by an effect without deps; a
  deps-based effect once failed to re-run on arriving at a spot.
- **Inside a room nothing navigates away silently:** use `LeaveRoomLink` /
  `useLeaveRoom().ask(href)` (`features/room/LeaveRoom.tsx`).
- **A press that only closes a panel or leaves a text box never walks** (`features/room/useDismiss.ts`).
- **Headless Chrome and Playwright always run with `--mute-audio`.** Voice tests add Chrome's
  `--use-fake-device-for-media-stream`; the dev-only `window.__connecta` drives the room.
- **The generated API client:** after an endpoint change run `pnpm api:client` and commit both
  files. Don't run Prettier over `apps/web/src/lib/api/schema.d.ts`; it's committed as generated.
- **`/login` logs a 401 when signed out** (the "who's signed in?" check), so `screens` marks it ✗
  as a guest. Harmless.
- **Next.js 16 and NestJS 12 differ from older versions:** see `AGENTS.md`.
