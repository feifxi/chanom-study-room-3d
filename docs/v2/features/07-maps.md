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

| Kit piece     | Needs                       | Library               | Cat Café             | Starry Rooftop       |
| ------------- | --------------------------- | --------------------- | -------------------- | -------------------- |
| Study spots   | 12+ seats (Cosy), 24+ (Big) | tables, green lamps   | café tables, counter | picnic desks         |
| Lounge        | a corner to hang out        | sofa by the shelves   | beanbags, cat tower  | campfire circle      |
| Private zones | at least 2                  | reading nook, alcove  | window booths        | tent, telescope deck |
| Big screen    | watch together              | projector screen      | TV on the wall       | outdoor cinema sheet |
| Game table    | cards and board games       | round table, 4 stools | card table           | low table with cards |
| Open floor    | 12 m²+ for Pick a Side      | the middle rug        | by the counter       | the open deck        |
| Whiteboard    | draw together               | chalkboard            | menu board           | chalk wall           |
| Buddy Machine | study buddies               | by the door           | by the till          | by the stairs        |
| Nap spots     | where the cats sleep        | sofa cushions         | cat beds, cat tower  | hammocks             |
| Spawn point   | where you walk in           | front door            | door with a bell     | stairwell door       |

## Templates

**Built for launch (3):**

- 📚 **Cosy Library**: quiet focus, rain on the windows. V1's library.
- 🐈 **Cat Café** (replaces "Milk Tea Café"): warm and chatty, a cat on every chair.
- 🌙 **Starry Rooftop** (was "Night Rooftop"): late-night talks under the stars.

**Ideas for later** (same kit, added when there's time): 🌿 Greenhouse, 🥐 Bakery Kitchen,
🍊 Kotatsu House, 🏖️ Beach Hut, 🚀 Space Station.

## Sizes

- **Cosy:** 20 × 14 m, up to **50** people. Every room starts here.
- **Big:** 28 × 18 m, up to **100** people: more seats and a second lounge. Needs the owner's **Plus**.
- Each template has both sizes. People at once is still capped by the owner's plan (Free 25).

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
   and game table: every map has them, thanks to the standard kit.
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
