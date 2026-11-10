# Connecta (V2) plan

**Connecta** turns V1's 3D study room (tag `v1.0.0`) into cosy 3D rooms where friend groups and
communities hang out, study and play together. This page is the overview: status, the concept,
what each feature is, and what's left. The details are in one spec per feature
(`docs/v2/features/`), the reasons in [decisions.md](v2/decisions.md).

## Status (2026-11-10)

- Features 1–11, 14 and 15 are decided and built in `demo/`, a frontend-only prototype with mock
  data ([demo guide](v2/demo-guide.md)). 13 was dropped. **12 is next**, and last.
- All three launch maps are built, each with its own layout. A polish pass covered phones, guests
  and dark mode.
- Nothing is deployed. The real app (`apps/`) is still V1.

| #   | Feature                                 | Status           | Spec                                                                         |
| --- | --------------------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| 1   | App shell and navigation                | done             | [01-app-shell.md](v2/features/01-app-shell.md)                               |
| 2   | Accounts and sign-up                    | done             | [02-accounts.md](v2/features/02-accounts.md)                                 |
| 3   | Rooms and membership                    | done             | [03-rooms-membership.md](v2/features/03-rooms-membership.md)                 |
| 4   | Room chat and DMs                       | done             | [04-chat-and-dms.md](v2/features/04-chat-and-dms.md)                         |
| 5   | Friends                                 | done             | [05-friends.md](v2/features/05-friends.md)                                   |
| 6   | The 3D room                             | done             | [06-3d-room.md](v2/features/06-3d-room.md)                                   |
| 7   | Map templates and the editor            | done             | [07-maps.md](v2/features/07-maps.md)                                         |
| 8   | Study tools                             | done             | [08-study-tools.md](v2/features/08-study-tools.md)                           |
| 9   | Activity framework                      | done             | [09-activity-framework.md](v2/features/09-activity-framework.md)             |
| 10  | Watch together and photo mode           | done             | [10-watch-and-photo.md](v2/features/10-watch-and-photo.md)                   |
| 11  | Pick a Side, whiteboard, Draw & Guess   | done             | [11-party-games.md](v2/features/11-party-games.md)                           |
| 12  | Card games and Werewolf                 | **next** (draft) | [12-cards-and-werewolf-draft.md](v2/features/12-cards-and-werewolf-draft.md) |
| 13  | ~~AI flashcards~~                       | dropped          |                                                                              |
| 14  | Common rooms, open rooms and moderation | done             | [14-open-rooms-moderation.md](v2/features/14-open-rooms-moderation.md)       |
| 15  | Business and infra                      | done             | [15-business-infra.md](v2/features/15-business-infra.md)                     |

## What's left

In order:

1. **Feature 12: card games and Werewolf.** Card proposals are in the draft; Werewolf isn't
   discussed yet. Card tables and the Werewolf circle already sit in every map.
2. **Port the demo to `apps/web`.** First move the stack to NestJS and Prisma, then work through the
   [port checklist](#port-checklist), then the infra in spec 15, then a playtest, then launch.

Deferred on purpose, no date yet:

- **Map polish:** odd furniture, overlapping rugs, more café cats, overlapping name labels
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
- **Activities (9–12):** one flow for every activity: Watch together, Card games, Werewolf, Draw &
  Guess, Pick a Side; the whiteboard is a free zone; photo mode works anywhere. No jukebox.
- **Open and Common rooms (14):** open rooms are run by their owners; Common rooms are run by
  Connecta, text only and safe for strangers. Cheap, pluggable moderation and a team admin site.
- **Business (15):** one subscription, Connecta Plus (฿89 a month or ฿890 a year), and earn-only
  coins for cosmetics. Never pay to win, no ads in rooms, joining is free.

**AI, later:** text moderation, talking NPC study buddies, an AI game host, "what did I miss"
summaries, AI-made rooms. Today AI only writes Pick a Side decks. No AI tutor or chatbot.

## Engineering

- **Stack (migrate first, then build):** NestJS with an OpenAPI-generated typed client (replacing
  Hono), Prisma (replacing Drizzle), Colyseus for rooms, self-hosted LiveKit for media, a NestJS
  WebSocket gateway for chat, DMs, presence and notifications, Redis between instances. Fresh data:
  V1's isn't carried over.
- **Demo first:** new screens are built in `demo/` with mock data. Mock types stay API-shaped (they
  become the OpenAPI schema), one data-access layer per feature, and each spec notes its backend cost.
- **Infra:** V1's architecture plus only what V2 needs (spec 15). Local development until the owner
  says deploy; then AWS, Azure later.

## Port checklist

The demo was built before the move from servers to rooms, and its insides still use the old names.
Users never see them, but the real app must not inherit them. When porting:

- [ ] **Data model:** rename the mock `Server` type to `Room` (`lib/mock.ts`). `channels[]` becomes
      one `chat`, `rooms[]` becomes one `mapId` plus settings. Drop the `placeRoom()` adapter in
      `features/place/model.ts`.
- [ ] **Routes:** `/servers/[id]` and `/servers/[id]/rooms/[roomId]` become something like `/r/[id]`
      and `/r/[id]/walk`. Update every `href` (`walkInHref`, `chatHref`, friend chips, DMs, invites).
- [ ] **Common rooms:** replace the `PUBLIC_SERVER` stand-in with a real model: a template, its
      copies, and "land me in the right copy" (`commonCopyFor`).
- [ ] **Maps:** the data files in `features/map/` become the map file format (spec 7); the active-map
      switch becomes part of the live map change.
- [ ] **"View as"** (`lib/viewer.ts`, `roleIn`) is demo-only: roles come from the session.
- [ ] **Names:** `components/server/` (InviteDialog), `ServerFrame` in `AppFrame.tsx`, `serverById`,
      `serverId` params, `ChatTarget.kind: 'channel'`.
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
