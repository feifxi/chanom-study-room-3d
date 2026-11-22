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
- **V1 is saved** as tag `v1.0.0` with a GitHub Release. V2 continues on `main`; V1's code left
  `main` on 2026-11-21 (see [Engineering and infra](#engineering-and-infra)).

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
- **Dock stays short:** Mic, Sound, Chat, Activities, then ⋯ More. Owner and mod powers live in 🛡️
  Room; Talk to everyone is an admin tool there. No separate emotes; emoji go in chat.
- **Your settings left the Room card for ⋯ More** (2026-11-20): the card was too long, and room and
  personal settings belong apart (Discord's server menu vs your avatar, Gather's own tile). More also
  takes Photo mode off the dock, being used now and then.
- **People panel:** one panel built for 100 people (a small list and a fold-to-rail mode were
  rejected).
- **Away:** after 10 minutes, but someone with a timer running is never away (people study in other
  tabs).
- **Private zones are rugs** with a name and a 🔇 cue, not circles. A "🔇 Private zone" tag floats
  high over the zone's middle like a name tag instead of a hanging plaque (2026-11-20, library
  first): a label, not a prop, and without the zone's name (the owner wanted just "private zone"). "Reading nook" was rejected as a
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
- **Pick a Side's zones are a 2×2 square** cut along the rug's edges (2026-11-20; the diagonal,
  screen-aligned cut looked like pizza slices). On screen it's a diamond, matched to the HUD grid
  turned 45°.
- **The whiteboard is always on** (2026-11-20): no E. Walking up opens the small board, and the
  drawing stays until Clear or the room empties. E on the first visit only, then not, was confusing.
  It's lit like a wall, not a glowing screen.
- **The library's Draw & Guess sits at a round table** (2026-11-20): 10 stools, sit to join, in
  place of four easels; more seats for more players.
- **Pick a Side's labels turn with the camera and the zones are opaque** (2026-11-20): flat labels
  tilted once someone turned the view, and the four-colour rug showed through Would you rather. The
  floor shows only the letter (A–D); the answers are read in the panel (the owner: "make it
  simple").
- **Card tables match their map** (2026-11-20): green felt and a brass lamp read as a casino; the
  library's are walnut and burgundy leather with a deck, dealt cards and a score pad.
- **No hanging lamps in the library** (2026-11-20): chandeliers over the study tables and pendants
  over the card tables and the booth cluttered the camera's view; banker's and floor lamps stay.
  The Fireside's side table went too: it blocked the way in.
- **Every seat in the library can be reached and stood up from** (2026-11-20, a layout check): the
  Fireside's way in was a 20 cm gap (the loveseat moved back), the TV lounge's L-shaped sofa closed
  its nook (the arm went; beanbags and cushions moved), the booth's table stood where you got up,
  and the coat stand sat on a card stool's stand-up spot. Beanbags and floor cushions are
  walked over, not around, and are decor, not seats: only the sofa seats (you stand up in front of
  it, on the TV side). **A seat within reach wins E** over a spot's own action (the TV's "Put something on"
  opened when you meant to sit on the sofa); the spot's action stays a button. **Go there** aims at
  open floor on the rug you can reach, not a fixed point (the TV's landed in the sofa and left you
  off the rug). Stepping onto a live spot no longer adds a second, paler flash over its edge (the
  whiteboard showed two colours).
- **The whiteboard is a small, quiet spot** (2026-11-20, the owner): no rug, outline or step-on
  flash, and its area is half the old rug's, a strip in front of the board. The board itself grew to
  3 m so the corner isn't empty. It's a side activity: the wall shows the
  drawing to the whole room, so the area is only for whoever walks right up to draw.
- **Every place has its own light at night** (2026-11-20, the owner): taking down the hanging lamps
  left the card tables, the Window booth, the art table and the open floor dark. A candle in a jar
  lights the booth's and the art table's tables; the card tables, the open floor and the whiteboard
  get soft light
  from overhead with nothing to see (floor lamps standing there looked out of place, and banker's
  lamps didn't suit low tables). Every banker's lamp has its own light: a long table's second lamp
  used to sit dark.
- **Chess, as designed** (2026-11-21, the owner): two players, casual, no clock; random colours,
  swapped in a rematch; tap-to-move with legal dots (drag too), the board turned to your colour, no
  move list; resign and draw offers, no takebacks; watchers on the rug get a small board that grows;
  the 3D board shows the live game; our own pastel piece set. Not now: a computer opponent, clocks,
  ratings, Makruk.
- **Slave, as proposed** (2026-11-21, the owner): a theater with your hand along the bottom, tap to
  pick and Play only when legal; Thai rules with no straights, bombs or revolution; King, Queen,
  Commoners and Slave, with the 2-card (and 1-card) swap when the same group plays again and the
  Slave leading; 20 s turns (15 s with 5–6); leaving or away 30 s puts you last and the others play
  on; a crown or broom on name labels. A hand tray with the room still visible was dropped for the
  theater: a hand of up to 18 cards needs the width.
- **Table games live only in their panels** (2026-11-21, the owner): no live 3D of chess or Slave
  (pieces moving, cards on the table). The tables stay as decor (chess set up, a deck and dealt
  cards), and people who want to follow a game step onto the rug and watch in a small view that
  grows; Slave got the same watcher view as chess (never anyone's hand). The live 3D cost little
  (8 draw calls), but one place for the game is simpler to build, port and keep in sync.
- **Color Cards dropped; Slave is the only card game for now** (2026-11-21, the owner): one card game
  done well before a second. Chess covers pairs (the reason Color Cards' 2-player minimum mattered),
  and an Uno-like game sits close to someone else's product. Order for feature 12: chess first, then
  Slave.
- **Battery saver keeps 60 fps while you do things** (2026-11-21, the owner): a fixed 30 fps was the
  part people notice (walking, moving the camera). Now saver renders 60 while you're active and 30
  only while you're still, where it isn't visible and where a study room spends most of its hours.
  A slow device gives up looks (shadows, resolution, character detail) before smoothness, and is
  capped at 30 only if it still can't keep up (a steady 30 beats a stuttering 45). The "switched to
  battery saver" toast is gone: it only worried people.
- **Invite links have no use limit** (2026-11-21, the owner): only an expiry (1 day, 7 days, never),
  New link and Cancel. "1 use" was for inviting one person, which inviting them as a friend does
  better; expiry and cancelling cover a link that spread, and room moderation covers who got in.
  Discord's limits are for big public servers. The invites list still shows how often a link was used.
- **The TV starts only from the orange button; no End there** (2026-11-21, the owner): "Press E to put
  something on" in the open zone and the orange button by the sofa were two ways to do one thing;
  now it's always the button (sofa included) and E always sits. The host's End came from the games'
  strip: at the TV it froze the screen (no lobby to return to) and one person stopping a shared screen
  for everyone doesn't fit, so it's gone; skip and the screen turning off when empty cover it. Then
  Leave and the whole top strip went too, like the whiteboard: being in the zone is watching and
  walking away stops it; "3 watching" moved under the title, and the big player got the strip's
  space. Games keep the strip, because leaving mid-round is a loss and must be deliberate.
- **One 6-seat card table and a chess table, in the Library first** (2026-11-21, the owner): friend
  groups are often 5–6, so the card table seats 6 (one table instead of two of 4). A pair had only one
  head-to-head game (Slave and Draw & Guess need 3), so chess joins feature 12, at a two-stool table
  where the second card table stood. Only the Library has them for now: the Café and Rooftop stay
  selectable for variety and catch up later. Turned down for now: chess as a big standalone feature
  (it's 2 players and long; Chess.com and Lichess exist), so it's casual, no clock, at a table.
- **Last one standing dropped** (2026-11-21, the owner): Pick a Side is two modes, Would you rather
  and Quiz. Knocking people out on a wrong answer left them watching for the rest of the game; with
  nobody out, everyone plays to the end, and there's one less mode to explain.
- **Pick a Side can be played alone, in both modes** (2026-11-21, the owner): a quiz or a deck is fun
  on your own while you wait for friends. Solo has no winner, just how you did.
- **Watch together's big view is a theater** (2026-11-20, the owner): the big player sat over the
  chat panel, the tools rail and the room card. Big now owns the screen between the top strip and
  the dock, with the room dimmed and the other panels hidden; chat moved into the player's sidebar
  (Up next | Chat) so watching and talking go together. The whiteboard's big view works the same way
  (Chat opens beside it, see below). Rejected: squeezing the player around
  the open panels (small video, still crowded). The rule now covers every activity (spec 9): a big
  panel is a theater (Draw & Guess too, while you play); games played by moving around (Pick a Side)
  keep the room. Drawing theaters behave alike: they open with the chat closed (the biggest canvas)
  and Chat opens it beside the canvas; the board no longer shrinks to the corner for Chat. Rejected:
  keeping the chat open by default (both canvases start smaller). Then (2026-11-21, the owner) Watch
  together followed the same rule: it opens with the chat closed and Chat opens it beside the
  player; the sidebar's Up next | Chat tabs are gone. One chat behaviour in every theater beats a
  special case, and people mostly talk by voice anyway.
- **Floor cushions seat you on the floor** (2026-11-20, the owner): the lantern circle's and the
  Rooftop cinema's cushions held you at chair height, floating. Seats can be `low`; the circle's
  cushions are lounge seats (no laptop, no table screen share).
- **Rooms open closer** (2026-11-20, the owner): the old 120% zoom is the new 100% and the starting
  view (phones still start wide enough to see 9 m across).
- **Activity spots name themselves** (2026-11-20, the owner): a floating tag like the private
  zones', so you can tell what a table is for without opening Activities. Idle tags show only near
  you and live ones from anywhere: eight always-on tags plus people's names were too busy zoomed
  out. Tags float just over people's names and draw on top of them (a version pinned to the rug's
  front edge read as being under the floor).
- **Screen share on the TV, with sound for every share** (2026-11-20, the owner): the TV's "Put
  something on" can share your screen as well as YouTube. A share takes over (the video pauses and
  carries on after) rather than waiting for the video to end, so nobody hogs the TV. The 3D TV shows
  a "Jod is sharing" card, not the live picture (a video texture costs every client in the room).
  Shares carry their sound like Discord's, heard only by people watching (the TV rug, or the desk
  share's table) with their own volume, not by proximity: a movie shouldn't carry across the study
  tables. Phones can't share; browsers decide whether sound comes along.
- **Pick a Side:** questions come in decks; ✨ AI decks are the only AI generation (3 a day Free, 30
  Plus). Host picks mode and deck only.
- **Draw & Guess** (renamed from Drawing telephone): panel only, no live 3D. Mode names are generic:
  never "Gartic Phone" or "Telestrations"; "Knock-off" became **Copycat**.
- **Activities list names what you do**, not the place ("art corner" meant nothing to players).
- **Feature 12 (table games)** went last: chess and Slave, in
  [12-table-games.md](features/12-table-games.md).
- **Werewolf is dropped** (2026-11-20, the owner): it's a whole second game inside the app (roles, a
  narrator, night and day, voting) for something that needs 6+ people, while most groups are 2–4
  friends who'd rather play cards. Feature 12 is card games only. The 12-cushion circle stays in
  every map as a **lantern circle**, somewhere to sit and hang out (it looks good), not an activity
  spot.

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

- **Build fresh instead of migrating V1** (2026-11-21, reverses "stack migration first, then port"
  from 2026-11-07). Connecta is almost a different app (accounts, rooms with members and roles, chat,
  DMs, Plus, table games), and extending V1 would carry over its structure and patterns (Hono
  layout, one public room, anonymous visitors). So V1 left `main` (tag `v1.0.0` keeps it, along with
  its AWS Terraform, deploy scripts and observability setup), `apps/web` starts as a copy of the
  approved demo, and the backend is written new. Order: skeleton, the core (accounts, rooms),
  the gateway, walking in a room, the rest; the [plan](../v2-plan.md#whats-left) tracks it.
- **Lift V1's hard-won pieces on purpose, not its structure** (2026-11-21): client prediction with
  `reconcile.ts` and the server's refilling move budget; the explicit Colyseus `WebSocketTransport`
  and the hoisted `.npmrc`; LiveKit proximity voice and screen share; the e2e lessons (a dev-only
  test handle on `window`, CI without a GPU); the SLO and dashboard generators if monitoring returns.
  `packages/shared` kept only what V2 uses (avatars, world types, movement rules, collisions, A\*,
  NPC types).
- **The stack** (2026-11-07, kept): NestJS with an OpenAPI-generated client, Prisma, a NestJS
  WebSocket gateway for chat, DMs, presence and notifications, Colyseus for rooms, self-hosted
  LiveKit, Redis between instances. Start with fresh data.
- **How the stack is set up** (2026-11-21): one NestJS app with two entry points (REST and the
  WebSocket gateway): shared modules, two containers. Prisma lives in `apps/api`, which owns the
  schema, not in a `packages/db`: if the game server needs data it asks the API, or the package is
  split out then. Validation is Zod through Nest 12's Standard Schema support (Swagger reads the same
  schemas), not class-validator. Prisma 7, not the Prisma 8 release candidate. Vitest everywhere
  (SWC for Nest's decorator metadata), not Jest. TypeScript 5.9 everywhere. Package scope
  `@connecta/*`.
- **AWS stays; Azure is off** (2026-11-21, the owner, reverses "the cloud is open again" from earlier
  the same day): the architecture in [15-business-infra.md](features/15-business-infra.md#architecture)
  stands. Local development only until the owner says deploy.
- **nginx instead of Caddy** (2026-11-21, the owner, reverses "nginx was dropped" from 2026-11-10):
  the more common choice. Certificates come from certbot (Let's Encrypt) in a container beside nginx;
  an ALB with ACM certificates was turned down at ~$16+ a month. The same config runs locally for a
  production-like check.
- **Sign-in with Better Auth** (2026-11-21, the owner): it covers the spec out of the box (Google,
  Discord, 6-digit email codes, guest accounts that link on sign-up, linked sign-ins, database
  sessions, rate limits) through its Prisma adapter. Its username plugin isn't used: @handles have
  their own rules (reserved words, the 30-day hold), so the accounts module owns them. `@nestjs/authentication` was the
  Nest-native option but is 0.1.x (first published 2026-09-29) and has no email codes, Discord,
  guests or database stores. Sessions are server-side rows with an HttpOnly cookie, not JWTs.
- **The browser only calls its own site** (2026-11-21): relative `/api` paths, a Next rewrite
  locally and nginx in production, so cookies need no CORS and one build fits every environment. The
  web app calls the API through a client generated from its OpenAPI document (`openapi-typescript`
  and `openapi-fetch`), with TanStack Query for caching.
- **Local AWS: the AWS Emulator, plus Mailpit** (2026-11-21, the owner): AWS's own emulator
  (announced 2026-11-11, free, no account) for S3 locally and S3/SES in tests, pinned and with
  telemetry off. LocalStack now needs an account and token, and MinIO's free edition is archived, so
  both were turned down; moto's server is the fallback. Mailpit is the local inbox for sign-in codes,
  since no AWS emulator shows sent mail. The code only sees `AWS_ENDPOINT_URL`.
- **`packages/shared` is built to `dist/`** (2026-11-21): the API (and later the game server) run
  it in Node, which can't load TypeScript from another package. It was TypeScript source only.
- **API tests use a real Postgres** (2026-11-21): sign-in is mostly database work (sessions, codes,
  locks, unique handles), and faking Prisma would test the fake. A `connecta_test` database in the
  compose Postgres, a service in CI; only email is faked.
- **One seed for the whole app, written at the end** (2026-11-22, the owner): it's for the owner
  to test once everything is built, a one-time fill of all the data (people, rooms, friends,
  DMs…), not something each build step grows. Until then it has only the demo people and the S3
  bucket.
- **Rooms on the API: the details the spec left open** (2026-11-22): rooms live at `/r/<id>` (its
  chat) and `/r/<id>/walk` (3D); invites at `/i/<code>` and `/g/<code>`; Common rooms at
  `/common/<copy>` until feature 14 gives them a real model. Room ids are 10 random characters and
  invite codes 8 (no look-alike letters), so they can't be guessed. A private room you're not in is
  a 404, not a 403. The Invite dialog hands back your existing link while at least half its time
  is left, so opening it doesn't mint a new code each time. A guest pass works for 24 hours from
  when it's made, and so does what it lets in. Bans also work on people who aren't members (a
  guest, someone asking). Handing a room over makes the old owner a mod. "Allow guests" starts on.
  An account being deleted names who takes each room it owns; nobody named means the
  longest-serving mod, then the longest-standing member.
- **Only the owner provisions** cloud resources. Agents suggest steps and do read-only checks.
- **Music must be royalty-free** (Pixabay). Never rips from YouTube or Spotify.
