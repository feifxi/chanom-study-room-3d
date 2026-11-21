# 10. Watch together and photo mode

**Status:** decided and built in the demo. **Try it:** http://localhost:3100/servers/chanom/rooms/library

- Activities → Watch together → **Go there**, click the orange **Put something on**, paste a YouTube link (e.g.
  `https://youtu.be/lTRiuFIWV54`). Click outside the panel to shrink it; click the small player to
  grow it.
- Demo tab → **Someone puts a video on the big screen**, to see the 3D screen from across the room.
- At the TV, **Put something on → Share your screen** (desktop Chrome or Edge; tick "Share tab
  audio" for sound). Demo tab → **Someone shares their screen on the TV** shows someone else's share
  (a pretend picture in the demo).
- Dock → **⋯ More** → **Photo mode**.

Watch YouTube in sync with whoever stands in front of the big screen, or share your screen on it, and
take photos anywhere.
There's no jukebox: music is personal lo-fi, and YouTube music plays through the big screen.

## 📺 Watch together

A **drop-in** activity at the **Big screen** spot: every map has one, in a cosy corner (the
library's TV lounge, the café's lounge, the rooftop's cinema sheet with floor cushions).

### How it works

1. Walk up (or **Go there**): anyone in the zone, standing or on the sofa, gets the orange **Put
   something on** button (click or tap only, never E: at the lounge **E always means the sofa**) →
   paste a **YouTube link** (Shorts, live streams and `youtu.be` links work). It plays at once.
   **No top strip, no Leave, no End** (like the whiteboard): walking away stops your watching, skip
   moves Up next on, and the screen turns off by itself once everyone has left. Stopping something
   unsuitable is a moderation tool.
2. **Being in front of the screen is watching.** Step into the area and the big panel opens, in sync;
   step out and it closes. The big panel is a **theater**, like Discord's activity view: it fills the
   screen above the dock, the room dims behind it, and everything else (room
   card, tools rail, people, invites, chat panel, zoom, joystick, hints) steps aside until it shrinks.
   Beside the video (below it on narrow screens): Now playing and **Up next**. It opens with the chat
   closed, like every theater; **Chat** opens it beside the player, which moves over (on phones, the
   usual chat sheet). No lobby, no rounds, nobody is "out".
3. The **3D screen** shows the video's thumbnail and glows (dimmer when paused), so people walking past
   see what's on. The video itself plays only in the panel.
4. When nobody has been watching for 30 s, the screen turns off and the queue clears.

### Share your screen on the TV

- "Put something on" has two choices: **paste a YouTube link** or **Share your screen**. The panel's
  Up next has the share button too.
- **One thing on the screen at a time. A share takes over:** a playing video pauses and carries on
  when the share ends; videos added during a share wait in Up next. Only one person shares at once.
- Everyone in the area watches it in the same big panel, with the sharer's name and "🔊 with sound"
  or "🔇 no sound". The sharer sees their own screen (muted, so no echo) and **Stop sharing**.
- **Walking off the rug ends your share**, like standing up from a desk share. The browser's own
  "Stop sharing" bar ends it too.
- **The 3D screen shows a card** ("Jod is sharing · step onto the rug to watch"), never the live
  picture: a video texture would cost frame time and data for the whole room, including people who
  aren't watching (the same reason the video shows only its thumbnail).
- **Phones can't share** (browsers don't allow it): the button is greyed out with "Phones can't share
  their screen. You can still watch." Phones watch as usual.

### Controls

- **Anyone watching controls everything:** play/pause, seek, skip, add to the queue, remove from it.
  It's your room; mods can kick anyone who's a pain.
- **Up next:** anyone adds a link; videos play in order; skip or the end of a video plays the next.
- **Big ↔ small:** a click on the dimmed room (or Escape, or Activities) shrinks it to a small player
  in the bottom-right corner and brings everything back; that click doesn't walk you. Mic, Sound,
  Chat work without shrinking it. Clicking the small player's picture makes
  it big again. ⤡ / ⤢ do the same. The small player keeps play/pause and skip, stays in sync, and you
  stay in the area.
- How many are watching shows under the title: "put on by Ploy · 3 watching".
- **YouTube only.** TikTok and Instagram embeds can't be synced. **Paste, no search:** YouTube's free
  search quota is about 100 searches a day for the whole app.

### Sound

- Only people watching hear the video, or a shared screen's sound.
- **Every screen share carries its sound** (the TV and desk shares, like Discord), where the browser
  allows: Chrome and Edge share a tab's sound everywhere and the whole computer's sound on Windows;
  Safari and Firefox share no sound. The browser's picker shows the "Share audio" box. A share without
  sound says so, and the sharer gets a tip to share a tab with its audio.
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
- **Screen share:** room state holds only `share: { by, audio }` and whether the video should resume.
  The picture and sound are LiveKit tracks (`getDisplayMedia` with `audio: true`; V1 sends
  `audio: false`); the game server lets only people in the TV area subscribe, as private zones do. It
  ends the share when the sharer leaves the area.

## 📸 Photo mode

Under the dock's **⋯ More**, from anywhere, any time.

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
