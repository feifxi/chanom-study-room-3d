# 14. Common rooms, open rooms and moderation

**Status:** decided and built in the demo. **Try it:** http://localhost:3100 with the Demo tab's
**View as**:

- Discover → **Common rooms** → Cat Café → **Walk in**: you land in Mook's copy (a friend). Mic off,
  no Room chat or pictures, Watch together and Werewolf say "Not in Common rooms", 3 s slow mode.
- View as **Guest**: Discover works; other pages show what an account adds; open rooms say "Sign up
  to join".
- View as **Member** in Chanom Friends: the Room card shows **About** (with the rules) and **Report
  this room**.
- View as **Connecta team**: avatar menu → **Admin site** (`/admin`). In a Common room, a person's
  "…" has the team's actions.

Two kinds of room anyone can walk into: **Common rooms**, run by Connecta and safe for strangers by
design, and **open rooms**, run by their owners. Plus the moderation that keeps both in order, and
the team's admin site.

## Common rooms

Rooms run by Connecta, one per template, that anyone can walk into, guests included. The name comes
from a school's common room: a shared space run by the place, not by a member.

### Safe for strangers by design

Nobody runs a Common room and the team can't watch every copy, so the risky parts are off for
**everyone**, accounts included:

- **Text only:** no voice, no pictures, no watch together, no screen share. Bubbles only (no saved
  chat, as before). Since nobody talks, guests and accounts get the same rules.
- **Games that work without voice:** card games, Draw & Guess, Pick a Side, the whiteboard.
  **Werewolf is off** (it's built around talking).
- **Slow mode** for everyone (one bubble every 3 s), and **links aren't clickable**.
- The Room card explains it: "Common room · run by Connecta. Text only, so it's comfy with strangers."

Open rooms are different: an owner chose to open them and runs them with mods, so they keep
everything (voice, pictures, videos). Going into a stranger's open room means accepting how that room
is run.

### Types and copies

- **Library** (quiet study), **Cat Café** (chill and chat), **Starry Rooftop** (late-night talks). A
  copy is named "Library Common Room #2".
- **A copy holds 25 people, and 5 of those seats are kept for friends.** Walk in stops placing
  strangers in a copy at 20; the last 5 seats are only for people joining a friend inside. A copy never
  goes past 25. A new copy opens when every copy has 20; empty copies close. No merging.
- **Walk in** (Discover, Home's "Open now") lands you in the copy with the most friends, otherwise the
  **busiest copy still taking strangers** (under 20; busy feels alive).
- **Joining a friend** from Home or the Friends page lands in that friend's copy. If it's at 25 (rare),
  you land in the busiest other copy: "Mai's copy is full, so you're in #3."

### Keeping order without mods

- Reports do the work: **5 reports in 30 minutes from different accounts → out of Common rooms for 1
  hour**, and the case goes to the team. (Rooms with mods keep feature 3's "3 in 10 minutes → muted 15
  minutes".)
- No vote-kick (groups use it to bully).
- A **Connecta team** account inside a Common room gets a "Connecta team" chip and, in each person's
  "…": Time out, Remove from Common rooms (1 h), Open in the admin site.

## Open rooms in Discover

- **Anyone can list a room:** no account-age rule and no extra limits for new accounts. Sign-up
  already verifies an email or uses Google or Discord; reports and delisting cover the rest.
- **Tags:** 1–3 from a fixed list (Study, Chill, Games, Language exchange, Music, Art, Anime, Late
  night) plus a **language** (Thai, English, Japanese, Korean, Chinese, Mixed). No free-text tags.
  Set in Room settings → Overview.
- **Order:** friends inside first, then most people inside now, then newest; empty rooms sink.
  Filters: tag chips and a language picker.
- Discover has two sections: **Common rooms** (run by Connecta · anyone welcome · text only) first,
  then **Open rooms** (made by people · voice on · run by their owners and mods).
- Guests can browse Discover and walk into Common rooms; open rooms say "Sign up to join".

## Moderation layers

Every message, picture and room name goes through one `moderate()` step. Each layer can be switched
on or off in the admin site, cheapest first:

1. **Word filter** (free): `obscenity` plus our own list, Thai included.
2. **Limits:** slow mode, link caps.
3. **Report thresholds:** 3 reports in 10 minutes → muted 15 minutes (rooms with mods); 5 in 30
   minutes from different accounts → out of Common rooms for an hour.
4. **OpenAI's free Moderation API** for pictures and smarter text checks (confirm it's still free
   when building). Paid AI checks only if needed later.

## Reporting a room

- In the room's "…" menu (Home), the Room card in 3D ("Report this room", not for your own room) and
  the open room preview in Discover.
- Reasons: its name or picture, its description or rules, what goes on inside, spam or a scam,
  someone may be in danger, something else; optional details.
- Goes to the **Connecta team only** (the room's mods may be the problem), anonymous. The team can
  **delist** it from Discover or **close** it.
- Common rooms have no "report this room": you report the person.

## The admin site (`/admin`, Connecta team only)

Everyone else gets "page not found". Left nav:

| Page             | What it does                                                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**     | Online now, in rooms now, open reports, sign-ups today, Plus subscribers, AI decks today; a health strip (game servers, voice, chat gateway, database, errors, moderation API) and a Grafana link; "Needs you" (urgent reports) and the latest actions. |
| **Reports**      | The queue, urgent first. Each report: what and who, reason, how many accounts reported, where, what the automatic layers already did, the messages around it, earlier actions. Actions by kind (below).                                                 |
| **Users**        | Every account: search by name or @handle, filters (reported, suspended or banned, under 18, Plus); warn, suspend 1 or 7 days, ban, lift, reset name.                                                                                                    |
| **Rooms**        | Every room: who can join, inside, members, reports, state; delist / relist, close / reopen.                                                                                                                                                             |
| **Common rooms** | Copies per template and how full; seats per copy (25) and seats kept for friends (5); the fixed rules; a notice banner in every Common room (maintenance, events).                                                                                      |
| **Moderation**   | The `moderate()` layers on or off, the automatic report steps, our word list (Thai included).                                                                                                                                                           |
| **Maps**         | The map editor (feature 7).                                                                                                                                                                                                                             |
| **Audit log**    | Every team action and automatic step, kept a year, read-only.                                                                                                                                                                                           |

- **Report actions:** a person → warn, suspend 1 day, suspend 7 days, ban; a message → delete, delete +
  warn, delete + suspend 1 day; a picture → delete, delete + suspend 7 days, delete + ban; a room →
  delist, close, close + suspend the owner. Or dismiss.
- **The team decides by hand: no automatic strikes.** The only automatic steps are the report
  thresholds and the picture check hiding a picture.
- **Every action emails the account** with the reason; they **reply to appeal** (no appeal form).
- **No voice recording, ever** (privacy and cost). Voice reports go by how many people reported and
  the account's history.

## Backend notes

- Common rooms: a `common_room_types` table (template, name, vibe) and copies as ordinary Colyseus
  rooms with `kind = 'common'`; the room sets the rules (no LiveKit publish grant for anyone, no
  picture uploads, slow mode, Werewolf and the big screen off). Matchmaking: friends' copy, else the
  busiest one with fewer than capacity − friend seats, else open a new copy; both numbers are admin settings.
- Reports: `reports(id, target_kind, target_id, reason, details, reporter_id, room_id, context jsonb,
created_at, status, outcome, decided_by)`. Thresholds count distinct reporters in a window (Redis).
- Account actions: `account_actions(user_id, kind, until, reason, by, at)`; a suspension blocks
  sign-in and kicks live sessions. Room delist/close is a column on rooms.
- Audit log: append-only `audit_log` (who, action, target, reason, at), 1-year retention.
- Admin site: team accounts have a `team` flag; `/admin` routes 404 for everyone else.
- Cost: nothing new beyond storage; the picture check stays on OpenAI's free moderation endpoint.

## Not now

- Vote-kick, appeal forms, automatic strikes, voice recording or voice AI moderation, paid AI text
  checks, team roles inside the admin site (everyone on the team can do everything for now).
