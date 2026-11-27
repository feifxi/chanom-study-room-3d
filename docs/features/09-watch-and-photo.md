# 9. Watch together and photo mode

PBIs: [WATCH-1 to WATCH-3](../releases.md#9-watch-together-and-photo-mode) · How the code works: [Release 2](../guide/05-release-2.md#watch-together-and-photo-mode-watch-1-to-watch-3)

Watch YouTube in sync with whoever stands at the big screen, share your screen on it, and take
photos anywhere. No jukebox: music is personal lo-fi.

## 📺 Watch together

A drop-in activity at the **big screen** (the Library's TV lounge).

- **Being on the rug is watching.** Step on and the big panel opens in sync; step off and it closes.
  No lobby, no strip, no Leave, no End.
- **Put something on** (the orange button; never E, which always means the sofa): paste a **YouTube
  link** or **Share your screen**. No search (YouTube's free quota is ~100 searches a day).
- **Anyone watching controls it**, guests too: play/pause, seek, skip, **Up next** (up to 20).
- **Links are checked with YouTube first** (oEmbed), so a private or broken video never reaches
  everyone, and titles can't be made up.
- **Turn off the TV:** owners and mods, from anywhere in the room.
- The screen turns off and Up next clears after 30 s with nobody watching.
- **Screen share takes over:** the video pauses and carries on after. One share at a time; walking
  off the rug ends yours. Phones can't share.
- The 3D screen shows the video's thumbnail or "Jod is sharing", never the live picture (a video
  texture would cost everyone in the room).

**Sound:** only people watching hear it. Every share carries its sound where the browser allows
(Chrome and Edge). No ducking when people talk. Your own TV volume; your lo-fi fades while you
watch.

## 📸 Photo mode

Under ⋯ More. The HUD and name labels hide, a frame with the room name and date shows, and others
see 📸 over your head. Snap now or a 3 s timer. **Save** (PNG), **Copy**, or **Share** to Room chat
(members only). **Connecta keeps nothing:** no gallery.

## In the code

- `apps/game/src/watch.ts`: the screen in room state (`watch`: video, offset, `startedAt`, paused,
  queue), in memory only. Players re-sync when more than 2 s off. Skip and "ended" name the video
  (`key`), so only the first counts.
- Shares: the player's `share` on the game server; picture and sound are LiveKit tracks only the
  rug receives.
- Photo mode is client-only apart from the 📸 flag (`photo { on }`); Share is a normal chat picture.
- Shared rules: `packages/shared/src/watch.ts`. Web: `apps/web/src/features/activities/`.

## Not doing

Other platforms, search, playlists, a photo gallery, filters, photo frames from the Shop.
