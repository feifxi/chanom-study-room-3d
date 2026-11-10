# Connecta decision log

Why things are the way they are. The specs (`docs/v2/features/`) say **what** each feature does;
this file keeps the **why**, the reversals, and the ideas that were turned down, so nobody (person
or agent) re-proposes them by accident. Newest decisions win over older ones. Add to it whenever a
decision is made or changed: one line, a date, and the reason.

## Where V2 came from

- **Playtest of V1 (2026-11-07).** Friends said walking around together beats talking while staring
  at a screen. They loved the cosy theme and the chibi bounce, and asked for games and activities.
  Takeaways: mood, theme and small bits of "juice" matter a lot; joining must stay as simple as
  sharing a link.
- **Positioning** (in the [plan](../v2-plan.md#why-connecta)): "Discord is a communication tool; this
  is a place." Competitors: Gather and Discord.
- **Name: Connecta** (2026-11-08), chosen over Popin, Kotatsu and keeping Chanom. The subscription
  is Connecta Plus. "Chanom Friends" in the demo is a user's room, not the app. Domain and trademark
  are not checked yet.
- **V1 is saved** as tag `v1.0.0` with a GitHub Release. V2 continues on `main`.

## How we work

- **Feature by feature.** Each feature is discussed in detail (how it works, how it feels, panel or
  3D) before anything is built. Then the UI is built in `demo/` for approval, then a spec is written.
- **Demo first.** Every page and 3D design is approved in the frontend-only demo with mock data
  before backend work. Mock types stay API-shaped (they become the OpenAPI schema).
- **Questions as plain text with a recommendation.** Pop-up question dialogs were rejected; list the
  options, say which you recommend and why.
- **Attractive by default** (2026-11-10). Pages are designed like well-known products (Discord Nitro,
  Spotify, Duolingo, Gather), not function-first. Selling and welcome pages (landing, sign-in,
  invite, Plus, Shop, Discover) get a hero and showcase treatment; daily pages (Home, Friends,
  Messages) get polish and clarity, not sales heroes. Check at desktop and phone width.
- **Simple and uniform beats clever.** Repeated feedback: one flow for every activity, simple quest
  rules, no extra modes or settings unless asked.
- **Launch comes after every feature** (2026-11-08). Don't reorder work or add restrictions for
  launch-risk reasons; mention a risk once and move on.
- **Code-built 3D for now** (2026-11-09). Props and characters are Three.js primitives for speed. The
  move to Blender models happens when the owner says so (plan: [07-maps.md](features/07-maps.md),
  "Art pipeline").
- **Performance is checked while building**, not at the end (2026-11-09). See
  [06-3d-room.md](features/06-3d-room.md#performance).

## Product decisions, in order

### Concept

- **Servers → rooms** (2026-11-08). V2 started as Discord-like servers with text channels and 3D
  rooms. The team said every Discord-shaped layout read as a copy, and the Gather-style "Place"
  layout won. Now **a room is the top level**: one map + one permanent chat; members, roles,
  invites and visibility belong to the room. No servers. (The demo still uses "server" internally;
  see the port checklist in [v2-plan.md](../v2-plan.md).)
- **App shell: the Place layout only** (2026-11-08): a slim header over Home, rooms as place cards,
  a room's page is its chat outside 3D. Rails, Notebook, Stickers, Tinted, Top bar, Dock and Town
  layouts were tried and deleted.
- **Users don't edit maps** (2026-11-07, reversed from "users customise presets"). They pick a
  template; only the Connecta team builds templates in the editor.
- **Every map has every activity** (2026-11-09). A study-only library was considered and dropped.
- **Every map has its own layout** (2026-11-10, "for variety"): door, games, open floor and zones
  move per map, not only the props.
- **Rooms reset when the last person leaves**: bubbles, seats, drawings, games. The room, its
  settings, members and Room chat stay.

### People, chat, safety

- **Age 13+** (changed from 16+ on 2026-11-08). Full birthday stored; under 13 gets a "come back
  later" screen and a one-day device lock. DMs friends-only and presence private for everyone.
- **Auth:** Google, Discord, passwordless email. Web only, so no Apple login.
- **DMs are 1-to-1 and text only.** No group DMs, no calls.
- **No "Seen" receipts** (like Discord). Notifications default to @mentions.
- **Friends:** no favourites (rejected as too much), no "friend walked in" notifications (visible,
  never pushed), no suggestions. Friend requests: Anyone / People from my rooms / Nobody (an on/off
  switch was unclear).
- **Private rooms stay private:** friends who aren't members see "🔒 A private room", never its name.
- **Common rooms** (renamed from "Drop-in", 2026-11-09) are Connecta-run copies of each template, text
  only for everyone, 25 per copy with 5 places kept for friends. No Werewolf there.
- **Moderation:** the only automatic rule is 5 reports in 30 minutes from different accounts → out
  of Common rooms for an hour. Spam limits and cooldowns were rejected (kick is enough). A 7-day
  listing rule and new-account limits were dropped.

### In the 3D room

- **Nothing inside a room navigates away silently** (2026-11-09). Only Leave leaves in one click;
  any link out uses `LeaveRoomLink` / `useLeaveRoom().ask(href)` ("Leave {room}?", Stay is the
  default). Prefer in-room panels. The owner caught a Study panel link that would have dropped
  people out of voice, their seat and their timer.
- **Chat:** Bubbles (temporary, over heads, default tab) / Room chat (saved) / Messages (DMs). "We
  like to talk to each other first." No "Nearby" text chat. Emoji button sits left, next to
  pictures, never beside Send.
- **Dock stays short:** Mic, Sound, Chat, Photo, Activities. Owner and mod powers live in 🛡️ Room;
  Talk to everyone is an admin tool there. No separate emotes; emoji go in chat.
- **People panel:** one panel built for 100 people (a small list and a fold-to-rail mode were
  rejected).
- **Away:** after 10 minutes, but someone with a timer running is never away (people study in other
  tabs).
- **Private zones are rugs** with a sign and a 🔇 cue, not circles. "Reading nook" was rejected as a
  name; zones are named after the place (Fireside, Window booth, Tent…).
- **Activity areas are rugs** too, square where possible; the whiteboard shows no outline until you
  are close.
- **Changing your look inside a room is live** (no rejoin). The "Bouncy animations" switch was
  removed: everyone gets the bounce.

### Activities

- **One flow for every activity** (owner insisted): spot in the map → Go there runs you there → you
  start it yourself → gathering lobby → Start → Playing → Results. No spectators, no bots, no
  cooldowns. Several activities at once, one per spot.
- **Dropped:** the shared jukebox (2026-11-09, personal lo-fi only), AI flashcards / feature 13
  (2026-11-09, "I don't need this"; don't propose again), music bots and "listen along", emotes and
  celebrations for now.
- **Watch together:** YouTube by pasted link (no search: API quota), anyone watching controls it,
  video does **not** duck when people talk (reversed), lo-fi fades while watching.
- **Photo mode:** take photos anywhere; no gallery ("let users handle it").
- **Pick a Side:** questions come in decks; ✨ AI decks are the only AI generation (3 a day Free, 30
  Plus). Host picks mode and deck only.
- **Draw & Guess** (renamed from Drawing telephone): panel only, no live 3D. Mode names are generic:
  never "Gartic Phone" or "Telestrations"; "Knock-off" became **Copycat**.
- **Activities list names what you do**, not the place ("art corner" meant nothing to players).
- **Feature 12 (cards, Werewolf)** is paused mid-discussion and goes last. Proposals so far:
  [12-cards-and-werewolf-draft.md](features/12-cards-and-werewolf-draft.md).

### Study

- **Personal timer only** (join/room sessions rejected), presets 25/5 and 50/10 only, private to-do
  with no streak.
- **Global leaderboard kept** (the owner wanted it): opt-in "Show me on Everyone", on by default for
  18+, off under 18, capped at 12 h a day.

### Business

- **One subscription, Connecta Plus** (2026-11-09): ฿89 a month or ฿890 a year, card or PromptPay for
  either (PromptPay renews by reminder). Room boosts were dropped; packs were dropped.
- **Plus raises your rooms' limits** (100 at once, 1,000 members vs Free 25 / 150), premium maps,
  1080p, premium skins and pets, bigger uploads, more AI decks. A room follows its owner's plan.
- **Coins are earn-only** from three simple daily quests (each counts one event the server already
  sees; never "with a friend" or "3 different people"). Coins can't be bought; premium skins come
  with Plus.
- **Never:** sell power, run ads in rooms, or charge to join. Owners can't pick room colours or put
  up a room sign (rejected as ugly); premium maps instead.

### Engineering and infra

- **Stack migration first, then port** (2026-11-07): NestJS with an OpenAPI-generated client
  (replacing Hono), Prisma (replacing Drizzle), a NestJS WebSocket gateway for chat, DMs, presence and
  notifications, Colyseus for rooms, self-hosted LiveKit, Redis between instances. Start with fresh
  data.
- **Infra = V1's architecture plus only what V2 needs** (2026-11-10): EC2 + Docker Compose + Caddy +
  RDS, plus gateway and Redis containers, S3 + CloudFront, SES, Stripe, and a separate monitoring
  server (SRE practice). Fargate, ALB, ECS and "managed swaps" were rejected. nginx was dropped.
  AWS now, Azure later (team credits). Local development only until the owner says deploy.
- **Only the owner provisions** (`terraform apply`, `infra:up/down/deploy`). Agents suggest steps and
  do read-only checks.
- **Music must be royalty-free** (Pixabay). Never rips from YouTube or Spotify.
