# Decision log

**Why** things are the way they are, and the ideas that were turned down, so nobody re-proposes
them by accident. The specs say **what**. One line per decision with its date and reason; when a
decision changes, edit its line ("reversed on …") instead of adding a contradiction.

## How we work

- **Feature by feature.** Each feature is discussed with the owner, built, and approved from
  screenshots. The design sandbox (`demo/`) was removed on 2026-11-24 once everything in it was
  in the app: two copies of every page confused the team.
- **No mock data in the app** (2026-11-24): every room, Common rooms too, runs on the game server, so
  the browser copies of the games, the scripted people and the mock room went with the demo. The
  Test tools' pretend crowd (development only) is the one stand-in left. Every button does what
  it says or isn't shown (a toast never stands in for an action), and a room's look comes from the
  API and the game server, never from browser storage.
- **Questions as plain text with a recommendation**, never pop-up question dialogs.
- **Attractive by default** (2026-11-10): pages look like well-known products (Nitro, Spotify,
  Duolingo, Gather). Selling pages (landing, sign-in, invite, Plus, Shop, Discover) get a hero;
  daily pages get polish and clarity.
- **Simple and uniform beats clever:** one flow for every activity, simple rules, no extra modes
  or settings unless asked.
- **Launch comes after every feature** (2026-11-08): mention a launch risk once and move on.
- **Code-built 3D for now** (2026-11-09); Blender models when the owner says.
- **Performance is checked while building**, not at the end.
- **Generic names only:** never other products' game or mode names.
- **Music is royalty-free** (Pixabay); never rips from YouTube or Spotify.

## Concept

- **Why Connecta** (playtest, 2026-11-07): friends said walking around together beats talking
  while staring at a screen; they loved the cosy theme and the chibi bounce and asked for games.
  So: "Discord is a communication tool; this is a place." Mood, small bits of juice and joining by
  a link matter most. Competitors: Gather and Discord.
- **Name: Connecta** (2026-11-08), over Popin and Kotatsu. Domain and trademark not checked yet.
- **Rooms, not servers** (2026-11-08): Discord-like servers with channels read as a copy; the
  Gather-style layout won. A room is the top level: one map + one permanent chat, owning its
  members, roles and invites. Rails, Notebook, Dock, Town and other layouts were tried and deleted.
- **Users don't edit maps** (2026-11-07): they pick a template; only the team builds maps.
- **Every map has every activity** (2026-11-09) **and its own layout** (2026-11-10, for variety).
- **The Library is the one main map** (2026-11-24): the Café and Rooftop are temporary. The move
  to Blender starts with the Library and changes the map format, so the map editor is built with
  it rather than twice.
- **Rooms reset when the last person leaves**; the room, members and chat stay.
- **One theme: Thai tea orange** (2026-11-22): it's Connecta's colour; the ten drink palettes
  were dropped.

## Accounts and safety

- **13+** (2026-11-08, was 16+). Full birthday stored; under 13 gets a one-day lock.
- **No passwords** (confirmed 2026-11-24): friend groups arrive with Google or Discord, joining
  from a link should take seconds, and codes leave no hashes to leak, no resets, no "forgot
  password" support. The cost is depending on email delivery. If anything is added, passkeys.
  Web only, so no Apple login.
- **One page for sign-in and sign-up, labelled by where you came from** (2026-11-24): the first
  step is the same either way, and two pages make people pick the wrong door. Separate `/signup`
  and `/login` were turned down.
- **Signed-out visitors browse Discover** (2026-11-24): "Try a room as a guest" opens Discover
  instead of dropping people into the Café, so they see what's there first.
- **Sign-in with Better Auth** (2026-11-21): it covers Google, Discord, email codes, guests that
  link on sign-up and database sessions out of the box. `@nestjs/authentication` was 0.1.x with
  none of that. Sessions are server-side rows with an HttpOnly cookie, not JWTs.
- **Deleting waits 7 days** (fits GDPR and Thailand's PDPA).

## Rooms and people

- **Fixed roles** (Owner, Mod, Member), no custom ones: they're much of why Discord feels heavy.
- **Full is full:** a room never opens copies; only Common rooms do. The owner and mods always fit.
- **Invite links have no use limit** (2026-11-21): only an expiry. Inviting one person is what a
  friend request is for; expiry and cancelling cover a link that spread.
- **A private room you're not in is a 404** and is never named to friends ("🔒 A private room").
- **Room thumbnails are public and the owner's** (2026-11-24): they're on Discover and invite
  links, like the room's name. They go through the picture check before they show.
- **Ban works on non-members too** (a guest, someone asking); handing a room over makes the old
  owner a mod.
- **DMs are 1-to-1, friends only.** No group DMs, no calls. Pictures yes.
- **No "Seen" receipts**, no threads. Notifications default to @mentions.
- **Friends:** no favourites, no suggestions, no "a friend walked in" notifications (visible,
  never pushed). Requests: Anyone / People from my rooms / Nobody (an on/off switch was unclear).
- **Presence lives in Redis**; only "last seen" is stored.
- **One of you per room, newest tab wins** (2026-11-22): refusing the new tab would trap someone
  whose old tab is on another device. **One room at a time per account** (2026-11-23): nobody can
  be in two places. One tab for the whole app was turned down: people keep Home or a DM open beside
  a room.

## The 3D room

- **Nothing inside a room navigates away silently** (2026-11-09): leaving costs your voice, seat
  and timer. Back asks too (2026-11-22); keeping the connection alive across pages was turned down.
- **Chat:** Bubbles / Room chat / Messages. No "Nearby" text chat. Emoji go in chat; no emotes.
- **The dock stays short:** owner and mod tools under 🛡️ Room; your settings and Photo mode under
  ⋯ More (2026-11-20: the Room card was too long, and room and personal settings belong apart).
- **One people panel built for 100.** **Away after 10 minutes**, never while a timer runs.
- **Private zones are rugs** with a floating "🔇 Private zone" tag, no locks. **Zone voice is
  enforced by LiveKit** through each speaker's own client (2026-11-22): LiveKit's server API can't
  set who receives someone else's track, and a LiveKit room per zone would drop your voice every
  time you stepped on a rug.
- **Mute for everyone lasts until lifted or the room empties**, tied to the account; time out is
  the one that ends by itself.
- **Screen share carries its sound**, heard only by its audience, not by distance (a movie
  shouldn't carry across the study tables). The 3D TV shows a card, never the live picture (a
  video texture costs everyone).
- **Battery saver keeps 60 fps while you act** (2026-11-21): a fixed 30 fps was what people
  noticed. 30 only while you're still; slow devices give up looks before smoothness. No toast.
- **Cats and study buddies:** run by the game server; anyone can summon or say goodbye (nobody
  owns them); people walk through them so they never block a doorway.
- **Library layout fixes** (2026-11-20): no hanging lamps (they cluttered the camera), every seat
  reachable, a seat within reach wins E over a spot's action, every place has its own light at
  night, card tables in walnut not casino felt, rooms open closer (old 120% is the new 100%).

## Activities

- **One flow for every activity** (the owner insisted): spot → lobby → Start → Playing →
  Results. No spectators, no bots, no cooldowns.
- **Table games live only in their panels** (2026-11-21): one place for the game is simpler to
  build and keep in sync; watchers step onto the rug.
- **A big panel is a theater** (2026-11-20/21): it dims the room and opens with the chat closed;
  Chat opens it beside the panel, the same in every theater.
- **The whiteboard is always on, small and quiet** (2026-11-20): no E, no rug; E on the first visit
  only was confusing.
- **Watch together:** paste a YouTube link (no search: ~100 searches a day of quota), anyone
  watching controls it, guests too; no ducking when people talk; the game server checks links with
  YouTube first; the TV starts only from its button (E always sits).
- **Pick a Side:** two modes, Would you rather and Quiz (Last one standing dropped 2026-11-21:
  knocked-out people just watched); playable alone; 2×2 square zones, opaque, letters only.
  **Decks belong to the room**, not the person (2026-11-23): a deck of inside jokes is the group's.
- **Draw & Guess** (renamed from Drawing telephone): panel only; the album plays in step for
  everyone; the server asks each page for its half-finished turn rather than trusting browser clocks.
- **Chess:** casual, no clock, our own pieces. **Slave:** Thai rules without straights, bombs or
  revolution; 6 seats because friend groups are often 5–6.
- **Dropped:** the shared jukebox (2026-11-09), AI flashcards (2026-11-09, "I don't need this"),
  Werewolf (2026-11-20: a whole second game for 6+ people while most groups are 2–4), Color Cards
  (2026-11-21: one card game done well first, and Uno-like is someone else's product), music bots,
  emotes, a photo gallery.

## Study

- **Personal timer only**, 25/5 and 50/10, no streaks, private to-do.
- **The game server times every round** (2026-11-23), so no browser can claim minutes; rounds are
  saved through a job so they survive an API restart. Each person's own time zone sets the day.
- **Everyone ranking kept** (the owner wanted it): opt-in, on by default 18+, off under 18, capped
  at 12 h a day. Blocked people are never listed but still count in your rank.

## Business

- **One subscription, Connecta Plus** (2026-11-09): ฿89 / ฿890. Room boosts and packs dropped.
  Limits live in one place (`ROOM_PLANS`) until the playtest tunes them.
- **A room follows its owner's plan.** **Never:** sell power, ads in rooms, charge to join, room
  colours or signs.
- **Coins are earn-only** from three simple daily quests that each count one event the server
  already sees. **The Shop sells only things that show on your character** (selling emoji items
  was turned down). Photo frames dropped.
- **Pets are room cats in Shop coats** (2026-11-23, the owner's idea): they reuse the server's cats
  instead of trailing you; only the owner sends one home.
- **The game server takes looks and pets only from the API**, so nobody wears what they didn't buy.
  The 5 s look cooldown is the API's too (2026-11-24), not only the browser's.
- **Stripe, with a local stand-in until the owner adds keys** (2026-11-23).
- **Gift Plus starts at once** (a gift waiting to be opened gets forgotten); friends only.
- **When Plus ends, nobody is sent out** (2026-11-23): rooms keep 7 days of grace, then new people
  wait at the door.
- **A refund gives money back and leaves Plus alone** (2026-11-24): most refunds are mistakes
  where the person keeps what they meant to buy.
- **Receipts are our own printable page, the card is changed on Stripe's** (2026-11-24): a page
  works for every payment (Stripe's or the stand-in's) with nothing to build or store, and
  Stripe's billing page means we never handle card details.

## Moderation

- **Common rooms are text only for everyone** (2026-11-09): nobody runs them and the team can't
  watch every copy. 25 per copy, 5 kept for friends.
- **Cheap layers first:** a word filter that **masks** messages but **refuses** names (a name of
  asterisks helps nobody); OpenAI's free picture check behind a key.
- **10 reports an hour per person** (2026-11-24): plenty for a bad night, not enough to flood the
  team. **The whiteboard has a per-person budget** like movement's, sized so a fast pen never hits it.
- **Guests answer the age question too** (2026-11-24): a neutral "Under 13 / 13 or older" at the
  guest door, under 13 locked a day like sign-up. Common rooms stay open to guests (they're how
  people try Connecta).
- **A guest's report mute is kept on their visit** (2026-11-24), so walking back in doesn't end it.
  A new browser escapes it; fingerprinting devices isn't worth it.
- **Room mods' actions go in the team's audit log** (2026-11-24, as `roommod.*`), so reports can be
  read beside them; mods themselves don't see a log.
- **Report steps count only accounts that are there, once each** (2026-11-24): guests are free to
  make, so five guests can't push someone out. Only the team sees reports; mods may be the problem.
- **No vote-kick** (groups bully with it), **no automatic strikes**, **no voice recording, ever.**
- **The team flag is set by a script, never by the app** (2026-11-24): no screen can make staff.
- **A suspension signs the person out everywhere at once**; appeals are email replies.
- **Reports become cases**, grouped per person, message or room, decided once.
- **Platform settings live in the database, shared through Redis** (2026-11-24), so the team edits
  them on the admin site and every process applies them at once.

## Engineering

- **Built fresh** (2026-11-21): `apps/web` started as a copy of the approved demo and the backend
  was written new, rather than carrying over an older codebase's structure.
- **The stack:** NestJS 12 with a generated OpenAPI client, Prisma 7 on Postgres, Colyseus for
  rooms, self-hosted LiveKit, a Socket.IO gateway as the API's second entry point, Redis between
  instances, BullMQ for jobs. Zod through Standard Schema (Swagger reads the same schemas), not
  class-validator. Vitest, not Jest. Prisma lives in `apps/api`, not a package: the game server
  asks the API.
- **The browser only calls its own site** (2026-11-21): relative paths, a Next rewrite locally and
  nginx in production, so cookies need no CORS and one build fits every environment.
- **REST writes, the gateway delivers** (2026-11-22): writes are validated and typed like every
  other call; the gateway only checks sessions and relays. Socket.IO over plain WebSockets for
  reconnecting and the Redis adapter.
- **The game server trusts a signed join ticket, not the database** (2026-11-22): it would
  otherwise need a second copy of the rules and the auth setup.
- **Chat pictures upload straight to S3** with presigned links; locally through `/api/dev-storage`
  because the AWS Emulator refuses browsers. Uploading through the API was turned down (every byte
  on the API server).
- **Local AWS is the AWS Emulator, plus Mailpit** (2026-11-21): LocalStack now needs an account and
  MinIO's free edition is archived.
- **API tests use a real Postgres** (2026-11-21): sign-in is mostly database work; faking Prisma
  would test the fake. Only email is faked.
- **`packages/shared` is built to `dist/`**: Node can't load TypeScript from another package.
- **`node-linker=hoisted`**: an isolated layout installs two `@colyseus/core` copies.
- **One seed for the whole app** (2026-11-24): the approved designs' people and rooms, so the app
  looks like what was approved; a rerun clears only seed rows.
- **Invite and friend links open "Join Connecta"** (2026-11-24): most people opening them are new;
  an existing account signs in on the same page.
- **Old rows go on a timer** (2026-11-24): guests 30 days after their last session expires (a
  returning guest is a new account anyway), quest progress after a week.
- **Which room you're in is only ever the game server's to say** (2026-11-24): the browser's
  presence sends only how long it's been idle. Signed out, `/api/me` answers 204, not 401.
- **Countdowns use the game server's clock** (2026-11-24), learned with a ping on joining (the
  fastest of three), not the computer's.
- **Test tools, development only** (2026-11-24): "View as" and scripted fakes showed things the
  server wasn't doing, so only what a tester can't get otherwise stayed.

## Infra

- **AWS, behind nginx** (2026-11-21): Azure was considered and dropped; nginx over Caddy as the
  more common choice; certbot over an ALB (~$16+ a month). See [infra.md](infra.md).
- **Only the owner provisions** cloud resources. Agents suggest steps and run read-only checks.
- **Local development only** until the owner says deploy.
