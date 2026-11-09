# 6. The 3D room

Status: decided (2026-11-08). Overview: [`docs/v2-plan.md`](../../v2-plan.md). The HUD around the room:
[`01-app-shell.md`](01-app-shell.md). Chat panels: [`04-chat-and-dms.md`](04-chat-and-dms.md).

Try it: `pnpm --filter @study/demo demo:dev` → http://localhost:3100/servers/chanom/rooms/library.
Click the floor to walk, walk into the purple circle by the sofa, type a bubble, press **Everyone**
(you own Chanom Friends), and Demo tab → "Go away now".

## Already there (V1, kept)

Walk (WASD/arrows), run (Shift), joystick on phones (always walks), sit at desks and on the sofa (E or
tap), screen share to your table once seated, proximity voice, bubbles, cats and study buddies, day
and night, battery saver, the people list path ("Showing" someone). Server-authoritative movement
with client prediction (see the root `CLAUDE.md`).

## Walking: click to walk

- **Click or tap the floor** and you walk there along a path around furniture (the shared A*). A pink
  ring marks where you're going.
- Keys or the joystick take over at once. Clicking from a seat stands you up first.
- Dragging still turns the camera: a click that moved more than a few pixels doesn't count.
- If someone stands in the way, you stop instead of pushing forever.
- **A click that closes a panel only closes it** (like menus everywhere): with a HUD panel open, the
  first click on the room closes it and you don't move; the next click walks. Decided 2026-11-09.
- **On by default on every device** (new players may not know WASD; phones need it). Turn it off in the
  room card's "Your view" or Settings → Controls (which also lists the keys). Saved per browser.

## Proximity voice

- Full volume within **2.5 m**, fading to silent at **9 m** (V1's values).
- **Stereo:** voices come from the left or right, where people stand.
- **At most ~12 voices streamed**, the closest ones. With 100 people a phone can't take 100 audio
  streams, and you couldn't hear past 9 m anyway. (LiveKit: subscribe only to the nearest tracks.)
- Deafen hears nobody and turns the mic off (feature 1). Guests can't talk (feature 2).

## Private zones

Areas built into the map (a reading nook, a booth, a card table). The demo's library has one: the
**Reading nook** around the sofa.

- **Inside:** you hear only the people in the zone, at full volume however far apart. Bubbles said
  inside stay inside. People outside can't hear in, and you can't hear out.
- **On the floor:** a soft purple tint and a dashed edge, so you see where it starts.
- **Inside, a label at the top:** "🔒 🛋️ Reading nook · only people here can hear you".
- **No locks** in v1: anyone can walk in, like a real café table.
- A map can have several; the standard kit asks for at least 2 (feature 7).

## Bubbles

- Up to **120 characters**. **Emoji** from the 🙂 button in the box; there's no separate emotes tool
  (decided 2026-11-09).
- Over your head for **about 6 seconds**, longer for long lines (up to 10 s), then only in the Bubbles tab.
- **Typing dots** over your head while you type one.
- Reach the whole room, except inside a private zone (stays in the zone). Gone when the room empties.

## Away

- **Focusing is never away.** While your focus timer runs you show "📖 Focusing" and your mic stays as
  it was, because people study in other tabs (notes, slides, a PDF). Updated 2026-11-09.
- With no focus timer, after **10 minutes** with no keys, clicks, wheel or movement: **💤** on your label, the label fades,
  the people list says "Away", and your **mic turns off** (so a forgotten tab doesn't broadcast your
  room). "Talk to everyone" stops too.
- Any input brings you back ("Welcome back ✨"). The mic stays off until you turn it on.
- Demo: Demo tab → "Go away now" skips the wait.

## Talk to everyone

- **Owner and mods** find it under **🛡️ Room** (Room tools) at the end of the dock: an admin tool
  for announcements. Members never see the button (decided 2026-11-09).
- While it's on, everyone in the room hears them at full volume wherever they stand, even inside
  private zones. Turning it on turns the mic on.
- While on, the dock button turns **pink with a pulsing ring and reads "On air"** (not just the
  lighter "pressed" look of other buttons), a 📢 shows on their label and "📢 Talking to everyone" in
  the people list, and they see a "📢 Everyone hears you · Stop" bar at the top.
- For "Werewolf starts in 5 minutes!" or a teacher's announcement (Gather's "spotlight").

## Leaving a room

Decided 2026-11-09, after a "My focus" link in the Study panel would have dropped people out of the room.

- **Nothing inside a room navigates away silently.** Leaving costs you voice, your seat and a running
  focus timer, so it should never happen by accident.
- The **Leave** button (room card) is the only one-click way out.
- Avoid links to other pages in the room HUD. Show the thing in a panel or overlay instead (as chats and
  DMs do), or keep it on the 2D pages only.
- When a link out is really needed (e.g. a guest's "Sign up"), it asks first: **"Leave {room}?"**,
  "You'll stop hearing people nearby and lose your seat, and your focus timer stops (the minutes so far
  still count)". **Stay** is the default button. Demo: `features/room/LeaveRoom.tsx` (`LeaveRoomLink`,
  `useLeaveRoom().ask(href)`).
- Closing or reloading the tab shows the browser's "Leave site?" prompt.
- Not covered yet: the browser Back button. In the real app the room connection should live above the
  routes, so Back keeps you connected (like browsing chats) instead of asking.

## Performance

Decided 2026-11-09: performance is checked now, while features are added, not at the end.

**Budget per frame** (`demo/src/features/room3d/perf.ts`): the map's share plus each person's.

| Per frame  | Map's share | Each person                   |
| ---------- | ----------- | ----------------------------- |
| Draw calls | 120         | 6                             |
| Triangles  | 150k        | 20k (battery saver: about 4k) |
| Textures   | 32          | 1 (bone data)                 |
| Our JS     | 8 ms total  |                               |
| Shaders    | 40 total    |                               |

**Done in the demo:**

- **Characters are merged into skinned meshes** (`avatar/skin.ts`): the ~80 small parts become about
  4 meshes per person (toon, plain, see-through, outline), with colours stored per vertex and the
  moving parts as bones. Same look and animation. 100 people: draw calls 3,530 → ~480, our JS per
  frame 17 ms → 2.6 ms. Everyone shares the same 4 materials.
- **Battery saver builds lower-detail characters** (half the segments): 100 people drop from ~1.46M
  to ~0.42M triangles, with outlines still lined up. Battery saver also caps at 30 fps, 1× pixels, no
  shadows; it's on by default on touch screens.
- **Slow devices switch themselves to battery saver** once, with a toast ("…turn it off in the room
  card").
- **Performance overlay** (Demo tab → 📈, or `?perf`): fps, our JS per frame, worst frame, draw
  calls, triangles, textures, shaders, against the budget; red when over.
- **The Demo tab's crowd (50 / 100) now walks around in 3D**, so the overlay shows a real full room.
- **`pnpm --filter @study/demo demo:perf`**: loads the room with 0, 50 and 100 extra people, smooth and
  battery saver, and fails when a frame goes over budget (fps is printed but not checked: a headless
  browser says little about a phone).

Measured on a Mac in headless Chrome (2026-11-09):

| Mode          | People | fps | JS ms | Draw calls | Triangles |
| ------------- | ------ | --- | ----- | ---------- | --------- |
| Smooth        | 6      | 58  | 1.8   | 135        | 90k       |
| Smooth        | 102    | 50  | 2.6   | 479        | 1,463k    |
| Battery saver | 102    | 30  | 3.3   | 502        | 421k      |

**Next, with the real maps** (each one is checked against the budget):

- **Baked lighting** for the map's furniture (light maps), so phones need no live shadows; time of
  day becomes a tint. The biggest win left.
- **Instanced props** (chairs, books, plants drawn once each) and compressed assets (meshopt models,
  KTX2 textures).
- **Full detail for the ~30 people nearest you**, lower detail beyond; name labels only nearby.
- **The map editor's budget check**: publishing renders the map headless and reads its draw calls
  and triangles, like the standard-kit check. Over budget, Publish stays off.
- Test on a mid-range Android phone before launch.

## What resets

When the last person leaves: bubbles, who sat where, drawings and games. The room itself (name, map,
settings, members, Room chat) stays (plan, "What persists").

## Backend notes

- **Click to walk** is client-only: the driver follows the path and sends the same `move` messages
  as keys, so the server's speed budget and collisions still apply.
- **Zones** come from the map file (feature 7). The game server knows who's in which zone and tells
  LiveKit who may hear whom (track subscription permissions), so it's enforced, not just hidden;
  bubbles from inside a zone are only sent to people in it.
- **Away** is decided on the client and sent as a status; the server mutes the LiveKit track too.
- **Talk to everyone** is a server-checked flag (owner or mod) that overrides distance and zones for
  that speaker's track.
- **Voice cap:** each client subscribes to the ~12 nearest speaking tracks; re-picked as people move.
