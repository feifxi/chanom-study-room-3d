# Connecta (V2) plan

V1 (a 3D study room, tag `v1.0.0`) becomes **Connecta**: cosy 3D rooms where friend groups and
communities hang out, study and play together. This file is the overview. Each feature gets its own
spec in `docs/v2/features/`, written after the feature has been discussed in detail and approved
in the demo (`demo/`, `pnpm --filter @study/demo demo:dev`, port 3100).

Status (2026-11-09): features 1–11 and 14 are decided and built in the demo; 13 (flashcards) was
dropped; feature 12 (card games, Werewolf) is paused mid-discussion. The demo is frontend-only with mock data. Nothing is deployed.

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
- **When it's full, it's full.** A private room never opens copies; the owner's Plus raises its capacity.
  Common rooms are the exception (see below).
- **Chat outside 3D.** The permanent chat is readable and writable without entering 3D. Phones and
  slow devices use it that way; walking in is one tap.

## Product decisions

### Rooms

- **Visibility:** private (invite only, the default), ask to join, or open (listed). The owner can change it.
- **Members first, like Discord:** you join a room before walking in (Open: one "Join & walk in"
  button; Ask to join: a mod approves). A preview shows the room and its rules first; the chat stays
  hidden until you join. Common rooms and guest passes are the exceptions.
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
- **Member limit grows with the plan:** 150 free, 1,000 with the owner's Plus (about 6 members per
  spot inside, at most 10 at 100 people). Free fits a friend group or a class. Connecta
  is for small and medium groups that meet in a place, not for 50,000-member communities.
- **Capacity:** 25 people at once for free, up to 100 with the owner's Plus. About 100 is the ceiling (phones
  drawing many avatars, crowded voice), to be confirmed by a load test with the bots script.
- **Limits:** create up to 10 rooms and join up to 100; Connecta Plus raises both.
- **What persists:**
  - The room itself persists: name, map, settings, members, link and the permanent chat.
  - What happens inside resets when the last person leaves: bubbles, drawings, card games, who sat where.
  - People can save a board to themselves before leaving.

### Maps

- **Who builds them:** only the platform admin, in a map editor. Users pick templates; they can't edit maps or upload models.
- **What a map holds:** study areas, activity areas and private zones together. Every template has
  the same **standard kit** (study spots, lounge, 2+ private zones, big screen, card table,
  open floor, whiteboard, Buddy Machine, nap spots, spawn point), so every activity works in every
  map; only the place, props and theme differ.
- **Templates:** Cosy Library, Cat Café and Starry Rooftop at launch (more ideas in feature 7).
  Two sizes: Cosy (up to 50) and Big (up to 100, owner's Plus).
- **Owners set, they don't edit:** the template, its size, the room's time of day (the same for
  everyone inside) and a thumbnail.
- **Map changes are live; nobody has to leave** (decided 2026-11-09). Everyone inside sees a short
  loading screen and lands at the door of the new map. Voice and chat keep going; seats and screen
  shares end; boards and card games move to the same kit piece in the new map.
- **Platform template updates** (and rollbacks) reach rooms in use after a 60-second "update coming"
  banner, the same way.
- **Changing a room's map** keeps the same room (link, chat, members) and applies at once, live.

### Open rooms and Common rooms

Two kinds of room anyone can walk into, named so people know what they get. Details:
[14-open-rooms-moderation.md](v2/features/14-open-rooms-moderation.md).

- **Open room:** a normal room whose owner set "Who can join" to Open. It's listed in Discover and
  on Home ("Open now"); anyone with an account can walk in and join as a member. It has an owner,
  mods, members and a saved chat, keeps everything (voice, pictures, videos), and one copy only:
  full is full. Fixed tags (up to 3) and a language help people find it.
- **Common room** (was "drop-in room", before that "public room"): run by Connecta, one per template
  (Library, Cat Café, Starry Rooftop), anyone welcome, guests too. No members and no saved chat.
  A copy holds 25, with 5 seats kept for people joining a friend (strangers fill it to 20), then a new one opens ("Library Common Room #2"); Walk
  in lands you with friends, otherwise in the busiest copy.
- **Common rooms are safe for strangers by design** (decided 2026-11-09): nobody runs them, so for
  everyone: **text only** (no voice, pictures, watch together or screen share), slow mode, links not
  clickable, no Werewolf. Card games, Draw & Guess, Pick a Side and the whiteboard work.
- **Same rooms for every age;** under-18s aren't matched into separate copies.
- **Moderation is pluggable and cheap first.** Messages go through one `moderate()` step whose
  layers can each be switched on or off: a free word filter (e.g. `obscenity` plus our own list,
  Thai included), limits (slow mode, link caps), report thresholds (3 reports in 10 minutes → muted
  15 minutes; in Common rooms, 5 reports in 30 minutes → out of Common rooms for an hour), and the
  free OpenAI Moderation API for images and smarter text (check it's still free when building). Paid
  AI checks only if needed later.
- **The Connecta team** works from an admin site (`/admin`): overview and health, reports, users,
  rooms, Common rooms, moderation, maps, audit log. Warnings, suspensions and bans are always by
  hand, emailed with the reason (reply to appeal). No voice recording, ever.

### People and chat

- **Friends list and DMs** come early. DMs are 1-to-1 only (no group DMs).
- **DMs are friends only,** for everyone. Meet someone in a room → add them as a friend → DM. Friend
  requests go by @handle or from a room's people list.
- **Presence is private by default,** for everyone: friends see you're online and which room you're
  in; room members see you in that room's people list; strangers see nothing unless you share a
  room. "Appear offline" is an option.
- **Text chat v1:** react, reply (no threads), edit, delete (owner and mods: anyone's), @mentions
  with @room for owner and mods, up to 4 pictures, "New messages" line, typing. No read receipts
  ("Seen"), like Discord. History kept forever. Details: [04-chat-and-dms.md](v2/features/04-chat-and-dms.md).
- **Presence:** who's in which room shows on Home and in friends lists. No notification when a
  friend walks into a room (like Discord's Active Now). Friends: exact @handle, room people list or
  friend link; silent requests; 1,000 max. Details: [05-friends.md](v2/features/05-friends.md).
- **In 3D:**
  - Two chats, kept apart (like Gather's two chat systems): **Bubbles** for quick talk, shown over
    the speaker's head to everyone in the room and gone when the room empties, and **Room chat**,
    the room's permanent chat (also usable outside 3D). Bubbles reach the whole room, not just
    people nearby.
  - A room people list where clicking someone shows a path to them.
  - Private zones (tables or areas): yes. Ping/wave: no.
  - Click to walk, stereo proximity voice (~12 nearest streamed), private zones (only people inside
    hear each other; no locks), 120-character bubbles, away after 10 minutes (mic off), and "Talk to
    everyone" for owner and mods. Details: [06-3d-room.md](v2/features/06-3d-room.md).

### Study

- A personal focus timer (25/5, 50/10), a private to-do list saved to your account, "this room today"
  in the Study panel, and a Focus page with your numbers and Friends / Everyone rankings (Everyone is
  opt-in, off by default under 18). No streaks. Details: [08-study-tools.md](v2/features/08-study-tools.md).

### Activities

All of these are secondary and pluggable through an activity framework in Colyseus, not coupled to the core.
One flow for every activity: it lives at a map spot, you join by being there (sit or step in the
ring), the host calls everyone with one shared invite card and starts it, anyone can leave any time.
Details: [09-activity-framework.md](v2/features/09-activity-framework.md).

- **Watch together:** YouTube links (Shorts too) at the Big screen; everyone in front of it watches in
  sync in a big panel (shrinkable), anyone watching controls it, a shared queue, steady volume while
  people talk. Details: [10-watch-and-photo.md](v2/features/10-watch-and-photo.md).
- **No jukebox** (dropped 2026-11-09): music is personal lo-fi only. No music bot and no "listen
  along"; YouTube music plays through the watch panel.
- **Pick a Side:** answer by walking into one of 2 or 4 zones. Three modes (Would you rather, Quiz,
  Last one standing); questions come in decks: built in, your own, or AI-made from a topic. Details:
  [11-party-games.md](v2/features/11-party-games.md).
- **Card games:** an Uno-like game and Slave at the card table. **Werewolf at its own table**, with
  more 3D than just sitting.
- **Whiteboard:** a free zone (not in the Activities list): everyone in front of it draws, live on the wall; cleared when
  everyone leaves. Details: [11-party-games.md](v2/features/11-party-games.md#-whiteboard).
- **Photo mode:** a dock button that takes photos anywhere, with an app-logo frame and a 3 s timer;
  save, share to Room chat or copy. Connecta keeps no photos.
- **Draw & Guess** at a new Art corner (our own Gartic Phone–style game): Draw & Guess and
  Copycat modes, the album plays on its own, no scores; the game is panel-only, the corner is decor.
  Details: [11-party-games.md](v2/features/11-party-games.md#-draw--guess).
- **AI quizzes** are AI decks in Pick a Side (feature 11). **No flashcards** (dropped 2026-11-09). No AI
  tutor or chatbot.
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
- **Guests first:** a guest picks a name and character and drops in (invite link or a Common room).
  An account is needed to join rooms as a member, add friends or DM; signing up keeps the guest's
  character.
- **Age 13+.** The full birthday is stored; under 13 gets a friendly "come back later" screen.
  Friends-only DMs and private presence apply to everyone, so under-18s need few or no extra rules;
  any that a feature does need go in its spec as a short "Under 18" line. All age rules go through one `can(user, action)` check.

## Business model

**One subscription, Connecta Plus** (decided 2026-11-09). Room boosts were dropped: copying
Discord's boosts plus Plus plus coins was too much for a cosy app of small groups.

|                               | Free     | Plus                  |
| ----------------------------- | -------- | --------------------- |
| Rooms you own: people at once | 25       | 100 (Big maps)        |
| Rooms you own: members        | 150      | 1,000                 |
| Maps                          | basic    | + premium maps        |
| Screen share                  | 720p     | 1080p                 |
| Rooms you can make / join     | 10 / 100 | 30 / 200              |
| Skins and pets                | base set | + premium skins, pets |
| Name tag and profile banner   | plain    | animated              |
| Uploads                       | 10 MB    | 50 MB                 |
| AI quiz decks                 | 3 a day  | 30 a day              |

- **A room follows its owner's plan.** Everyone inside gets the room space and the maps; only the
  owner pays. Friends chip in by **gifting Plus**.
- **If Plus ends:** nothing is deleted. After 7 days of grace the owner's rooms go back to 25 at
  once, and a premium or Big map moves to its basic version (live, feature 7).
- **Premium maps** are presets like every template: the same standard kit, a nicer or rarer place.
  Owners can't pick colours.
- **Coins are earned, never bought.** Money only buys Plus. Coins buy cosmetics in the Shop
  (accessories ~200–400, outfits ~500–800, pets ~1,000–1,500: something new about once a week).
  Premium skins and pets come with Plus and are never sold for coins; Plus earns no extra coins.
- **Daily quests** (3 a day, new at midnight, ~60 coins a day), one from each group so a studier in
  a room with room-wide games off can always earn something:
  - 📖 Focus: focus for 1 hour, finish 2 focus sessions
  - 💬 Together: 30 minutes in a room with others, say 5 things (bubbles or Room chat)
  - 🎲 Play: pet a cat 3 times, use the Buddy Machine, play any activity once (as activities land)
- **Keep quests simple to check:** each one counts a single event the server already sees (timer
  minutes, time connected with someone else in the room, messages, a pet, an activity's "round
  finished"). Nothing like "with a friend" or "3 different people". Each pays once a day, so faking
  one gains almost nothing.
- **Shown** on the Shop page and in 3D under My tools → 🎯 (with "1/3"); a toast when one's done.
- **Not in v1:** weekly bonus and streaks (feature 8 decided: no focus streak either).
- **Rules:** never sell power, no ads in rooms, never charge to join. Paid perks are things that cost
  us money to run (capacity, HD video, storage, AI) or are purely cosmetic. Free limits are set by real cost.

**Prices** (decided 2026-11-10): ฿89 a month or ฿890 a year, by card (renews by itself) or PromptPay
(renews by reminder); Stripe, gifts, team-only refunds. Details: [15-business-infra.md](v2/features/15-business-infra.md).

## Engineering

- **Stack:**
  - Migrate the stack first at the same features, then build V2 features.
  - API: NestJS with an OpenAPI-generated typed client (replacing Hono).
  - Database: Prisma (replacing Drizzle).
  - Realtime: Colyseus for 3D rooms, self-hosted LiveKit for media, a NestJS WebSocket gateway for chat, DMs, presence and notifications.
  - Redis between instances.
  - Caddy on a single host (V1's design, kept; no load balancer or autoscaling for now).
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
  - **V1's architecture plus only what V2 needs** (decided 2026-11-10): one app server with Docker Compose and Caddy, RDS, plus a gateway and Redis containers, S3 + CloudFront, SES, Stripe, and **monitoring on its own server** (SRE practice). About $3 a day while running. Details: [15-business-infra.md](v2/features/15-business-infra.md).

## Porting the demo to `apps/web`: don't forget

The demo was built before the move from servers to rooms, and some of its insides still use the
old names. Users never see them, but the real app must not inherit them. When porting:

- [ ] **Data model:** rename the mock `Server` type to `Room` (`lib/mock.ts`). Drop what rooms don't
      have: `channels[]` becomes one `chat`, `rooms[]` becomes one `mapId` plus settings. Drop the
      `placeRoom()` adapter in `features/place/model.ts` that turns a server into a room.
- [ ] **Routes:** `/servers/[id]` (the room's chat page) and `/servers/[id]/rooms/[roomId]` (3D)
      become something like `/r/[id]` and `/r/[id]/walk`. Update every `href` (`walkInHref`,
      `chatHref`, friend chips, DMs, invites).
- [ ] **Common rooms:** replace the `PUBLIC_SERVER` stand-in (a fake server holding the copies)
      with a real model: a template, its copies, and "land me in the right copy" (`commonCopyFor`).
- [ ] **"View as"** (`lib/viewer.ts`, `roleIn`) is demo-only: roles come from the session and the
      room's members.
- [ ] **Folders and names:** `components/server/` (InviteDialog), `ServerFrame` in `AppFrame.tsx`,
      `serverById`, `serverId` params, `ChatTarget.kind: 'channel'`.
- [ ] **Demo-only code to leave behind:** `DemoToolbar`, `lib/demoCrowd.ts` (crowd and 100 rooms),
      `MANY_ROOMS`, `extraRooms()`, `insideCount`.
- [ ] **Performance:** port the skinned characters (`avatar/skin.ts`, low detail in battery saver),
      the perf meter and overlay, the auto battery saver, and `demo:perf` as a CI check
      ([06-3d-room.md](v2/features/06-3d-room.md#performance)).
- [ ] **Search the port** for "server" and "channel" once more; the only ones left should be the
      game server and networking code.

## Process

Each feature is discussed in detail (how it works, how it feels, panel or 3D) before it's built.
The UI is approved in `demo/` first, then a spec is written to `docs/v2/features/NN-name.md`.

## Feature agenda

| #   | Feature                                                   | Spec                                                                   |
| --- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | App shell and navigation                                  | [01-app-shell.md](v2/features/01-app-shell.md)                         |
| 2   | Accounts and sign-up                                      | [02-accounts.md](v2/features/02-accounts.md)                           |
| 3   | Rooms and membership (visibility, roles, invites, guests) | [03-rooms-membership.md](v2/features/03-rooms-membership.md)           |
| 4   | Room chat and DMs                                         | [04-chat-and-dms.md](v2/features/04-chat-and-dms.md)                   |
| 5   | Friends                                                   | [05-friends.md](v2/features/05-friends.md)                             |
| 6   | The 3D room                                               | [06-3d-room.md](v2/features/06-3d-room.md)                             |
| 7   | Map templates and the editor                              | [07-maps.md](v2/features/07-maps.md)                                   |
| 8   | Study tools                                               | [08-study-tools.md](v2/features/08-study-tools.md)                     |
| 9   | Activity framework                                        | [09-activity-framework.md](v2/features/09-activity-framework.md)       |
| 10  | Watch together and photo mode                             | [10-watch-and-photo.md](v2/features/10-watch-and-photo.md)             |
| 11  | Pick a Side, whiteboard, Draw & Guess (done)              | [11-party-games.md](v2/features/11-party-games.md)                     |
| 12  | Card games, Werewolf                                      |                                                                        |
| 13  | ~~AI flashcards~~ dropped (2026-11-09)                    |                                                                        |
| 14  | Common rooms, open rooms and moderation (done)            | [14-open-rooms-moderation.md](v2/features/14-open-rooms-moderation.md) |
| 15  | Business and infra (done)                                 | [15-business-infra.md](v2/features/15-business-infra.md)               |

Feature 3 was "Servers" before the move to rooms.

## Open questions

- **Unsettled:** Plus limits after the playtest measures real costs, and the domain and trademark for "Connecta".
