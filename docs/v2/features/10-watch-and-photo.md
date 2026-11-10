# 10. Watch together and photo mode

**Status:** decided and built in the demo. **Try it:** http://localhost:3100/servers/chanom/rooms/library

- Activities → Watch together → **Go there**, press **E**, paste a YouTube link (e.g.
  `https://youtu.be/lTRiuFIWV54`). Click outside the panel to shrink it; click the small player to
  grow it.
- Demo tab → **Someone puts a video on the big screen**, to see the 3D screen from across the room.
- Dock → **Photo**.

Watch YouTube in sync with whoever stands in front of the big screen, and take photos anywhere.
There's no jukebox: music is personal lo-fi, and YouTube music plays through the big screen.

## 📺 Watch together

A **drop-in** activity at the **Big screen** spot: every map has one, in a cosy corner (the
library's TV lounge, the café's lounge, the rooftop's cinema sheet with floor cushions).

### How it works

1. Walk up (or **Go there**) and press **E**: "Put something on" → paste a **YouTube link** (Shorts,
   live streams and `youtu.be` links work). It plays at once.
2. **Being in front of the screen is watching.** Step into the area and the big panel opens, in sync;
   step out and it closes. The big panel is like Discord's activity view: the video takes most of the
   screen, with Now playing and Up next beside it (below it on narrow screens). No lobby, no rounds, nobody is "out".
3. The **3D screen** shows the video's thumbnail and glows (dimmer when paused), so people walking past
   see what's on. The video itself plays only in the panel.
4. When nobody has been watching for 30 s, the screen turns off and the queue clears.

### Controls

- **Anyone watching controls everything:** play/pause, seek, skip, add to the queue, remove from it.
  It's your room; mods can kick anyone who's a pain.
- **Up next:** anyone adds a link; videos play in order; skip or the end of a video plays the next.
- **Big ↔ small:** a click anywhere outside the panel (the room, the chat) shrinks it to a small player
  in the bottom-right corner; that click doesn't walk you. Clicking the small player's picture makes
  it big again. ⤡ / ⤢ do the same. The small player keeps play/pause and skip, stays in sync, and you
  stay in the area.
- The top strip (the same one every activity has): "📺 Watch together · 3 watching · Leave".
- **YouTube only.** TikTok and Instagram embeds can't be synced. **Paste, no search:** YouTube's free
  search quota is about 100 searches a day for the whole app.

### Sound

- Only people watching hear the video.
- **The video keeps its volume while people talk** (no Discord-style ducking).
- **Your own TV volume:** a speaker button (mute) and slider in the panel's controls. Only you hear the
  change; it's remembered in this browser.
- **Your lo-fi fades while you watch**: Settings → Voice & sound → "Fade my music while I watch" (on).
- If the browser blocks sound before a click, the panel shows "▶ Tap to watch with sound".

### Sync (for the backend)

- The server keeps `{ videoId, offset, startedAt, paused }`: where the video was at `startedAt`. Every
  player seeks back in line when it's more than 2 s off. Play/pause/seek set a new offset and time.
- The first player to report "ended" moves the queue on (the server ignores reports for an old video).
- Titles come from YouTube's oEmbed (free, no key).

## 📸 Photo mode

A **dock button**, from anywhere, any time.

- The HUD and **name labels hide** (photos never show names), and a frame with the logo, room name and
  date appears. You can still drag and zoom the camera.
- **Snap now**, or turn on the **3 s timer** to get into the shot. Others see 📸 over your head so they
  can pose.
- Frames: White, Strawberry, Cocoa; more from the Shop's "Photo frames".
- After the snap: **Save** (PNG download), **Share** (posts it to Room chat), **Copy** (clipboard).
- **Connecta keeps nothing.** No gallery, no album; you keep your own photos. Sharing to Room chat keeps
  it there, like any picture (feature 4's limits).

## Backend notes

- Watch together runs in the Colyseus room as a drop-in activity (feature 9): the small sync state
  above, broadcast on change. No video goes through our servers.
- Photo mode is client-only; sharing is a normal Room chat image upload.
- Cost: nothing new beyond Room chat images.

## Not now

- Other video platforms, search, playlists, "watch party" invites.
- Photo gallery, stickers and filters, group-pose emotes.
