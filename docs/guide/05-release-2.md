# 5. Release 2 in the code: hang out and play

The code behind every [R2 PBI](../releases.md): guests, rooms others can find, pictures, the
Buddy Machine, and everything to do together. It builds on [Release 1](04-release-1.md).

Most of this release lives on the **game server**: every activity runs there, and the browser
mirrors it.

---

## Guests (ACC-8 to ACC-10)

Spec: [1. Accounts and guests](../features/01-accounts.md) · All its PBIs: [release plan](../releases.md#1-accounts-and-guests)

**How it works**

1. A guest pass page (`/g/<code>`, [`InvitePage`](../../apps/web/src/features/rooms/InvitePage.tsx))
   signs the browser in anonymously (Better Auth's `anonymous` plugin), then `PUT /api/me/guest`
   with a name, a look and the age answer ([`GuestAge.tsx`](../../apps/web/src/features/account/GuestAge.tsx)).
   Under 13 writes the same `AgeLock` as sign-up.
2. Accepting the pass (`POST /api/invites/:code/accept`) writes a `GuestVisit` (the room, until
   when); the ticket then says `role: 'guest'`, and the game server keeps guests listening only
   unless the room allows guest voice.
3. Signing up from inside keeps the look and name: the anonymous account becomes a full one.
4. A nightly job deletes guest accounts 30 days after their last session ([`accounts-cleanup.ts`](../../apps/api/src/accounts/accounts-cleanup.ts)).

**Files:** API [`accounts/me.controller.ts`](../../apps/api/src/accounts/me.controller.ts) (`PUT guest`),
[`accounts.service.ts`](../../apps/api/src/accounts/accounts.service.ts) (`setGuest`, `ageGate`),
[`rooms/rooms.service.ts`](../../apps/api/src/rooms/rooms.service.ts) (passes, `GuestVisit`);
database `GuestVisit`; web [`app/g/[code]`](../../apps/web/src/app/g/[code]/page.tsx),
[`features/rooms/InvitePage.tsx`](../../apps/web/src/features/rooms/InvitePage.tsx),
[`features/account/GuestAge.tsx`](../../apps/web/src/features/account/GuestAge.tsx),
[`lib/guest.ts`](../../apps/web/src/lib/guest.ts).

---

## Rooms others can find (ROOM-8 to ROOM-11)

Spec: [2. Rooms and membership](../features/02-rooms.md) · All its PBIs: [release plan](../releases.md#2-rooms-and-membership)

**How it works**

1. **Guest passes** are `Invite` rows of the guest kind, made from the Invite dialog when the room
   has "Allow guests" on.
2. **Ask to join and Open:** the room's `visibility` (`private`, `request` or `open`). Asking writes a `JoinRequest`
   (`POST /api/rooms/:id/requests`) and an inbox item for mods; Open's **Join & walk in** is
   `POST /api/rooms/:id/join`. A listed room you're not in shows a preview first
   ([`JoinRoomDialog`](../../apps/web/src/features/place/JoinRoomDialog.tsx)).
3. **Discover** (`GET /api/rooms/listed`): search, tags, language, ordered by friends inside, then
   people inside now (from presence), then members. Live counts come over the gateway
   (`watch:inside`).
4. **Thumbnails** (`PUT /api/rooms/:id/thumbnail`): uploaded like a chat picture, cropped to 16:9,
   made WebP and checked ([`thumbnail.service.ts`](../../apps/api/src/rooms/thumbnail.service.ts)).

**Files:** API [`rooms/`](../../apps/api/src/rooms); database `JoinRequest`, `Invite`; web
[`app/(browse)/discover/page.tsx`](<../../apps/web/src/app/(browse)/discover/page.tsx>),
[`components/app/OpenRoomCard.tsx`](../../apps/web/src/components/app/OpenRoomCard.tsx),
[`features/rooms/RoomPreview.tsx`](../../apps/web/src/features/rooms/RoomPreview.tsx),
[`features/place/JoinRoomDialog.tsx`](../../apps/web/src/features/place/JoinRoomDialog.tsx),
[`RoomSettingsDialog.tsx`](../../apps/web/src/features/place/RoomSettingsDialog.tsx) (Overview, Invites tabs).

---

## Friends: cards and status (FR-6, FR-7)

Spec: [3. Friends and presence](../features/03-friends.md) · All its PBIs: [release plan](../releases.md#3-friends-and-presence)

**How it works:** **Ask to join** and **Invite** are DM messages with a `card`
(`POST /api/dms/with/:handle/ask`, `/invite`); answering an ask (`POST /api/dms/asks/:messageId`)
makes a member invite if you may, else a 24-hour guest pass. "What I'm doing" is the focus status
the game server reports to presence.

**Files:** API [`dms/dms.service.ts`](../../apps/api/src/dms/dms.service.ts),
[`presence/presence.service.ts`](../../apps/api/src/presence/presence.service.ts); web
[`features/dms/DmCard.tsx`](../../apps/web/src/features/dms/DmCard.tsx).

---

## Pictures and notification settings (CHAT-7, CHAT-8)

Spec: [4. Chat, DMs and the inbox](../features/04-chat.md) · All its PBIs: [release plan](../releases.md#4-chat-dms-and-the-inbox)

**How it works**

1. **Pictures** follow [presigned uploads](03-techniques.md#files-presigned-s3-links):
   `POST /api/pictures` → upload to S3 → `POST /api/pictures/:id/uploaded` → the `pictures` worker
   makes a WebP (longest side 2,048 px) and runs the picture check → the message shows. Viewing
   (`GET /api/pictures/:id`) redirects members to a one-hour link.
2. **Per-room notifications** (Every / Mentions / Nothing) is your membership's `notify`
   (`PATCH /api/rooms/:id/me`); a DM's mute is `PUT /api/dms/:id/mute`.

**Files:** API [`chat/pictures.service.ts`](../../apps/api/src/chat/pictures.service.ts),
[`pictures.processor.ts`](../../apps/api/src/chat/pictures.processor.ts),
[`picture-check.ts`](../../apps/api/src/chat/picture-check.ts), [`storage/`](../../apps/api/src/storage);
database `Picture`; web the picture parts of [`components/chat/Chat.tsx`](../../apps/web/src/components/chat/Chat.tsx).

---

## More in the 3D room (3D-9 to 3D-11)

Spec: [5. The 3D room](../features/05-room-3d.md) · All its PBIs: [release plan](../releases.md#5-the-3d-room)

**How it works**

1. **Mod tools:** `mute` (Mute for everyone) and `stage` (Talk to everyone) are game messages the
   server allows only for owners and mods; it changes who may talk in LiveKit at once.
2. **Screen share** (`share`): the server records where you share (your table or the TV) and who
   may watch; the picture and sound are LiveKit tracks only that audience receives.
3. **Cats, study buddies, the Buddy Machine:** the game server runs every NPC
   ([`npc/director.ts`](../../apps/game/src/npc/director.ts), ten times a second): resident cats
   nap and wander, `npc:summon` adds a cat or a buddy, `npc:pet` makes a cat follow you. They walk
   with A* paths. They're in the synced state, and the browser mirrors them like players.

**Files:** shared [`npc.ts`](../../packages/shared/src/npc.ts); game [`npc/`](../../apps/game/src/npc)
(`director`, `cat`, `buddy`, `motion`); web [`features/npc/`](../../apps/web/src/features/npc)
(`NpcAvatar`, `CatRig`, `GachaMachine`, `BuddyMachinePanel`), [`features/room/RoomAdmin.tsx`](../../apps/web/src/features/room/RoomAdmin.tsx)
(🛡️ Room), [`features/activities/screenShare.ts`](../../apps/web/src/features/activities/screenShare.ts).

---

## The Library's activity spots and Map & look (MAP-2, MAP-3)

Spec: [6. Maps](../features/06-maps.md) · All its PBIs: [release plan](../releases.md#6-maps)

**How it works**

1. **Spots** (the TV rug, card and chess tables, the open floor, the whiteboard strip, the art
   corner) are areas in the map data; [`features/activities/spots.ts`](../../apps/web/src/features/activities/spots.ts)
   says which activity each holds. Their furniture is built in
   [`Activity3D.tsx`](../../apps/web/src/features/activities/Activity3D.tsx).
2. **Map & look** is stored on the room (`mapId`, `size`, `time`). Changing it (`PATCH /api/rooms/:id`)
   sends a `map` room event; everyone inside sees a loading screen
   ([`MapMove.tsx`](../../apps/web/src/features/room/MapMove.tsx)) and lands at the new door. The
   light follows the time setting ([`dayCycle.ts`](../../apps/web/src/features/room3d/dayCycle.ts)).

**Files:** web [`features/place/roomLook.ts`](../../apps/web/src/features/place/roomLook.ts),
[`MapPickers.tsx`](../../apps/web/src/features/place/MapPickers.tsx), [`lib/maps.ts`](../../apps/web/src/lib/maps.ts).

---

## Rankings (STUDY-5)

Spec: [7. Study tools](../features/07-study-tools.md) · All its PBIs: [release plan](../releases.md#7-study-tools)

`GET /api/focus/rankings` sums `FocusSession` minutes for friends or everyone, today or this week,
capped at 12 hours a day. Everyone is opt-in ([`everyone.ts`](../../apps/api/src/focus/everyone.ts))
and cached for 5 minutes. Files: [`focus/focus.service.ts`](../../apps/api/src/focus/focus.service.ts),
the [Focus page](<../../apps/web/src/app/(app)/(home)/home/focus/page.tsx>).

---

## Activities: one flow for every game (ACT-1 to ACT-5)

Spec: [8. Activities](../features/08-activities.md) · All its PBIs: [release plan](../releases.md#8-activities)

**How it works.** Learn this before any game: every game plugs into it.

1. **The game server keeps one state per spot** ([`activity.ts`](../../apps/game/src/activity.ts)):
   its phase (`free → gathering → playing → results`), the host, the players.
2. **Being in the area is being in:** the server watches positions and seats, so sitting at the
   card table or stepping on the rug puts you in the lobby. Out of the area for 30 s puts you out.
3. **The host** sends `activity:start` (pick the game), `activity:begin` (Start), `activity:end`,
   `activity:call` (📣 Call everyone). Anyone sends `activity:leave`.
4. **A game** is a class that implements `RoundGame` (`start`, `out`, `standing`, `stop`, `tick`);
   the framework calls it. That's how chess, Slave, Pick a Side and Draw & Guess share one flow.
5. **In the browser,** the hub ([`hub.ts`](../../apps/web/src/features/activities/hub.ts)) mirrors
   the spots; [`ActivityHud`](../../apps/web/src/features/activities/ActivityHud.tsx) draws the
   same lobby, top strip and results for every game; each game adds its own panel or 3D layer.
6. **Room-wide games** is a room setting sent to the game server as a room event.

**Files:** shared [`activities.ts`](../../packages/shared/src/activities.ts); game
[`activity.ts`](../../apps/game/src/activity.ts); web [`features/activities/`](../../apps/web/src/features/activities)
(`hub`, `spots`, `ActivityHud`, `Activity3D`), [`features/room/ActivitiesPanel.tsx`](../../apps/web/src/features/room/ActivitiesPanel.tsx).

---

## Watch together and photo mode (WATCH-1 to WATCH-3)

Spec: [9. Watch together and photo mode](../features/09-watch-and-photo.md) · All its PBIs: [release plan](../releases.md#9-watch-together-and-photo-mode)

**How it works**

1. **The TV is game state** ([`watch.ts`](../../apps/game/src/watch.ts)): the video, when it
   started, paused or not, Up next. `watch:add` looks the link up with YouTube's oEmbed first, so
   a broken or private video never reaches anyone, and the title can't be made up.
2. **Each browser plays the video itself** (the YouTube player in [`WatchPanel`](../../apps/web/src/features/activities/WatchPanel.tsx))
   and seeks back in line when it's more than 2 s off.
3. **A share on the TV** pauses the video; picture and sound go only to people on the rug.
4. **Photo mode** is in the browser only: it hides the HUD, draws a frame, and saves a PNG from the
   canvas; others see 📸 (`photo`). Sharing to Room chat is a normal picture upload.

**Files:** shared [`watch.ts`](../../packages/shared/src/watch.ts); game [`watch.ts`](../../apps/game/src/watch.ts);
web [`WatchPanel.tsx`](../../apps/web/src/features/activities/WatchPanel.tsx),
[`screenShare.ts`](../../apps/web/src/features/activities/screenShare.ts),
[`features/room/PhotoMode.tsx`](../../apps/web/src/features/room/PhotoMode.tsx).

---

## Party games (PG-1 to PG-3)

Spec: [10. Party games](../features/10-party-games.md) · All its PBIs: [release plan](../releases.md#10-party-games)

**Pick a Side.** The server ([`pickASide.ts`](../../apps/game/src/pickASide.ts)) picks questions
from the deck, runs the timer, and when it ends reads **where each player stands** on the rug to
count answers. The state shows only the current question; a quiz's answer only at the reveal.
Built-in decks are in [`packages/shared/src/pickASide.ts`](../../packages/shared/src/pickASide.ts).
Web: [`features/activities/pickASide/`](../../apps/web/src/features/activities/pickASide)
(`Side3D` colours the floor, `SideHud`, `DeckPicker`).

**Whiteboard.** Not an activity: strokes are relayed by the game server as points (0–1
coordinates) **outside the state** (`board:start`, `board:add`, `board:undo`, `board:clear`),
kept in memory so newcomers get the board ([`board.ts`](../../apps/game/src/board.ts)). A rate
limit per person stops floods. Web: [`features/activities/board/`](../../apps/web/src/features/activities/board).

**Draw & Guess.** Everyone works at once; each player starts a chain that moves on each step
([`drawGuess.ts`](../../apps/game/src/drawGuess.ts)). **Nobody can peek:** each player gets only
their own turn privately (`tel:turn`); chains go out at the album. When time runs out the server
asks each page for what it has (`tel:collect`). Drawings go up in pieces under Colyseus's 4 KB
message limit. Writing is masked by the word filter. Web:
[`features/activities/telephone/`](../../apps/web/src/features/activities/telephone).

---

## Table games (TG-1, TG-2)

Spec: [11. Table games](../features/11-table-games.md) · All its PBIs: [release plan](../releases.md#11-table-games)

**Chess.** `ChessTable` in [`activity.ts`](../../apps/game/src/activity.ts) checks every move with
the shared rules ([`packages/shared/src/chess.ts`](../../packages/shared/src/chess.ts), on chess.js);
the browser uses the same code to show legal squares. Web: [`features/activities/chess/`](../../apps/web/src/features/activities/chess).

**Slave.** [`slave.ts`](../../apps/game/src/slave.ts) deals, checks plays with the shared rules
([`packages/shared/src/slave.ts`](../../packages/shared/src/slave.ts)) and runs the turn timer. The
state holds only the public part; **each hand goes to its player alone** (`slave:hand`). Web:
[`features/activities/slave/SlavePanel.tsx`](../../apps/web/src/features/activities/slave/SlavePanel.tsx).

---

## Picture check and slow mode (MOD-3, MOD-4)

Spec: [12. Moderation and reports](../features/12-moderation.md) · All its PBIs: [release plan](../releases.md#12-moderation-and-reports)

- **Picture check:** OpenAI's free moderation endpoint, called by the pictures worker
  ([`picture-check.ts`](../../apps/api/src/chat/picture-check.ts)); off until `OPENAI_API_KEY` is set.
- **Slow mode:** Common rooms' 3-second bubble limit is enforced on the game server
  ([`common.ts`](../../packages/shared/src/common.ts)). A room's own Slow mode switch is saved but
  not enforced yet ([open issues](../open-issues.md)).

---

## More of the admin site (ADM-5 to ADM-7)

Spec: [16. Team accounts and the admin site](../features/16-admin.md) · All its PBIs: [release plan](../releases.md#16-team-accounts-and-the-admin-site)

- **Rooms** (`POST /api/admin/rooms/:id/actions`): delist, close, and undo
  ([`rooms-admin.service.ts`](../../apps/api/src/admin/rooms-admin.service.ts)). Closing sends a
  `deleted` room event with `closed: true`, so people inside are told why.
- **Moderation page:** the layers' switches and the word list
  ([`platform-admin.service.ts`](../../apps/api/src/admin/platform-admin.service.ts)), applied
  everywhere by [platform settings](03-techniques.md#platform-settings).
- **Overview:** live counts and a health strip ([`overview-admin.service.ts`](../../apps/api/src/admin/overview-admin.service.ts)).

Web: [`app/admin/rooms`](../../apps/web/src/app/admin/rooms/page.tsx), [`moderation`](../../apps/web/src/app/admin/moderation/page.tsx),
[`app/admin/page.tsx`](../../apps/web/src/app/admin/page.tsx) (Overview).
