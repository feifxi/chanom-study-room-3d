# 7. Map templates and the editor

**Status:** decided; all three launch maps built in the demo; the editor is a mock. **Try it:**

- http://localhost:3100/servers/chanom/rooms/library, `/cafe` and `/rooftop`: the three maps.
- In a room: Room card → Room settings → Map & look; change the map and it switches live.
- http://localhost:3100/admin/maps (View as Connecta team): the editor. Its Cat Café draft misses a
  big screen and a private zone, so Publish stays off.

Owners pick a template; only the Connecta team builds templates. **Every map has the same standard
kit, so every activity works in every map, but each map has its own layout**, so they feel different.

## The standard kit

| Kit piece       | Needs                       | Cosy Library             | Cat Café                   | Starry Rooftop       |
| --------------- | --------------------------- | ------------------------ | -------------------------- | -------------------- |
| Study spots     | 12+ seats (Cosy), 24+ (Big) | 4-seat and long tables   | bar, window bar, tables    | picnic desks         |
| Lounge          | a corner to hang out        | TV lounge                | TV lounge, cat tower       | campfire circle      |
| Private zones   | at least 2                  | Fireside, Window booth   | Window booth, Corner booth | Tent, Telescope deck |
| Big screen      | watch together              | TV on a console          | TV on the back wall        | outdoor cinema sheet |
| Card tables     | card games                  | 2                        | 2                          | 2                    |
| Werewolf circle | 12 seats                    | cushions round a lantern | front left                 | right side           |
| Open floor      | 12 m²+ for Pick a Side      | four-colour rug          | dance floor by the bar     | four-colour deck     |
| Whiteboard      | draw together               | board in an oak frame    | menu board                 | chalk wall           |
| Art corner      | Draw & Guess                | easels and gallery wall  | under the cat photo wall   | front left           |
| Buddy Machine   | study buddies               | by the door              | by the till                | by the stairwell     |
| Nap spots       | where the cats sleep        | hearth, shelf, sofa      | cat beds, cat tower        | hammock, tent, fire  |
| Spawn point     | where you walk in           | front door               | side door with a bell      | stairwell door       |

## Templates and sizes

- **Launch templates:** 📚 **Cosy Library** (quiet focus, rain on the windows), 🐈 **Cat Café** (warm
  and chatty), 🌙 **Starry Rooftop** (late-night talks under the stars).
- **Ideas for later**, same kit: 🌿 Greenhouse, 🥐 Bakery Kitchen, 🍊 Kotatsu House, 🏖️ Beach Hut,
  🚀 Space Station.
- **Cosy:** 26 × 18 m, up to **50** people. Every room starts here.
- **Big:** about 34 × 24 m, up to **100** people (a third long table, a second lounge, a third card
  table). Needs the owner's **Plus**.
- People at once is still capped by the owner's plan (Free 25). Every map must fit the performance
  budget ([06-3d-room.md](06-3d-room.md#performance)).

## Layout rules (every map)

- **Each map has its own layout.** The door, the games, the open floor and the zones move from map
  to map, not only the props.
- **Quiet at the back, loud at the front.** Study farthest from the door; games and talk near it;
  private zones tucked against walls.
- **The rug is the area.** Every activity spot and private zone is a rug, square where the thing has
  sides, round only for circle games (Werewolf). No floating rings: stepping on flashes the edge, and
  a spot that's gathering or playing keeps a glowing edge. The whiteboard shows no outline until you
  are close.
- **Private zones have three cues:** a hanging sign, a pill at the top while you're inside, and 🔇 on
  people inside seen from outside.
- **Areas never overlap**, and decor rugs stay clear of activity rugs.

## The three maps

The numbers are in each data file: `demo/src/features/map/library.ts`, `cafe.ts`, `rooftop.ts`.

**📚 Cosy Library** (75 seats for a room capped at 50)

| Where | Places                                                                                                                      |
| ----- | --------------------------------------------------------------------------------------------------------------------------- |
| Back  | Study block: 4 small tables and a 10-seat and an 8-seat long table under the arched window; the **Window booth** in the bay |
| Left  | Whiteboard over a 3.2 m rug; the **Fireside** (fireplace, armchairs, loveseat); the **TV lounge** (TV, L sofa, beanbags)    |
| Front | The **open floor** (6 × 5.4 m four-colour rug); the door with a mat, tea cart, coat stand and the Buddy Machine             |
| Right | Two **card tables** (oak, felt, pendant lamps); the **Werewolf circle**; the **art corner** (4 easels, paint cart, gallery) |

**🐈 Cat Café**

| Where  | Places                                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Back   | The **bar** (7 stools, a shared screen, pastry case, coffee machine, till, Buddy Machine); the **menu board**; the **art corner** under a cat photo wall |
| Left   | A glass front: the **TV lounge** in the corner, the 6-stool **window bar**, the **door with a bell**                                                     |
| Middle | The **open floor**: a dance floor in front of the bar                                                                                                    |
| Front  | An 8-seat communal table, two 4-seat and four bistro tables; the **Werewolf circle** front left; two **card tables** front right                         |
| Right  | The **Window booth** and **Corner booth** (4 each, facing benches)                                                                                       |

Cat beds, a cat wheel, tiles behind the bar, Edison bulbs, bunting and hanging plants.

**🌙 Starry Rooftop**: a terrace, not a room. The stairwell block is the only wall; the rest is open
behind a parapet, with the city beyond and stars at night.

| Where     | Places                                                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| The block | You come out of the **stairwell door**; the Buddy Machine and **chalk wall** beside it; the **cinema sheet** on its front with floor cushions |
| Left      | Four **picnic desks** (24 seats) under string lights; the **art corner** front left                                                           |
| Middle    | The **campfire circle** (8 log benches) and the **open deck** in front                                                                        |
| Right     | Two **card tables**, the **Werewolf circle**, the **Tent** (back right) and the **Telescope deck** (front right), a hammock                   |

## What owners change (Room settings → Map & look)

Owner only (mods can't). Nobody edits a layout.

- **Template and size**, applied live (below). With people inside the button reads "Save and move
  everyone".
- **Time of day:** Follow the clock (the owner's time zone) / Always day / Always night. The same for
  everyone inside, so the group shares one evening.
- **Thumbnail** (in Overview): a picture for Home, Discover and invites, cropped 16:9, up to 5 MB,
  checked by moderation. Without one, the map's picture is used.
- **Premium maps** (later) need the owner's Plus: same kit, a nicer or rarer place.
- **No colour or sign options:** maps keep Connecta's own colours.
- Battery saver stays each person's own choice.

## Live map changes

Nobody has to leave. Demo: change the map in Room settings while inside, or Demo tab → "Team
publishes a map update".

1. The owner switches, or a team update's 60-second banner ("Cat Café is getting an update") ends.
2. Everyone sees a loading screen ("Moving to Cat Café…") until the new map has loaded.
3. **Keeps going:** voice, Room chat, bubbles, your own timer and music.
4. **Changes:** everyone stands up and lands at the new spawn; screen shares end. Boards and card
   games move to the same kit piece in the new map.
5. If the owner's Plus ends, a Big or premium map moves to its basic version the same way.

## The editor (Connecta team only)

- A top-down grid in metres, one per template and size.
- **Catalog:** Connecta's code-built pieces plus CC0 packs (e.g. Kenney) checked by a developer.
  Nobody uploads models through the editor.
- **Editing:** click to place (Shift for several), drag to move (20 cm snap), R rotates, Delete
  removes, Duplicate.
- **Zones:** private zones and the open floor are named rectangles you drag and resize.
- **Standard-kit check:** a live checklist ("8 / 12 seats", "1 / 2 zones"); **Publish stays off
  until every row passes.**
- **Walk test** opens the draft in a team-only room.
- **Publish** makes a new version; rooms on that template move over live after the 60-second banner.
  Every version is kept, and **Roll back** works the same way.

## Map polish backlog

The launch maps work end to end but aren't finished art. Do this after the feature work, and only
what blocks playtests before the Blender models (which redo most of it):

- **Odd furniture:** fix props that look off at the room camera's angle, by day and night.
- **Overlapping rugs:** areas must not overlap; decor rugs stay clear of activity rugs.
- **More cats in the Cat Café** (beds, shelves, sills, the bar), so it reads as a cat café at a
  glance. Each cat costs ~25–30 draw calls today, so merge cats first
  ([06-3d-room.md](06-3d-room.md#performance)).
- **Name labels overlap** when two people stand together (Mook on the café doormat). Start scripted
  people apart; labels could nudge apart.
- **General pass:** spacing, clear walkways from the door, props clipping into walls, day and night
  lighting balance.

## Art pipeline: code now, Blender later

Props and characters are built in code for speed. The move to **Blender models** starts when the
team decides; nothing waits on it.

- **Why Blender later:** an authored model needs far fewer triangles (a chibi in ~3–5k vs ~19k from
  spheres), arrives as one mesh and material, and can have **lighting baked** in, the biggest win
  left for phones. The cost is download size, so assets are compressed.
- **The rule:** static, artistic things come from Blender (map shells, furniture, characters, hair,
  accessories, the editor's catalog). Runtime and game-state things stay in code (Pick a Side zones,
  the TV picture, cards, the whiteboard surface).
- **Maps:** one compressed GLB per map with baked lighting. Interactive pieces are named in Blender
  (`seat_12`, `spot_tv`, `zone_fireside`) and the code reads seats, spots and zones from those names.
- **Characters:** one interface (`update(dt, pose)`, `group`, `labelHeight`, `dispose`) with a
  code-built and a Blender version, so the switch doesn't touch room code. One rigged body; hair and
  accessories on the head bone; colours from a palette texture; walk, sit, idle and talk clips.
- **Pipeline:** Blender → glTF → `gltf-transform` (meshopt, KTX2, prune) → `gltfjsx` → loaded behind a
  loading screen → `demo:perf`, plus a size budget (map ~2–3 MB, character ~200–300 KB).
- **Order:** maps first (Cat Café proves the pipeline), characters second.

## Backend notes

- **Map file:** JSON per template, size and version: pieces (kind, x, z, rotation), zones, seats,
  spawn. Read by the game server (collisions, seats, zones, A\*) and the client. It replaces V1's
  hard-coded layout in `@study/shared`. The demo's data files are its prototype.
- **Tables:** `map_template` (id, name); `map_version` (template, size, version, file, published by,
  at, live); rooms store `template`, `size`, `time_of_day`, `thumbnail_key`.
- **Look changes** (time of day, thumbnail) reach everyone inside over the gateway, no reload.
- **Live switch:** the game server keeps the Colyseus room and sends `map:changing`; clients show
  the loading screen and fetch the map file. The server swaps collisions, seats, zones and NPC paths,
  stands everyone up at the spawn, carries boards and games over by kit id, then sends `map:ready`.
- **Time of day:** the server sends the room's time zone and mode; each client works out the light.
- **Thumbnails:** presigned S3 upload, then a worker crops to WebP and runs moderation.
- **Kit check:** the same function runs in the editor and on the publish endpoint, so a broken map
  can't go live.
