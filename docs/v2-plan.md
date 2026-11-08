# Connecta (V2) plan

V1 (a 3D study room, tag `v1.0.0`) becomes **Connecta**: cosy 3D rooms where friend groups and
communities hang out, study and play together. This file is the overview. Each feature gets its own
spec in `docs/v2/features/`, written after the feature has been discussed in detail and approved
in the demo (`demo/`, `pnpm --filter @study/demo demo:dev`, port 3100).

Status (2026-11-08): planning. Feature 1 (app shell) is decided. The demo is frontend-only with mock data. Nothing is deployed.

## Why

After the V1 playtest, friends said walking around together beats talking while staring at a
screen, and they loved the cosy theme and the chibi bounce. They asked for games and activities.

- **Positioning:** "Discord is a communication tool; this is a place."
- **The edge:** proximity voice (one group splits into several conversations at once), presence
  without pressure, activities you do in the room, mood and identity, and joining by a link.
- **Competitors:** Gather and Discord.
- **Platform:** our own web app only (no Discord Activity embed), 13+ like Discord, no Apple login.

## The concept: rooms, not servers

Decided 2026-11-08, after trying Discord-shaped layouts that the team said read as a copy. The
model is Gather's, kept simpler:

- **A room is the top level.** There are no servers. A user makes rooms and joins rooms; Home lists them.
- **One room = one map + one permanent chat.**
  - The map comes from a platform template (Library, Café, Rooftop, ...); the user names the room.
  - Areas inside the map (study tables, a café corner, a card table, private zones) replace "rooms in a server".
- **A room owns its people and rules:** members, roles (Owner, Mod, Member), invites, visibility, guests, safety settings.
- **When it's full, it's full.** A private room never opens copies; boosts raise its capacity.
  Drop-in rooms are the exception (see below).
- **Chat outside 3D.** The permanent chat is readable and writable without entering 3D. Phones and
  slow devices use it that way; walking in is one tap.

## Product decisions

### Rooms

- **Visibility:** private (invite only, the default), ask to join, or open (listed). The owner can change it.
- **Members first, like Discord:** you join a room before walking in (Open: one "Join & walk in"
  button; Ask to join: a mod approves). A preview shows the room and its rules first; the chat stays
  hidden until you join. Drop-in rooms and guest passes are the exceptions.
- **Roles:** Owner, Mod, Member, fixed (no custom roles). Invites: member links (7 days by default,
  optional use limit) and 24-hour guest passes. Kick, ban (tied to the account) and time out.
  Details: [03-rooms-membership.md](v2/features/03-rooms-membership.md).
- **Guests:**
  - Membership needs an account.
  - A room can allow guests by an invite link or code; guest invites expire.
  - Guests see only that room and carry a guest badge.
- **Members vs capacity:** members are everyone who belongs to the room; capacity is how many are
  inside at once. A room can have 120 members and a capacity of 25: members always have the chat,
  and wait for a spot (or ask to be told) to walk in. The owner and mods always fit.
- **Member limit grows with boosts:** 150 free, 300 / 500 / 1,000 at Levels 1–3 (about 6 members
  per spot inside). Free fits a friend group or a class; a big community boosts to grow. Connecta
  is for small and medium groups that meet in a place, not for 50,000-member communities.
- **Capacity:** 25 people at once for free, 50 or 100 with boosts. About 100 is the ceiling (phones
  drawing many avatars, crowded voice), to be confirmed by a load test with the bots script.
- **Limits:** create up to 10 rooms and join up to 100; Connecta Plus raises both.
- **What persists:**
  - The room itself persists: name, map, settings, members, link and the permanent chat.
  - What happens inside resets when the last person leaves: bubbles, drawings, card games, who sat where.
  - People can save a board to themselves before leaving.

### Maps

- **Who builds them:** only the platform admin, in a map editor. Users pick templates; they can't edit maps or upload models.
- **What a map holds:** study areas, activity areas and private zones together.
- **Platform template updates** apply only when a room next starts fresh (first join, or after everyone leaves).
- **Changing a room's map** updates the same room (same link, chat and members):
  - If nobody's inside, it switches immediately.
  - Otherwise it switches when the room empties.
  - The owner can "Switch now": everyone gets a short heads-up, then reloads into the new map.

### Open rooms and drop-in rooms

- **Drop-in rooms are fully open for accounts** (mic, images, screen share), like a public Discord
  server. **Anonymous guests** can only listen and send text: no voice, images or screen share.
- **Same rooms for every age;** under-18s aren't matched into separate copies.
- **Moderation is pluggable and cheap first.** Messages go through one `moderate()` step whose
  layers can each be switched on or off: a free word filter (e.g. `obscenity` plus our own list,
  Thai included), limits (slow mode, link and message caps for new accounts), report → auto-mute
  (e.g. 3 reports in 10 minutes mutes for 15 minutes and flags it for the admin), and the free
  OpenAI Moderation API for images and smarter text (check it's still free when building). Paid AI
  checks only if needed later.

Two kinds of room anyone can walk into, named so people know what they get:

- **Open room:** a normal room whose owner set "Who can join" to Open. It's listed in Discover and
  on Home ("Open now"); anyone can walk in and join as a member. It has an owner, members and a
  saved chat, and one copy only: full is full.
- **Drop-in room** (was "public room"): run by Connecta from its templates, 2–3 types (one per map).
  No members and no saved chat. When full, a new copy opens automatically ("Silent Library #2", ~20
  people each), so it's never full: its card shows everyone across its copies ("142 here · 8 rooms
  open"), and Drop in lands you in the copy with friends, or the one with the most space.
- **Guests:** allowed with restrictions, and a guest/account indicator shows who's who.
- Detailed design is deferred to feature 14.

### People and chat

- **Friends list and DMs** come early. DMs are 1-to-1 only (no group DMs).
- **DMs are friends only,** for everyone. Meet someone in a room → add them as a friend → DM. Friend
  requests go by @handle or from a room's people list.
- **Presence is private by default,** for everyone: friends see you're online and which room you're
  in; room members see you in that room's people list; strangers see nothing unless you share a
  room. "Appear offline" is an option.
- **Text chat v1:** messages, edit/delete, @mentions, unread dots, image uploads.
- **Presence:** who's in which room shows on Home and in friends lists.
- **In 3D:**
  - Two chats, kept apart (like Gather's two chat systems): **Bubbles** for quick talk, shown over
    the speaker's head to everyone in the room and gone when the room empties, and **Room chat**,
    the room's permanent chat (also usable outside 3D). Bubbles reach the whole room, not just
    people nearby.
  - A room people list where clicking someone shows a path to them.
  - Private zones (tables or areas): yes. Ping/wave: no.

### Study

- Pomodoro, a to-do list, focus stats and the Focus today ranking in every room.

### Activities

All of these are secondary and pluggable through an activity framework in Colyseus, not coupled to the core.

- **Watch together:**
  - YouTube, maybe short-video platforms.
  - Video plays in a big, clearly visible panel; the 3D TV is only the way in.
- **Shared jukebox:** a royalty-free catalog. Personal lo-fi music stays as well. No music bot and no
  "listen along"; YouTube music plays through the watch panel.
- **Pick a Side:** answer by walking into one of 2 or 4 zones.
- **Card games:** an Uno-like game and Slave. Werewolf, with more 3D than just sitting.
- **Whiteboard.**
- **Photo mode:** a dock button that takes photos anywhere, with an app-logo frame.
- **A drawing-telephone game** (our own Gartic Phone–style game), with Normal and Knock-off modes.
- **AI quizzes and flashcards.** No AI tutor or chatbot.
- **Not now:** emotes, celebrations and other body-movement games. Campfire and sofa corners are map
  pieces, not features.

### AI (later)

- Moderation of text.
- Talking NPC study buddies and quizzes.
- An AI game host.
- "What did I miss" summaries.
- AI room generation, once maps are data.

### Accounts

- Sign in with Google, Discord or email (passwordless).
- Settings can edit your character, using the same editor as sign-up.
- **Names:** a unique @handle (adding friends, @mentions) plus a free display name shown in rooms.
- **Guests first:** a guest picks a name and character and drops in (invite link or drop-in room).
  An account is needed to join rooms as a member, add friends or DM; signing up keeps the guest's
  character.
- **Age 13+.** The full birthday is stored; under 13 gets a friendly "come back later" screen.
  Friends-only DMs and private presence apply to everyone, so under-18s need few or no extra rules;
  any that a feature does need go in its spec as a short "Under 18" line. All age rules go through one `can(user, action)` check.

## Business model

Discord's way of making money, applied to rooms. Two kinds of payment work together:

- **Room boosts** benefit everyone in the room. Anyone in the room can boost it, so friends can chip in together.

  | Level | Boosts | People at once | Members | Also                                                                |
  | ----- | ------ | -------------- | ------- | ------------------------------------------------------------------- |
  | Free  | 0      | 25             | 150     | every basic template, 720p screen share, normal uploads             |
  | 1     | 2      | 50             | 300     | premium templates, custom room colours and banner                   |
  | 2     | 7      | 100            | 500     | 1080p screen share for everyone, bigger uploads, animated room icon |
  | 3     | 14     | 100            | 1,000   | custom invite link, more private zones and decor, event tools       |

- **Connecta Plus** (personal):
  - Cosmetics, pets, a profile frame, bigger uploads in DMs.
  - Higher limits on how many rooms you can own and join.
  - **2 boosts to put on any room.** One friend with Plus brings their room to Level 1.
- **Shop:** cosmetics for coins.
- **Rules:** never sell power, no ads in rooms, never charge to join. Paid perks are things that cost
  us money to run (capacity, HD video, storage) or are purely cosmetic. Free limits are set by real cost.

Prices are not set yet.

## Engineering

- **Stack:**
  - Migrate the stack first at the same features, then build V2 features.
  - API: NestJS with an OpenAPI-generated typed client (replacing Hono).
  - Database: Prisma (replacing Drizzle).
  - Realtime: Colyseus for 3D rooms, self-hosted LiveKit for media, a NestJS WebSocket gateway for chat, DMs, presence and notifications.
  - Redis between instances.
  - Caddy on a single host; an ALB replaces it at scale.
- **Data:** start fresh. V1 data is not carried over.
- **Demo-first:**
  - New screens are built in `demo/` with mock data before backend work.
  - Mock types stay API-shaped, because they become the OpenAPI schema.
  - One data-access layer per feature.
  - Each spec notes its backend cost.
  - The demo eventually becomes the new `apps/web`.
- **Infra:**
  - Local development until the user says deploy.
  - Then AWS (credits), Azure later (team credits).
  - Self-managed, startup-grade practice on a small budget: containers, Postgres, Redis, S3-style storage behind an interface.
  - Watch the cost traps: NAT gateway, ALB baseline, Multi-AZ.

## Porting the demo to `apps/web`: don't forget

The demo was built before the move from servers to rooms, and some of its insides still use the
old names. Users never see them, but the real app must not inherit them. When porting:

- [ ] **Data model:** rename the mock `Server` type to `Room` (`lib/mock.ts`). Drop what rooms don't
      have: `channels[]` becomes one `chat`, `rooms[]` becomes one `mapId` plus settings. Drop the
      `placeRoom()` adapter in `features/place/model.ts` that turns a server into a room.
- [ ] **Routes:** `/servers/[id]` (the room's chat page) and `/servers/[id]/rooms/[roomId]` (3D)
      become something like `/r/[id]` and `/r/[id]/walk`. Update every `href` (`walkInHref`,
      `chatHref`, friend chips, DMs, invites).
- [ ] **Drop-in rooms:** replace the `PUBLIC_SERVER` stand-in (a fake server holding the copies)
      with a real drop-in model: a template, its copies, and "land me in the right copy".
- [ ] **Folders and names:** `components/server/` (InviteDialog), `ServerFrame` in `AppFrame.tsx`,
      `serverById`, `serverId` params, `ChatTarget.kind: 'channel'`.
- [ ] **Demo-only code to leave behind:** `DemoToolbar`, `lib/demoCrowd.ts` (crowd and 100 rooms),
      `MANY_ROOMS`, `extraRooms()`, `insideCount`.
- [ ] **Search the port** for "server" and "channel" once more; the only ones left should be the
      game server and networking code.

## Process

Each feature is discussed in detail (how it works, how it feels, panel or 3D) before it's built.
The UI is approved in `demo/` first, then a spec is written to `docs/v2/features/NN-name.md`.

## Feature agenda

| #   | Feature                                                   | Spec                                                         |
| --- | --------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | App shell and navigation                                  | [01-app-shell.md](v2/features/01-app-shell.md)               |
| 2   | Accounts and sign-up                                      | [02-accounts.md](v2/features/02-accounts.md)                 |
| 3   | Rooms and membership (visibility, roles, invites, guests) | [03-rooms-membership.md](v2/features/03-rooms-membership.md) |
| 4   | Room chat and DMs                                         |                                                              |
| 5   | Friends                                                   |                                                              |
| 6   | The 3D room                                               |                                                              |
| 7   | Map templates and the editor                              |                                                              |
| 8   | Study tools                                               |                                                              |
| 9   | Activity framework                                        |                                                              |
| 10  | Watch together, jukebox, photo mode                       |                                                              |
| 11  | Pick a Side, whiteboard, drawing telephone                |                                                              |
| 12  | Card games, Werewolf                                      |                                                              |
| 13  | AI quizzes and flashcards                                 |                                                              |
| 14  | Open rooms, drop-in rooms and moderation                  |                                                              |
| 15  | Business and infra                                        |                                                              |

Feature 3 was "Servers" before the move to rooms.

## Open questions

- **Unsettled:** prices, Plus limits, and the domain and trademark for "Connecta".
