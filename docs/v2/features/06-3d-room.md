# 6. The 3D room

**Status:** decided and built in the demo. **Try it:**
http://localhost:3100/servers/chanom/rooms/library: click the floor to walk, step onto the Fireside
rug, type a bubble, open 🛡️ Room → Talk to everyone, and Demo tab → "Go away now".

Everything V1 had, plus click to walk, stereo voice for crowds, private zones, away, and an
announcement mode for owners and mods. The HUD around the room is in
[01-app-shell.md](01-app-shell.md); the maps are in [07-maps.md](07-maps.md).

## Kept from V1

Walk (WASD or arrows), run (Shift), a joystick on phones (always walks), sit at desks and sofas (E or
tap), screen share to your table once seated, proximity voice, bubbles, cats and study buddies, day
and night, battery saver, and "Showing" someone's path from the people list. Movement is
server-authoritative with client prediction (see `AGENTS.md`, V1 architecture).

## Click to walk

- Click or tap the floor and you walk there around furniture (shared A\*). A pink ring marks the spot.
- Keys or the joystick take over at once. Clicking from a seat stands you up first.
- Dragging turns the camera; a click that moved more than a few pixels doesn't walk.
- Someone in the way stops you instead of pushing forever.
- A click that closes a panel only closes it; the next click walks.
- **On by default** (new players may not know WASD). Off in the Room card's Your settings or
  Settings → Controls. Saved per browser.

## Proximity voice

- Full volume within **2.5 m**, silent at **9 m**, in **stereo** (voices come from where people stand).
- **At most ~12 voices streamed**, the closest: a phone can't take 100 streams, and you can't hear
  past 9 m anyway.
- Deafen hears nobody and turns the mic off. Guests listen only, unless the room lets them talk.

## Private zones

Areas built into each map, at least 2 per map: the library's **Fireside** and **Window booth**, the
café's two booths, the rooftop's **Tent** and **Telescope deck**.

- **Inside** you hear only people in the zone, at full volume however far apart, and bubbles stay
  inside. Nobody outside hears in; you can't hear out.
- **Seen from outside:** the zone is a rug with a hanging sign ("🔥 Fireside · private"), and people
  inside show 🔇 by their name.
- **Seen from inside:** "🔒 🔥 Fireside · only people here can hear you" at the top.
- **No locks:** anyone can walk in, like a real café table.

## Bubbles

- Up to **120 characters**, emoji from the 🙂 button (no separate emotes).
- Over your head for about 6 seconds (up to 10 for long lines), then only in the Bubbles tab.
- Typing dots while you type. Reach the whole room, except from inside a private zone.

## Away

- **Focusing is never away:** while your timer runs you show "📖 Focusing", since people study in
  other tabs.
- Otherwise, after **10 minutes** without input: 💤 on your label, "Away" in the people list, and
  your **mic turns off** (a forgotten tab shouldn't broadcast your room). Talk to everyone stops too.
- Any input brings you back ("Welcome back ✨"); the mic stays off until you turn it on.

## Talk to everyone

An announcement tool for owners and mods, under **🛡️ Room** in the dock; members never see it.
While it's on, everyone hears them at full volume wherever they stand, even in private zones, and
the mic turns on. The button turns pink with a pulsing ring and reads **On air**, a 📢 shows on
their label and in the people list, and they see "📢 Everyone hears you · Stop". For "Werewolf
starts in 5 minutes!" or a teacher's announcement.

## Leaving a room

**Nothing inside a room navigates away silently.** Leaving costs your voice, your seat and a running
focus timer, so it must never happen by accident.

- **Leave** on the Room card is the only one-click way out.
- Show things in a panel or overlay rather than linking to another page.
- When a link out is really needed (a guest's Sign up), it asks **"Leave {room}?"** with **Stay** as
  the default. Demo: `LeaveRoomLink` and `useLeaveRoom().ask(href)` in `features/room/LeaveRoom.tsx`.
- Closing or reloading the tab shows the browser's "Leave site?" prompt.
- **Not covered yet:** the browser Back button. In the real app the room connection should live
  above the routes, so Back keeps you connected.

## What resets

When the last person leaves: bubbles, who sat where, drawings and games. The room itself (name, map,
settings, members, Room chat) stays.

## Performance

Checked while features are built, not at the end.

**Budget per frame** (`demo/src/features/room3d/perf.ts`):

| Per frame  | Map's share | Each person                   |
| ---------- | ----------- | ----------------------------- |
| Draw calls | 130         | 6                             |
| Triangles  | 150k        | 20k (battery saver: about 4k) |
| Textures   | 32          | 1 (bone data)                 |
| Our JS     | 8 ms total  |                               |
| Shaders    | 40 total    |                               |

**What keeps it there:**

- **Characters are merged into skinned meshes** (`avatar/skin.ts`): ~80 parts become ~4 meshes per
  person sharing 4 materials. At 100 people: draw calls 3,530 → ~480, JS 17 ms → 2.6 ms.
- **Furniture merges into a few batches** (`room3d/StaticBatch.tsx`), colours stored per vertex: about
  8 draw calls for a whole map. Repeated small things (books, bulbs, flames, stars) are instanced.
- **Battery saver:** half-detail characters (~1.46M → ~0.42M triangles at 100 people), 30 fps, 1×
  pixels, no shadows. On by default on touch screens; slow devices switch to it once, with a toast.
- **Tools:** the overlay (Demo tab → 📈, or `?perf`) and `demo:perf`, which loads **every map zoomed
  all the way out** (the worst case) with 0, 50 and 100 extra people, smooth and battery saver, and
  fails over budget. `MAPS=cafe` runs one map.

**Latest numbers** (headless Chrome on a Mac, zoomed out, 2026-11-10):

| Map            | Draw calls, ~6 people | Draw calls, ~100 people | Triangles, ~6 people |
| -------------- | --------------------- | ----------------------- | -------------------- |
| Library        | 122 / 166             | 602 / 742               | 121k                 |
| Cat Café       | 121 / 166             | 601 / 742               | 134k                 |
| Starry Rooftop | 117 / 160             | 602 / 742               | 118k                 |

At ~100 people, triangles peak near 2.0M of the 2.19M budget (smooth mode); battery saver stays
under 0.6M.

**Next:**

- **Cats** are the biggest map cost left (~25–30 draw calls each). Merge them like the characters
  before adding more.
- **Baked lighting** with the Blender maps, so phones need no live shadows. The biggest win left.
- **Full detail for the ~30 nearest people**, lower beyond; name labels only nearby.
- **The map editor's budget check:** publishing renders the map and Publish stays off over budget.
- Test on a mid-range Android phone before launch.

## Backend notes

- **Click to walk** is client-only: it sends the same `move` messages as keys, so the server's speed
  budget and collisions still apply.
- **Zones** come from the map file. The game server knows who's in which zone and sets LiveKit
  subscription permissions, so privacy is enforced, not just hidden; zone bubbles go only to people
  inside.
- **Away** is decided on the client and sent as a status; the server mutes the LiveKit track too.
- **Talk to everyone** is a server-checked flag (owner or mod) that overrides distance and zones.
- **Voice cap:** each client subscribes to the ~12 nearest speaking tracks, re-picked as people move.
