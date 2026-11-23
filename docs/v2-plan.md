# Connecta (V2) plan

**Connecta** grew out of V1's 3D study room (tag `v1.0.0`) into cosy 3D rooms where friend groups and
communities hang out, study and play together. This page is the overview: status, the concept,
what each feature is, and what's left. The details are in one spec per feature
(`docs/v2/features/`), the reasons in [decisions.md](v2/decisions.md).

## Status (2026-11-23)

- Features 1–12, 14 and 15 are decided and built in `demo/`, a frontend-only prototype with mock
  data ([demo guide](v2/demo-guide.md)). 13 was dropped.
- All three launch maps are built, each with its own layout. A polish pass covered phones, guests
  and dark mode.
- **The real app is being built fresh** in `apps/` and `packages/` (V1 was removed from `main`;
  it's at tag `v1.0.0`). Steps 1 and 2 (the skeleton; accounts and rooms) are done; step 3, the
  gateway, is done too; so is step 4, walking in a room (all five parts). Step 5, the rest of the
  features one at a time, has started with focus (parts 1 and 2 of 3 done). Nothing is deployed.

| #   | Feature                                 | Status  | Spec                                                                   |
| --- | --------------------------------------- | ------- | ---------------------------------------------------------------------- |
| 1   | App shell and navigation                | done    | [01-app-shell.md](v2/features/01-app-shell.md)                         |
| 2   | Accounts and sign-up                    | done    | [02-accounts.md](v2/features/02-accounts.md)                           |
| 3   | Rooms and membership                    | done    | [03-rooms-membership.md](v2/features/03-rooms-membership.md)           |
| 4   | Room chat and DMs                       | done    | [04-chat-and-dms.md](v2/features/04-chat-and-dms.md)                   |
| 5   | Friends                                 | done    | [05-friends.md](v2/features/05-friends.md)                             |
| 6   | The 3D room                             | done    | [06-3d-room.md](v2/features/06-3d-room.md)                             |
| 7   | Map templates and the editor            | done    | [07-maps.md](v2/features/07-maps.md)                                   |
| 8   | Study tools                             | done    | [08-study-tools.md](v2/features/08-study-tools.md)                     |
| 9   | Activity framework                      | done    | [09-activity-framework.md](v2/features/09-activity-framework.md)       |
| 10  | Watch together and photo mode           | done    | [10-watch-and-photo.md](v2/features/10-watch-and-photo.md)             |
| 11  | Pick a Side, whiteboard, Draw & Guess   | done    | [11-party-games.md](v2/features/11-party-games.md)                     |
| 12  | Table games: chess, Slave               | done    | [12-table-games.md](v2/features/12-table-games.md)                     |
| 13  | ~~AI flashcards~~                       | dropped |                                                                        |
| 14  | Common rooms, open rooms and moderation | done    | [14-open-rooms-moderation.md](v2/features/14-open-rooms-moderation.md) |
| 15  | Business and infra                      | done    | [15-business-infra.md](v2/features/15-business-infra.md)               |

## What's left

Build the real app fresh, in order ([why fresh](v2/decisions.md#engineering-and-infra)). Each step
moves the matching screens in `apps/web` from mock data onto the real backend, working through the
[port checklist](#port-checklist) as it goes.

1. ~~**Skeleton:**~~ done 2026-11-21. V1 removed; `apps/web` copied from the demo; a NestJS API with
   Prisma, config checks, logging, health and OpenAPI; `packages/shared` with only what V2 uses;
   Postgres, Redis and LiveKit in Docker Compose; CI runs check and build.
2. **The core:** accounts (Google, Discord, email code, guests), rooms, members and roles, invites.
   The first Prisma models and the generated OpenAPI client for the web app.
   - ~~Sign-in and sign-up~~ done 2026-11-21: Better Auth, the birthday and age lock, character and
     @handle, guests who keep their character; the login and invite pages on the real API; a
     rerunnable seed; Mailpit and the AWS Emulator in Compose.
   - ~~Account settings~~ done 2026-11-21: My profile (name, @handle with the 30-day rule and
     hold), My character, Settings → Account (sign-ins, birthday), deleting with 7 days to keep
     it. The signed-in app (Home and the rest) needs a finished account, checked on the server.
   - ~~Rooms, members and roles, invites~~ done 2026-11-22: making rooms, Room settings, Ask to join,
     member invites and guest passes, kick, ban, time out, Discover's listed rooms, new owners when
     an account is deleted. Rooms live at `/r/<id>`; the room's chat and the 3D room still run on
     mock data until steps 3 and 4.
3. **The gateway:** friends, room chat, DMs, presence, in that order, plus pictures in chat and the
   in-app notification bell; Socket.IO with Redis between instances
   ([how](v2/decisions.md#engineering-and-infra)).
   - ~~Friends~~ done 2026-11-22: requests by exact @handle and friend link (`/f/<handle>`),
     accept, ignore, cancel, remove, block, "Who can send me friend requests".
   - ~~Room chat~~ done 2026-11-22 (text): the gateway (Socket.IO at `/live`, Redis), messages,
     replies, edits, deletes, reactions, mentions, typing, unread counts, on the room's page and in
     3D.
   - ~~Pictures in chat~~ done 2026-11-22: presigned upload to S3, a worker makes the WebP, members only.
   - ~~DMs~~ done 2026-11-22: friends only, same chat as rooms (pictures, typing), read-only once unfriended.
   - ~~Presence~~ done 2026-11-22: Online, Away, Offline with last seen, which room friends are in
     (from the open 3D page until step 4), "Appear offline", live "inside now" on Home and the
     room's page, and the "Ask to join" and "Invite to a room" DM cards.
   - ~~The notification bell~~ done 2026-11-22: the 🔔 inbox (friend requests, join requests,
     mentions, a room's "Every message" as one growing item), toasts inside a room, muting a DM.
4. **Walking in a room:** the Colyseus game server (`apps/game`), with V1's movement prediction and
   reconciliation copied in; voice and screen share; maps. Five parts
   ([why](v2/decisions.md#engineering-and-infra)):
   - ~~Walking in for real~~ done 2026-11-22: a signed join ticket from the API, one game room per
     room, movement and seats, capacity (the owner and mods always fit) with **Full · notify me**,
     presence from the game server, kick, ban, roles and the live map switch, one of you per room,
     and Back asks "Leave …?". The maps' data moved to `packages/shared`.
   - ~~Bubbles, Away and the people list~~ done 2026-11-22: bubbles and typing through the server
     (private zones, time outs), Away 💤, Talk to everyone's 📢, live looks, the people list's real
     actions, the reset when a room empties. Floating reactions moved to part 5 with the cats.
   - ~~LiveKit proximity voice~~ done 2026-11-22: distance and stereo, the 12 nearest, private zones
     enforced by LiveKit, deafen, guest voice, Mute for me and Mute for everyone.
   - ~~Screen share~~ done 2026-11-22: at a desk to your table, or on the TV, with its sound, over
     LiveKit to that audience only; desk shares use the TV's share panel, one per table.
   - ~~Server-run cats and study buddies~~ done 2026-11-23: V1's NpcDirector on every map, resident
     cats, petting with hearts and following, the Buddy Machine (designed in the demo first:
     summon, goodbye, limits), study buddies at desks with 25/5, and people walk through them.
5. **The rest, a feature at a time**, in this order ([why](v2/decisions.md#engineering-and-infra)):
   focus; the activity framework with Watch together and photo mode; party and table games; coins
   and quests; Plus; moderation with Common and open rooms; the admin site and map editor.
   - **Focus**, three parts: ~~the timer on the game server~~ done 2026-11-23 (rounds timed and
     saved by the server, "This room today", "Focusing" for friends, one timer per account, your
     own time zone); ~~the to-do list~~ done 2026-11-23 (on the API, changes show at once);
     ~~the Focus page and rankings~~ done 2026-11-23 (my numbers, Friends and Everyone, the
     Everyone opt-in as an account setting, "Back to" your last room).
   - **The activity framework, Watch together and photo mode**, in parts: ~~Watch together on the
     game server~~ done 2026-11-23 (one screen and Up next for everyone on the rug, links checked
     with YouTube, Turn off the TV for owners and mods); photo mode (Share posts to Room chat, 📸
     over your head). The round-based framework (lobby, host, Call everyone, Leave, results) comes
     with the first party game.
6. **The seed:** one fill of all the data (people, rooms, members, friends, DMs…) for testing the
   whole app ([why at the end](v2/decisions.md#engineering-and-infra)).
7. **Infra** on AWS ([spec 15](v2/features/15-business-infra.md#architecture)), then a playtest, then launch.

Deferred on purpose, no date yet:

- **Small watch views hide the "Press E" hint on phones:** chess and Slave watchers get a small
  view in the bottom-right corner, over the hint above the joystick. Noticed 2026-11-21, not fixed.

- **Café and Rooftop catch up with the Library:** they stay selectable for variety but are behind
  (zone tags, card tables, square open floor, the 6-stool card table and chess table). Then the rest
  of the map polish: odd furniture, overlapping rugs, more café cats, overlapping name labels
  ([07-maps.md](v2/features/07-maps.md#map-polish-backlog)).
- **Cheaper cats:** merge each resident cat into skinned meshes before adding more
  ([06-3d-room.md](v2/features/06-3d-room.md#performance)).
- **Pictures:** the team will provide thumbnails and images for the maps and web pages.
- **Blender models** for maps and characters, with baked lighting
  ([07-maps.md](v2/features/07-maps.md#art-pipeline-code-now-blender-later)).
- **Real-app performance:** lower detail for far-away people, the editor's budget check, a test on a
  mid-range Android phone.

**Open questions:** Plus limits once the playtest measures real costs; the domain and trademark for
"Connecta".

## Why Connecta

After the V1 playtest, friends said walking around together beats talking while staring at a
screen. They loved the cosy theme and the chibi bounce, and asked for games and activities.

- **Positioning:** "Discord is a communication tool; this is a place."
- **The edge:** proximity voice (one group splits into several conversations at once), presence
  without pressure, activities you do in the room, mood and identity, joining by a link.
- **Competitors:** Gather and Discord. **Platform:** our own web app only, 13+, no Apple login.

## The concept: rooms, not servers

- **A room is the top level.** No servers. You make and join rooms; Home lists them.
- **One room = one map + one permanent chat.** The map is a template (Library, Café, Rooftop); the
  owner names the room. Areas in the map (study tables, a lounge, card tables, private zones) do what
  "channels" would do elsewhere.
- **A room owns its people and rules:** members, roles (Owner, Mod, Member), invites, visibility,
  guests, safety settings.
- **Full is full.** A room never opens copies; the owner's Plus raises its capacity. Only Common
  rooms (run by Connecta) open copies.
- **Chat works outside 3D,** so phones and slow devices can use a room; walking in is one tap.
- **The room resets when the last person leaves** (bubbles, seats, drawings, games); the room itself,
  its members and its chat stay.

## Features at a glance

- **Shell (1):** Gather-style: a slim header over Home, rooms as cards, a room's page is its chat,
  and panels over the 3D room. Phones get a bottom tab bar.
- **Accounts (2):** Google, Discord or an email code; 13+; a unique @handle. Guests try a room first
  and keep their character when they sign up.
- **Rooms (3):** Private, Ask to join or Open; fixed roles; member invites and 24-hour guest passes;
  kick, ban, time out.
- **Chat (4):** one saved Room chat per room and 1-to-1 DMs between friends: react, reply, edit,
  @mentions, pictures. No threads, no read receipts.
- **Friends (5):** add by exact @handle, from a room or by link. Only friends DM and see where you
  are; nothing is pushed at you.
- **3D room (6):** click to walk, stereo proximity voice for crowds, private zones, bubbles, away,
  Talk to everyone. Performance is checked as we build.
- **Maps (7):** three launch templates with the same standard kit and their own layouts; owners pick,
  only the team builds; map changes are live.
- **Study (8):** a personal focus timer (25/5, 50/10), a private to-do list, Friends and Everyone
  rankings. No streaks.
- **Activities (9–12):** one flow for every activity: Watch together (YouTube or a screen share, with
  sound), Card games, Chess, Draw & Guess, Pick a Side; the whiteboard is a free zone; photo mode
  works anywhere. No jukebox.
- **Open and Common rooms (14):** open rooms are run by their owners; Common rooms are run by
  Connecta, text only and safe for strangers. Cheap, pluggable moderation and a team admin site.
- **Business (15):** one subscription, Connecta Plus (฿89 a month or ฿890 a year), and earn-only
  coins for cosmetics. Never pay to win, no ads in rooms, joining is free.

**AI, later:** text moderation, talking NPC study buddies, an AI game host, "what did I miss"
summaries, AI-made rooms. Today AI only writes Pick a Side decks. No AI tutor or chatbot.

## Engineering

- **Stack, built fresh:** NestJS 12 with an OpenAPI-generated typed client, Prisma 7 on Postgres,
  Colyseus for rooms, self-hosted LiveKit for media, a NestJS WebSocket gateway (a second entry
  point of the API) for chat, DMs, presence and notifications, Redis between instances. Fresh data:
  V1's isn't carried over. Layout and conventions: [`AGENTS.md`](../AGENTS.md#layout).
- **Demo first:** new screens are built in `demo/` with mock data. Mock types stay API-shaped (they
  become the OpenAPI schema), one data-access layer per feature, and each spec notes its backend cost.
- **Infra:** spec 15 describes V1's architecture plus only what V2 needs, on AWS, behind nginx.
  Local development until the owner says deploy.

## Port checklist

The demo was built before the move from servers to rooms, and its insides still use the old names.
Users never see them, but the real app must not inherit them. When porting:

- [ ] **Data model:** Home, Discover, Room settings, members and invites use the API's `Room`
      (`placeRoom()` now builds the screens' view from it). Still to go: the room's chat (step 3) and
      the 3D room (step 4) take the old `Server` shape through `asServer()` in
      `features/place/model.ts`; drop it and the mock `Server` type when they're ported.
- [x] **Routes:** `/servers/[id]` and `/servers/[id]/rooms/[roomId]` became `/r/[id]` and
      `/r/[id]/walk` (2026-11-22); invites are `/i/[code]` and `/g/[code]`, Common rooms
      `/common/[copy]`.
- [ ] **Common rooms:** replace the `PUBLIC_SERVER` stand-in with a real model: a template, its
      copies, and "land me in the right copy" (`commonCopyFor`).
- [ ] **Maps:** the data files in `features/map/` become the map file format (spec 7); the active-map
      switch becomes part of the live map change.
- [ ] **"View as"** (`lib/viewer.ts`, `roleIn`) is demo-only: roles come from the session.
- [ ] **Names:** ~~`components/server/` (InviteDialog)~~, ~~`ServerFrame` in `AppFrame.tsx`~~,
      `serverById`, `serverId` params, `ChatTarget.kind: 'channel'`.
- [ ] **Leave behind:** `DemoToolbar`, `lib/demoCrowd.ts`, `MANY_ROOMS`, `extraRooms()`,
      `insideCount`.
- [ ] **Performance:** port the skinned characters, StaticBatch, the perf meter and overlay, the auto
      battery saver, and `demo:perf` as a CI check (spec 6).
- [ ] **Search the port** for "server" and "channel" once more; only game-server and networking code
      should keep them.

## How we work

Each feature is discussed in detail first, built in `demo/` for approval, then written up as a spec.
Every decision, reversal and rejected idea gets a dated line in [decisions.md](v2/decisions.md). New
developers and agents start at [`AGENTS.md`](../AGENTS.md).
