# 14. Common rooms, open rooms, moderation, admin site

Two kinds of room anyone can walk into: **Common rooms**, run by Connecta and safe for strangers
by design, and **open rooms**, run by their owners. Plus the moderation that keeps both in order
and the team's admin site.

## Common rooms

Connecta-run copies of each map (Library, Cat Café, Starry Rooftop: "Library Common Room #2").
Anyone walks in, guests too.

- **Safe for strangers by design, for everyone:** text only (bubbles; no voice, pictures, videos or
  screen share), slow mode (one bubble every 3 s), links not clickable. Card games, Draw & Guess,
  Pick a Side and the whiteboard still work.
- **A copy holds 25, with 5 seats kept for friends:** strangers stop being placed at 20; a new copy
  opens when every copy has 20; empty copies close. Both numbers are admin settings.
- **Walk in** lands in the copy with the most friends, else the busiest still taking strangers.
  Joining a friend lands in their copy (if it's full, the busiest other one, and you're told).
- No mods: the report steps and team accounts keep order. No vote-kick (groups bully with it).

## Open rooms in Discover

- Anyone can list a room (no account-age rule). **Tags:** 1–3 from a fixed list (Study, Chill,
  Games, Language exchange, Music, Art, Anime, Late night) plus a language. No free-text tags.
- Order: rooms with your friends inside first, then the most people inside now, then the most
  members. Cards show how many are inside now.
- Discover shows **Common rooms** first, then **rooms by people**. Signed-out visitors browse it
  too; listed rooms say "Sign up to join".

## Moderation layers

Every message, bubble, name and room text goes through one step, cheapest first; each can be
switched on or off on the admin site:

1. **Word filter** (free): `obscenity` plus our own list, Thai included. Messages and bubbles are
   **masked** (`****`); names, @handles and room text with a blocked word are **refused**. Rooms can
   turn masking off for their own chat (and their decks and Draw & Guess writing, which follow the
   same switch); DMs, names and Common rooms are always filtered.
2. **Limits:** slow mode.
3. **Report steps:** in a room, 3 reports in 10 min → muted there 15 min (a mod's timeout, never
   the owner; a guest's mute holds if they walk back in); in Common rooms, 5 in 30 min → out of every Common room for an hour. Only accounts
   that are there count, once each; guests can report but don't count. A muted person is told who
   did it: a mod, reports from people there, or the Connecta team. People inside a room the team
   closes are told it was closed.
4. **Picture check:** OpenAI's free moderation endpoint; a flagged picture is dropped. Off until
   `OPENAI_API_KEY` is set.

## Reports

- Report a **person** (people list or DM), a **message** (hover), or a **room** (its menu, the Room
  card, the Discover preview; not Common rooms). Reasons from a fixed list, optional details, "Also
  block".
- **Only the Connecta team sees reports**, never the room's mods, and nobody learns who reported.
- **10 reports an hour** per person; past that, "the team has your reports" until the hour passes.
- A report keeps the context: messages around it, the person's recent messages, and the bubbles the
  reporter's screen showed (bubbles aren't stored).
- **No voice recording, ever.**

## Team accounts and the admin site

- `users.team` is set **only by a script**: `pnpm --filter @connecta/api team <handle> [off]`. No
  screen can make someone staff.
- In a Common room a team account has a "Connecta team" chip and, per person, Time out (follows the
  person into any copy) and Remove from Common rooms (1 h).
- **`/admin`** answers "page not found" to everyone else:

| Page         | What it does                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Overview     | online now, in rooms, open reports, sign-ups, Plus members, messages; a health strip; urgent cases |
| Reports      | cases (all reports about one person, message or room), urgent first; one decision closes the case  |
| Users        | search and filters; warn, suspend 1 or 7 days, ban, lift, reset name                               |
| Rooms        | delist / relist, close / reopen                                                                    |
| Common rooms | copies and how full, seats, a notice banner for every Common room (10 min)                         |
| Moderation   | the layers on or off, our word list                                                                |
| Money        | revenue, payments, refunds ([15](15-plus-coins-shop.md))                                           |
| Maps         | lists the maps; the editor comes with Blender ([7](07-maps.md))                                    |
| Audit log    | every team action, automatic step and room mod action (kick, ban, time out, mods), kept a year     |

- **Urgent first:** sexual content, danger, anything an automatic step acted on, or 3+ reporters.
- **A suspension or ban** stops sign-in and signs the person out everywhere at once; signing in
  shows until when, why, and "reply to our email to appeal". Team accounts can't be acted on.
- **Every action emails the account with the reason.** Appeals are replies; no form.
- **No automatic strikes:** the team decides by hand. Delisting keeps a room working for members;
  closing stops everyone walking in or chatting (members and messages stay, so it can be undone).

## In the code

- Common rooms: types in `packages/shared/src/common.ts`; `apps/api/src/common/` picks the copy and
  signs a ticket with `common: true`. **Copies have no database rows:** a copy is a game-server
  room (`common-library-2`); who's in it comes from presence, and a fresh ticket holds its seat for
  30 s. The URL names the type (`/common/library`).
- Word filter: `packages/shared/src/moderate.ts`, its own entry so the web app doesn't ship the
  word lists. The API masks chat and refuses names; the game server masks bubbles.
- Reports: `apps/api/src/reports/` (counts in Redis sorted sets per window), reasons and steps in
  `packages/shared/src/reports.ts`.
- Admin: `apps/api/src/admin/`, `src/audit/`; web `apps/web/src/app/admin/`.
- **Platform settings** (word list, switches, Common seats) live in the database
  (`apps/api/src/settings/`); the API writes the whole set to Redis on every change and every API
  process and game server applies it at once.
- Suspensions: Better Auth's `session.create.before` hook refuses the sign-in.

## Not built yet

- **An "Open Grafana" link** on the admin overview, once monitoring is deployed ([infra](../infra.md)).
- **A smarter text check** (OpenAI moderation on what the word filter lets through), a switch on
  the admin site's Moderation page, off until needed. Only if the free endpoint stays free.

## Not doing

Vote-kick, appeal forms, automatic strikes, voice recording or voice AI moderation, paid AI text
checks, team roles inside the admin site.
