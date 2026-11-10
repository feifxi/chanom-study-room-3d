# Working in the demo

`demo/` is Connecta's clickable prototype: a frontend-only Next.js 16 app with mock data, where every
V2 page and 3D design is approved before backend work. It will be ported into `apps/web` (see the
[port checklist](../v2-plan.md#port-checklist)). Nothing here talks to a server; "the server" in
comments means what the real app will do.

## Run and check

```bash
pnpm --filter @study/demo demo:dev        # http://localhost:3100
pnpm --filter @study/demo demo:typecheck
pnpm --filter @study/demo demo:lint       # --max-warnings 0, React Compiler rules on
pnpm --filter @study/demo demo:perf       # 3D budget, every map zoomed out (needs demo:dev running)
pnpm --filter @study/demo demo:screens 390 dark guest   # screenshots + sideways-scroll and error check
pnpm format                               # Prettier covers demo/ too
```

The scripts are named `demo:*` so Turborepo and CI skip them; run them yourself before you commit.
After UI work, look at `demo:screens` pictures at phone (390) and desktop (1280) width, light and
dark. Typecheck and lint don't catch layout problems.

## The Demo tab

The dashed **Demo** tab on the right edge of every page is demo-only chrome:

- **View as** (`lib/viewer.ts`): the mock's own roles, Guest, Member, Mod, Owner, or Connecta team
  (the admin site). Most UI differs by role, so check the roles a change touches.
- Theme (light, dark, system) and the drink palettes.
- A crowd of 50 or 100 people walking in the 3D room, 100 rooms on Home, scripted activity starts,
  "Go away now", the performance overlay (📈, or `?perf` in the URL).
- A list of every page.

localStorage keys used by scripts: `theme`, `connecta-demo:viewer`, `connecta-demo:palette`,
`connecta-demo:crowd`, `connecta-demo:perf`.

## Where things live

| Path                          | What                                                                       |
| ----------------------------- | -------------------------------------------------------------------------- |
| `src/app/`                    | Routes. Rooms are still `/servers/[id]` and `/servers/[id]/rooms/[roomId]` |
| `src/lib/mock.ts`             | All mock data (people, rooms, chats, Common rooms)                         |
| `src/features/place/`         | Header, Home cards, a room's chat page, room settings, Inbox               |
| `src/features/room/`          | The room screen: HUD, panels, people, chat, leaving                        |
| `src/features/room3d/`        | The 3D scene: canvas, map scenes, player driver, mock room, labels, perf   |
| `src/features/map/`           | Map data files and the active-map switch                                   |
| `src/features/activities/`    | Activity framework (`spots.ts`, `hub.ts`) and each game                    |
| `src/features/avatar/`        | Characters (merged skinned meshes)                                         |
| `src/features/npc/`           | Cats, buddies and the Buddy Machine                                        |
| `src/features/admin/`         | The team-only admin site                                                   |
| `src/components/app/`         | App-level pieces: frames, settings, Plus, SplitScreen                      |
| `packages/shared` (repo root) | Navigation (A\*) and collisions, shared with V1                            |

The demo still says "server" inside (the `Server` type, routes, `components/server/`). That's the
old concept; users never see it, and the port renames it. Don't add new "server" names.

## Maps

A map is two halves, paired in `features/map/active.ts`:

- **Data** (`features/map/library.ts`, `cafe.ts`, `rooftop.ts`): size, bounds, spawn, seats,
  obstacles, private zones, activity areas (rugs: `rect` or `circle`), card tables, the Werewolf
  circle, TV and whiteboard places, nap spots, and its own navigator from `createNavigator`.
  Types and area helpers are in `features/map/types.ts`.
- **Scene** (`room3d/Library.tsx`, `Cafe.tsx`, `Rooftop.tsx`): the 3D build. `Library.tsx` exports the
  shared props and palette (Box, Cyl, Rug, Bulbs, Plant, ZoneSign, WerewolfCircle…).

Data files never import their scene (that cycle crashed the module loader), which is why they meet
in `active.ts`. `RoomView` calls `setActiveMap(look.mapId)` before building the mock room; everything
else reads `activeMap()`. Activity spots (`activities/spots.ts`) read their areas and seats from the
active map.

**To add a map:** copy a data file and a scene, give it its own layout (every map has one: door,
games, open floor and zones all move), register it in `active.ts`, then run `demo:perf` and
`demo:screens`. The standard kit every map needs is in [07-maps.md](features/07-maps.md). Known art
problems are in that file's "Map polish backlog".

## 3D performance rules

- Static furniture goes inside `<StaticBatch>`: it merges into a few meshes. It skips named,
  transparent, emissive, instanced and `userData.dynamic` meshes, so only use those when something
  must move, glow or be looked up.
- Many copies of one small thing (books, bulbs, flames, stars) → one `InstancedMesh`.
- Budget per frame and the latest numbers: [06-3d-room.md](features/06-3d-room.md#performance). Run
  `demo:perf` after any 3D change; it checks every map zoomed all the way out, the worst case.
- The resident cats are the biggest map cost left (~25–30 draw calls each). Merge them before adding
  more.

## Gotchas

- **React Compiler lint:** never write a ref during render (initialise it instead), and read
  "View as" roles once via `useState`.
- **"What does E do here":** use one key listener plus a ref updated by an effect without deps. A
  deps-based effect once failed to re-run on arriving at a spot.
- **Inside a room nothing navigates away silently.** Links out use `LeaveRoomLink` /
  `useLeaveRoom().ask(href)` from `features/room/LeaveRoom.tsx`.
- **A press that only closes a panel or leaves a text box never walks** (`features/room/useDismiss.ts`).
- **Headless Chrome always runs with `--mute-audio`.**
- **Next.js 16 differs from older versions:** read `node_modules/next/dist/docs/` before using an
  unfamiliar API (`demo/AGENTS.md`).
