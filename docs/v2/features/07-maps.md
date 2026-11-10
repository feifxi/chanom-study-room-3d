# 7. Map templates and the editor

Status: decided (2026-11-08). Overview: [`docs/v2-plan.md`](../../v2-plan.md) ("Maps"). The room
itself: [`06-3d-room.md`](06-3d-room.md).

Try it: `pnpm --filter @study/demo demo:dev`, then:

- http://localhost:3100/home: **Make a room**.
- http://localhost:3100/servers/chanom/rooms/library: room card (top left) → Settings → Map & look.
  Choose Always
  night and Save. The room changes live.
- http://localhost:3100/admin/maps: the editor. The Cat Café draft is missing a big screen and a
  second private zone, so Publish is off until you add them.

## One rule: every map can do everything

Every template has the **same standard kit**. Only the place, the props and the theme differ, so
whichever map a room picks, every activity works there.

| Kit piece     | Needs                       | Library                | Cat Café             | Starry Rooftop       |
| ------------- | --------------------------- | ---------------------- | -------------------- | -------------------- |
| Study spots   | 12+ seats (Cosy), 24+ (Big) | 4-seat + long tables   | café tables, counter | picnic desks         |
| Lounge        | a corner to hang out        | TV lounge, sofa, bags  | beanbags, cat tower  | campfire circle      |
| Private zones | at least 2                  | fireside, window booth | window booths        | tent, telescope deck |
| Big screen    | watch together              | TV on a console        | TV on the wall       | outdoor cinema sheet |
| Card table    | card games                  | 2 oak tables, 4 stools | card table           | low table with cards |
| Open floor    | 12 m²+ for Pick a Side      | the four-colour rug    | by the counter       | the open deck        |
| Whiteboard    | draw together               | board in an oak frame  | menu board           | chalk wall           |
| Buddy Machine | study buddies               | by the door            | by the till          | by the stairs        |
| Nap spots     | where the cats sleep        | hearth, shelf, sofa    | cat beds, cat tower  | hammocks             |
| Spawn point   | where you walk in           | front door             | door with a bell     | stairwell door       |

## Templates

**Built for launch (3):**

- 📚 **Cosy Library**: quiet focus, rain on the windows. V1's library.
- 🐈 **Cat Café** (replaces "Milk Tea Café"): warm and chatty, a cat on every chair.
- 🌙 **Starry Rooftop** (was "Night Rooftop"): late-night talks under the stars.

**Ideas for later** (same kit, added when there's time): 🌿 Greenhouse, 🥐 Bakery Kitchen,
🍊 Kotatsu House, 🏖️ Beach Hut, 🚀 Space Station.

**Every map keeps every activity, the library too** (decided 2026-11-09). A "study-only library" was
considered and dropped: the library stays fully functional. **Redesigned 2026-11-10** so every kit
piece has a place of its own (see "The library's layout" below). **Cat Café and Starry Rooftop are the
next maps built**, no new templates. Every map must fit the performance budget ([06-3d-room.md](06-3d-room.md#performance)).

## Sizes

- **Cosy:** 26 × 18 m, up to **50** people. Every room starts here. (Was 20 × 14 until the library's
  redesign; long tables, a TV lounge and two private zones didn't fit.)
- **Big:** about 34 × 24 m, up to **100** people: a third long table, a second lounge, a third card
  table. Needs the owner's **Plus**.
- Each template has both sizes. People at once is still capped by the owner's plan (Free 25).

## The library's layout (redesigned 2026-11-10)

The rules, which every map follows:

- **Quiet at the back, loud at the front.** Study under the shelves, farthest from the door; games
  and talking near the door and along one side; private zones tucked into walls.
- **The rug is the area.** Every activity spot and private zone is a rug on the floor, square where the
  thing has sides, round only where the game is a circle (Werewolf). No floating rings: stepping onto a
  rug flashes its edge for a second; a spot that is gathering or playing keeps a glowing edge.
- **Private zones show three cues:** a hanging sign ("🔥 Fireside · private"), a HUD pill when you're
  inside, and a 🔇 on people inside seen from outside.

Bands, back to front (`demo/src/features/map/library.ts` has the numbers):

| Band  | Places                                                                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Back  | Study block: 4 small tables (16 seats) + a 10-seat and an 8-seat long table under the arched window; the **Window booth** (private, bench for 4) in the bay                                            |
| Left  | Whiteboard in an oak frame over a 3.2 m rug; the **Fireside** (private: fireplace, two armchairs, loveseat); the **TV lounge** (TV on a console, L sofa, beanbags, cushions)                           |
| Front | The **open floor**: a 6 × 5.4 m four-colour rug cut like Pick a Side's zones; the door with its mat, tea cart, coat stand and the Buddy Machine                                                        |
| Right | Two **card tables** (oak, felt inlay, pendant lamps); the **Werewolf circle** (12 cushions round a lantern table, lanterns above); the **art corner** (4 easels, paint cart, a folding gallery screen) |

75 places to sit for a room capped at 50. The second card table's stools are ordinary seats until
feature 12 runs one game per table.

## The Cat Café's layout (built 2026-11-10)

**Every map has its own layout** (decided 2026-11-10, for variety): the door, the games and the open
floor move from map to map, not only the props. Same footprint and kit as the library
(`demo/src/features/map/cafe.ts`):

| Where  | Places                                                                                                                                                                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Back   | The **bar** along the back wall, left of centre: 7 stools (a study spot with a shared screen), pastry case, coffee machine, till, the Buddy Machine by the till, cups and syrups on the back bar, a chalk menu above; the **menu board** (the whiteboard) on the back wall beside it; the **art corner** in the back-right corner under a **cat photo wall** |
| Left   | A glass front: the **TV lounge** in the back-left corner by the window (TV on the back wall, beanbags, cushions, the cat tower), the 6-stool **window bar**, then the **door with a bell** in the glass (you come in from the side), umbrella stand and chalk A-board                                                                                        |
| Middle | The **open floor** is the dance floor right in front of the bar (paw-print rug)                                                                                                                                                                                                                                                                              |
| Front  | Tables in clusters: an 8-seat communal table, two 4-seat tables, four bistro tables (37 study seats with the bars); the **Werewolf circle** front left, two **card tables** front right                                                                                                                                                                      |
| Right  | The **Window booth** and **Corner booth** (private, 4 each, facing benches) stacked along the right side                                                                                                                                                                                                                                                     |

Cats: cat beds by the window bar, the bar and the booths, a cat wheel, and nap spots on the window
bar, the cat tower and a booth bench. Decor: cream-and-mint tiles behind the bar, peach wainscot,
Edison bulbs over the counter, bunting, hanging plants in the windows.

## The Starry Rooftop's layout (built 2026-11-10)

A terrace, not a room (`demo/src/features/map/rooftop.ts`): the **stairwell block** in the back-left
corner is the only solid wall, everything else is open behind a parapet and railings with the city
beyond and stars overhead at night.

| Where     | Places                                                                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The block | You come out of the **stairwell door**; the **Buddy Machine** and the **chalk wall** (the whiteboard) are beside it; the **outdoor cinema sheet** hangs on its front, with floor cushions on a mat in front (watch together)                           |
| Left      | Four **picnic desks** (24 seats, benches, laptops) on decking under string lights; the **art corner** front left                                                                                                                                       |
| Middle    | The **campfire circle**: a stone fire pit, eight log benches (the lounge); the **open deck** (four-colour decking) in front                                                                                                                            |
| Right     | Two **card tables** by the chalk wall, the **Werewolf circle**, the **tent** (private, bell tent with four cushions) in the back-right corner, the **telescope deck** (private, raised platform, deck chairs, bench, telescope) front right, a hammock |

Nap spots: the hammock, the parapet, inside the tent, by the fire, a Werewolf cushion. Decor: planters along the parapet, lanterns on the ground, string-light posts, a water tank and an AC unit on the block's roof, lit windows in the city blocks and stars (night only).

**How maps are wired (demo):** each map is a data file (`features/map/<id>.ts`) that builds a `MapData` (room, bounds, spawn, seats, obstacles, zones, kit places, navigator) plus a scene component; `features/map/active.ts` pairs them and the room sets the active map from its look, so a live map change swaps seats, paths, areas and the scene together. All three launch templates are built; an unknown template falls back to the library.

## Map polish backlog (noted 2026-11-10, do later)

The three launch maps work end to end but are not finished art. The user reviewed them and asked to
note these for a later pass, after the feature work:

- **Odd furniture.** Some props read strangely at the room camera's angle or scale. Walk each map in
  daylight and at night and fix shapes, sizes and colours that look off.
- **Overlapping carpets.** Some rugs (activity areas, zone rugs, decor rugs) overlap or touch.
  Areas must not overlap each other, and decor rugs should sit clear of activity rugs.
- **More cats in the Cat Café.** It needs more resident cats lying around (beds, shelves, window
  sills, the bar) so it reads as a cat café at a glance. Each cat costs ~25–30 draw calls today, so merge
  cats into skinned meshes first ([06-3d-room.md](06-3d-room.md#performance)).
- **Name labels overlap** when two people stand on the same spot (seen with Mook on the café
  doormat). Scripted people should start apart, and labels could nudge apart.
- **General pass on every map:** spacing between groups, clear walkways from the door, props
  clipping into walls or each other, lighting balance between day and night.
- When the Blender pipeline starts ([Art pipeline](#art-pipeline-code-now-blender-later)), most of
  this is redone as models anyway, so fix only what blocks playtests before then.

## What the owner can change (Settings → Map & look)

Only the owner can change these (mods can't, feature 3). Picking a template and dressing it up is all
an owner can do. Nobody edits the layout.

- **Template and size**, applied **live** (see "Live map changes" below). With people inside, the
  notice says what happens and the button reads "Save and move everyone".
- **Premium maps** (later) need the owner's Plus. They have the same standard kit; only the place is
  nicer or rarer.
- **No colour or sign options** (tried in the demo, didn't look good): every map keeps the
  platform's own colours.
- **Time of day:** Follow the clock / Always day / Always night. It's **the room's choice, the same
  for everyone inside**, so the whole group sits in the same evening. "Follow the clock" uses the
  room's time zone (the owner's, from their settings). It lives only in Settings; the room card no
  longer has a day/night switch.
- **Battery saver** stays each person's own choice (it's about their device).
- **Thumbnail:** an uploaded picture for Home, Discover and invites. It's cropped to 16:9, can be up
  to 5 MB, and is checked by moderation before it shows. Without one, the map's picture is used.
- Time of day shows up for everyone right away (no reload). Only a template or size
  change waits for the room to empty.

## The editor (Connecta team only)

Owners never see it. It sits behind the admin sign-in.

- **A top-down grid** in metres, one per template and size.
- **Catalog:** V1's code-built pieces plus **CC0 packs** (Kenney Furniture Kit, Quaternius-style cosy
  packs) for now. A developer adds a new pack after checking its licence and size. The editor can't
  upload models.
- **Editing:**
  - Pick a piece, then click the floor. Shift-click places several.
  - Drag to move; it snaps to 20 cm.
  - R rotates, Delete removes.
  - There's also a Duplicate button.
- **Zones:** private zones and open floor are rectangles you can drag and resize, with a name. They
  feed feature 6's private voice and the activities.
- **Standard-kit check:** a live checklist like "8 / 12 seats" or "1 / 2 zones". **Publish stays off
  until every row passes.**
- **Walk test:** opens the draft in a test room only the team can see.
- **Publish** makes a new version. Rooms using that template get a 60-second banner, then move over
  live. Every version is kept, and **Roll back** makes an old one live again the same way.

## Live map changes

Nobody has to leave the room (decided 2026-11-09). Demo: change the map in Settings while inside,
or Demo tab → "Team publishes a map update".

1. **Owner switches** (or, for a team update, a 60-second banner "Cat Café is getting an update ·
   moving in 59s" ends).
2. **Loading screen** for everyone: the new map's picture, "Moving to Cat Café…", a bar. It stays
   up until the new map has loaded (2–3 s).
3. **What keeps going:** voice (the LiveKit room doesn't change), Room chat, bubbles, your own
   Pomodoro and music.
4. **What changes:** everyone stands up and lands around the new map's spawn point; screen shares
   end (they belong to a desk). Whiteboard drawings and card games move to the new map's whiteboard
   and card table: every map has them, thanks to the standard kit.
5. If the owner's Plus ends, a Big or premium map moves to its basic version the same way.

## Backend notes

- **Map file:** JSON per template, size and version.
  - Contents: pieces (kind, x, z, rotation), zones (name, kind, rect), seats, spawn.
  - It's read by the game server (collisions, seats, zones, A*) and by the client (what to draw).
  - It replaces today's hard-coded layout in `@study/shared`.
- **Tables:**
  - `map_template` (id, name)
  - `map_version` (template, size, version, file, published by, at, live flag)
  - Rooms store `template`, `size`, `time_of_day` and `thumbnail_key`
- **Look changes** (time of day, thumbnail) go to everyone inside over the gateway, with no reload.
- **Live switch:** the game server keeps the Colyseus room and sends `map:changing` (map, version);
  clients show the loading screen and fetch the map file. The server swaps collisions, seats, zones
  and NPC paths, stands everyone up, moves them to the spawn ring, carries boards and games over by
  kit id, then sends `map:ready`. Clients that loaded first wait behind the loading screen.
- **Time of day:** the server sends the room's time zone and mode, and each client works out the light.
- **Thumbnails:** uploaded like chat pictures (presigned S3 URL), then a worker crops them to WebP
  and runs moderation.
- **Kit check:** the same function runs in the editor and on the server's publish endpoint, so a
  broken map can't go live.

## Art pipeline: code now, Blender later

Decided 2026-11-09: props and characters stay **built in code** for fast development. The move to
**Blender models** happens when the user is ready; nothing waits on it.

- **Why Blender later:** performance depends on what reaches the GPU (draw calls, triangles,
  materials, textures), not on where a shape came from. But an authored model needs far fewer
  triangles for the same look (a chibi in ~3–5k vs ~19k built from spheres), arrives as one mesh with
  one material, and can have its **lighting baked** into the texture, the biggest win left for phones.
  The cost is download size, so assets are compressed.
- **The rule:** static and artistic things come from Blender (map shells, furniture, characters, hair,
  accessories, the editor's catalog). Things that change at runtime or show game state stay in code
  (activity rings, Pick a Side zones, the TV picture, cards, the whiteboard surface, placeholders).
- **Maps:** one compressed GLB per map with baked lighting. Interactive pieces are named in Blender
  (`seat_12`, `spot_tv`, `zone_nook`) and the code reads seats, spots and zones from those names, so
  the map file and the standard-kit check come from the model.
- **Characters:** one interface (`update(dt, pose)`, `group`, `labelHeight`, `dispose`) with two
  versions, today's code-built one and a Blender one, so the switch doesn't touch the room code. One
  rigged body; hair and accessories on the head bone; colours from a small palette texture so they
  stay customisable; walk, sit, idle and talk as animation clips.
- **Pipeline:** Blender → glTF → `gltf-transform` (meshopt, KTX2, prune) → `gltfjsx` typed components →
  load behind a loading screen → `demo:perf` checks the frame budget, plus a size budget (a map about
  2–3 MB, a character about 200–300 KB).
- **Order:** maps first (Cat Café proves the pipeline, then the library's rework), characters second
  (they need the customisation system designed).
- What the popular three.js games do (Bruno Simon's portfolio, Messenger by Abeto, Krunker): few draw
  calls, shared materials, one skinned mesh per character, fake shadows, baked lighting, instancing,
  compressed assets, LOD. We have the first four; the rest come with the real maps
  ([06-3d-room.md](06-3d-room.md#performance)).
