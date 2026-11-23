# 6. The 3D room

**Status:** decided and built in the demo. In the real app (2026-11-22/23, build step 4, all five parts)
you walk in for real: the game server (`apps/game`) holds who's here, movement, seats, capacity,
live kick, ban, role and map changes, bubbles and typing, Away, Talk to everyone, live looks, and
the people list's actions; proximity voice runs on LiveKit (distance, stereo, the 12 nearest,
private zones, deafen, guest voice, Mute for me and Mute for everyone), and so do screen shares
at a desk and on the TV; the cats and study buddies are the game server's, with the Buddy Machine
and hearts when you pet a cat (part 5). Still to come: activities, focus and the study panel
(step 5); Report stays a mock dialog until feature 14. **Try it:** http://localhost:3000/home → a room → Walk in, in two browsers after
`pnpm dev` (the demo: http://localhost:3100/servers/chanom/rooms/library: click the floor to walk,
step onto the Fireside rug, type a bubble, open 🛡️ Room → Talk to everyone, and Demo tab → "Go away
now"; walk to the pink machine by the door and press E for the Buddy Machine).

Everything V1 had, plus click to walk, stereo voice for crowds, private zones, away, and an
announcement mode for owners and mods. The HUD around the room is in
[01-app-shell.md](01-app-shell.md); the maps are in [07-maps.md](07-maps.md).

## Kept from V1

Walk (WASD or arrows), run (Shift), a joystick on phones (always walks), sit at desks and sofas (E or
tap), screen share to your table once seated (now **with its sound**, heard only by the table, each
with their own volume; see [10-watch-and-photo.md](10-watch-and-photo.md#sound)), proximity voice,
bubbles, cats and study buddies, day and night, battery saver, and "Showing" someone's path from the
people list. Movement is
server-authoritative with client prediction (see `AGENTS.md`, V1 architecture).

## Click to walk

- Click or tap the floor and you walk there around furniture (shared A\*). A pink ring marks the spot.
- Keys or the joystick take over at once. Clicking from a seat stands you up first.
- Dragging turns the camera; a click that moved more than a few pixels doesn't walk.
- Someone in the way stops you instead of pushing forever.
- A click that closes a panel only closes it; the next click walks.
- **On by default** (new players may not know WASD). Off under the dock's ⋯ More or
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
- **Seen from outside:** the zone is a rug with "🔇 Private zone" floating high over its middle like
  a name tag (no zone name; it lights up while you're inside), and people inside show 🔇 by their
  name. The Café and Rooftop still hang a plaque until their own pass.
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
their label and in the people list, and they see "📢 Everyone hears you · Stop". For "Card night
starts in 5 minutes!" or a teacher's announcement.

## Leaving a room

**Nothing inside a room navigates away silently.** Leaving costs your voice, your seat and a running
focus timer, so it must never happen by accident.

- **Leave** on the Room card is the only one-click way out.
- Show things in a panel or overlay rather than linking to another page.
- When a link out is really needed (a guest's Sign up), it asks **"Leave {room}?"** with **Stay** as
  the default. Demo: `LeaveRoomLink` and `useLeaveRoom().ask(href)` in `features/room/LeaveRoom.tsx`.
- Closing or reloading the tab shows the browser's "Leave site?" prompt.
- **Back asks too** (2026-11-22): the browser's Back or a phone's swipe shows the same "Leave
  {room}?" with Stay as the default; Leave room then goes Home (Discover or the front page for
  guests). A copy of the page sits on top of the history so Back lands on it and asks.
- **Can't walk in, or sent out:** a card over the room's picture says why, mood first, with the one
  next step: full (Notify me, Read the chat), removed by a mod, banned, in another tab (Walk in
  here), you walked into another room (Walk back in), the room is gone, or the room can't be
  reached (Try again).

## Cats, study buddies and the Buddy Machine

Every room is a little alive, the same for everyone in it.

- **Resident cats:** each map starts with two: Mochi (calico) napping in the cosiest nap spot, and
  Tofu (orange) by the door. Cats wander, groom, and nap on the map's nap spots (sofas, shelves,
  cat beds).
- **Petting:** walk up to a cat, **E** (or tap the hint) "to pet Tofu 🐾": hearts float up, it purrs
  (or mews sleepily if it was napping) and **follows you for 20 s**, until you sit down. Counts
  toward the "pet a cat" quest.
- **The Buddy Machine** (a pastel capsule-toy machine; where it stands is in
  [07-maps.md](07-maps.md)): walk up and press **E**. Its panel sits beside the machine (the right
  side on a computer, the top on a phone) so you can watch the knob turn and the capsule roll out;
  walking away closes it.
  - **Summon** a cat ("Wanders, naps somewhere cosy, follows you after head pats") or a study buddy
    ("Takes a free desk and focuses with you"), with a count for each. "A capsule is rolling out…",
    then "Nori the calico cat is here ✨"; everyone's machine plays the capsule, and everyone's
    Bubbles log says "✨ Mai summoned a calico cat, Nori!".
  - **In the room** lists every cat and study buddy (coat, napping, or what they're studying), each
    with **Goodbye 👋**: it waves, walks back to the machine and is gone ("👋 Jod said goodbye to
    Tofu").
  - **Nobody owns them:** anyone can summon and anyone can say goodbye, guests too. No "summoned
    by" on the list. The exception is **pets** (cats bought in the Shop): a "Your pets" row brings
    yours out, only you send it home, and it leaves with you
    ([15](15-business-infra.md#pets)).
  - **Limits:** up to 4 cats and 5 study buddies, 9 in all (the resident cats count); one pull
    every 2 s each. Full shows on the button; the machine explains a refusal ("That's plenty of
    cats for one room").
- **Study buddies** sit at a free desk and run 25/5: focus 25 minutes (📖 and their subject on their
  label), then stretch on the open floor for 5. In a quiet room (3 people or fewer) one says hi when
  you walk in; when your focus round ends near one (or at its table) it cheers you on. **Sit in a
  study buddy's seat** and it gives it up ("Oh, take my seat! 😊") and finds another.
- **You walk through cats and study buddies:** they never block a doorway or a rug (2026-11-23).
  They still walk around furniture and each other.
- **They reset with the room:** when the last person leaves, summoned friends go home; the next
  visit starts with the resident cats again. A map switch does the same.

## What resets

When the last person leaves: bubbles, who sat where, drawings and games, and the summoned cats
and study buddies (the resident cats come back). The room itself (name, map,
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
- **Battery saver:** half-detail characters (~1.46M → ~0.42M triangles at 100 people), 1× pixels, no
  shadows, and a **smart frame rate**: 60 fps while you're doing something (walking, or for 1.5 s
  after a drag, touch, wheel or key) and 30 while you're still (sitting, watching, reading), where
  nobody sees the difference. On by default on touch screens. A slow device steps down quietly (no
  toast; the switch is under More): first to battery saver, and only if that's still too slow, to a
  steady 30 fps. Switching it by hand starts fresh. Code: `room3d/quality.ts`, `FrameDriver.tsx`.
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

- **The game server** (`apps/game`, Colyseus 0.18, port 4002, reached at `/game` on the web origin):
  one Colyseus room per Connecta room, matched by the join option `place` (Colyseus reserves
  `roomId` and silently drops it from filters). It never reads the database:
  - **Join ticket:** the web app asks `POST /api/rooms/:id/ticket` (members, and guests while their
    pass lasts; not the banned) for a one-minute HS256 ticket signed with `GAME_SECRET`: account,
    room, name, look, role, capacity and map. `onAuth` checks it.
  - **Capacity:** members and guests are turned away at capacity ("full"); the owner and mods
    always fit (a hard cap of 250 sits above). A leave after someone was turned away publishes
    "space", and the API sends the 🔔 item to everyone who pressed Notify me (`POST
/api/rooms/:id/space`, kept 6 hours).
  - **One of you per room:** a newer connection for the same account takes over; the older one is
    closed with "in another tab". A dropped connection keeps your place for 20 s (the SDK
    reconnects by itself).
  - **One room at a time:** walking into a room tells every game server (`game:walked-in` on
    Redis); any other room you're in closes your connection with "you walked into another room"
    (code 4005), ending a focus round there and counting it. Any number of tabs of the rest of the
    app (Home, chat, DMs) stay fine.
  - **Room changes from the API** go through Redis (`game:rooms`): kick, ban and leaving close your
    connection with a reason (WebSocket codes 4001–4004); a role change shows at once; a new map
    moves everyone to its door; a deleted room sends everyone out.
  - **Presence:** each game connection is a tab of its own (`game:<session>`) that the game server
    reports through Redis (`game:presence`) and the gateway writes, refreshed every minute. Your
    browser tabs still report how active you are (Away), never the room.
  - **Movement:** V1's rules: a refilling speed budget (running speed × 1.6 slack), clamped to the
    map's bounds; sit within reach of a free seat; stand at the seat's stand-up spot; moving stands
    you up. The client predicts and reconciles with `moveSeq` as in V1.
  - **The maps' data** (seats, walls, zones, the door) lives in `packages/shared/src/maps`, so the
    web app and the game server read the same map; the web app adds each map's 3D look.
- **Click to walk** is client-only: it sends the same `move` messages as keys, so the server's speed
  budget and collisions still apply.
- **Zones** come from the map file, shared by the web app and the game server. Zone bubbles go only
  to people inside. **Zone voice is enforced by LiveKit, not hidden:** each client tells LiveKit
  who may receive its voice (people in its zone when it's in one, people outside zones when it's
  not; everyone while talking to everyone), so a tampered client outside can't receive voices from
  inside. LiveKit's server API can't set who receives someone else's track, so this is the
  speaker's own client (2026-11-22, decision log).
- **Voice** (`apps/web/src/features/voice/useVoice.ts`, `apps/game/src/voice.ts`): the game server
  gives each person a pass (`voice` → a 10-minute LiveKit token for the room named after the
  Connecta room, as their session id, so voices match characters). It decides who may talk and
  enforces it with LiveKit's publish permission, live: guests only when Room settings → Guests can
  use voice is on (a change reaches them at once), not while timed out, not while muted for
  everyone. Microphone and screen share only, never cameras. Leaving, a kick or a ban also takes
  you out of LiveKit. Hearing is the client's: volume by distance, stereo panning by where people
  stand on screen, the 12 nearest you can hear, deafen and Mute for me (remembered in this
  browser, by account). Who's talking comes from a small level meter per voice.
- **Mute for everyone** (`mute`): the owner on anyone, a mod on members and guests. It's kept by
  account, so walking out and back in doesn't lift it, until a mod lifts it or the room empties;
  for something that ends by itself there's time out. Everyone sees their mic as off.
- **Desk screen share** (step 4 part 4, 2026-11-22): seated at a desk (not a sofa), **Share screen
  to table**. One share per table at a time; the others' button waits ("… is sharing with your
  table"). People seated at that table watch it in **the same panel as a share on the TV**: big over
  the room, ⤡ to the corner, with the sharer's name, 🔊 or 🔇, their own volume and, for the sharer,
  Stop sharing; 🖥️ shows by the sharer's name for everyone. Standing up ends it. The game server
  holds who shares where (`share` { where: 'tv' | 'table' | '', audio } → the player's `share`,
  'tv' or 'table:<tableId>'): it checks you're on the TV rug or at a desk, allows one per place,
  and ends a share when you leave the spot, stand up, the map changes or you can't talk any more.
  The picture and sound go over LiveKit, and the sharer's client lets only that audience receive
  them (the same enforcement as private zones; `watchesShare` in `@connecta/shared/maps`).
- **Cats and study buddies** (`apps/game/src/npc/`, V1's NpcDirector made map-aware): the game
  server runs them ten times a second in the room's state (`npcs`, synced like players; behaviour
  state stays on the server). Messages: `npc:summon` { kind } (checked: at the machine, the
  cooldown, the limits; a refusal comes back as `npc:refused`), `npc:goodbye` { id }, `npc:pet`
  { id } (within reach). The server sends `npc:summoned` to everyone (the capsule; the NPC appears
  1.8 s later), `npc:said` and `npc:react` (bubbles and hearts, only into a private zone if the NPC
  is in one), and `npc:note` for the Bubbles log. Cats path with the map's A\*; people aren't
  obstacles to them, and the client leaves NPCs out of your collisions. Study buddies also hear
  your status (a focus round ending) and seat claims (`sit`). All in memory: nothing is stored.
- **Browser tests** use a dev-only handle, `window.__connecta` (`goTo(x, z)`, `here()`, `npcs()`
  and `voice`, the LiveKit room), and Chrome's fake microphone (`--use-fake-device-for-media-stream`, still
  with `--mute-audio`).
- **Bubbles** go through the game server (`say`; it sends `said` back): to the whole room, or only
  to the private zone the speaker stands in (unless they're talking to everyone). It trims to 120
  characters, allows one every 0.4 s, and holds back bubbles and typing from someone timed out
  (they get `quiet` with the end time; the ticket carries a time out, and one given while inside
  arrives through Redis). Typing dots clear themselves after 6 s of silence.
- **Away** is decided on the client and sent as a status (with focus and breaks: `status`); the
  server mutes the LiveKit mic too.
- **Talk to everyone** is a server-checked flag (owner or mod; `stage`) that overrides distance and
  zones; going away or losing the role turns it off.
- **Your look** changes live through the server (`look`, at most once every 5 s; guests keep the one
  they picked).
- **The people list** in a real room calls the API (Add friend, Block, time out, make mod, kick,
  ban); the game server applies the result. Send a message shows only for friends (DMs are
  friends-only). A room's game state is gone a second after the last person leaves: seats, bubbles
  and typing start fresh.
- **Voice cap:** each client subscribes to the 12 nearest voices it can hear, re-picked four times a
  second as people move.
