# 14. Common rooms, open rooms and moderation

Status: decided and built in the demo (2026-11-09). Overview: [`docs/v2-plan.md`](../../v2-plan.md). Room
roles, kick, ban and time out: [`03-rooms-membership.md`](03-rooms-membership.md). Reporting a person:
[`01-app-shell.md`](01-app-shell.md).

Try it: `pnpm --filter @study/demo demo:dev` → http://localhost:3100. The Demo tab's **View as**
switches who you are: Guest, Member, Mod, Owner, Connecta team (or "As in the mock").

- Discover → **Common rooms** → Cat Café → **Walk in**: you land in Mook's copy (a friend). Mic is
  off for everyone, there's no Room chat or pictures, Activities shows Watch together and Werewolf as
  "Not in Common rooms", and bubbles have a 3 s slow mode.
- View as **Guest**: Home, Friends and room chats show "This page needs an account"; Discover works;
  open rooms say "Sign up to join".
- View as **Member** in Chanom Friends: the Room card shows **About** (with the rules), not Settings,
  and **Report this room**. View as **Owner** or **Mod** for Settings.
- View as **Connecta team**: header menu → **Admin site** (`/admin`). In a Common room, a person's
  "…" has the team's actions.

## Common rooms (were "drop-in rooms")

Rooms run by Connecta, one per template, that anyone can walk into, guests included. The name comes
from a school's common room: a shared space run by the place, not by a member.

### Safe for strangers by design (decided 2026-11-09)

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

- **No account-age rule** for listing (the 7-day idea was dropped): every sign-up already verifies an
  email or uses Google/Discord, and reports plus delisting cover the rest.
- **Tags:** 1–3 from a fixed list (Study, Chill, Games, Language exchange, Music, Art, Anime, Late
  night) plus a **language** (Thai, English, Japanese, Korean, Chinese, Mixed). No free-text tags.
  Set in Room settings → Overview.
- **Order:** friends inside first, then most people inside now, then newest; empty rooms sink.
  Filters: tag chips and a language picker.
- **No extra limits for new accounts** (the "under 24 hours" idea was dropped: Common rooms already
  block pictures and links for everyone, and open rooms are their owners' call).
- Discover has two sections: **Common rooms** (run by Connecta · anyone welcome · text only) first,
  then **Open rooms** (made by people · voice on · run by their owners and mods).
- Guests can browse Discover and walk into Common rooms; open rooms say "Sign up to join".

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

## Settings audit (done with this feature)

Where each setting lives now:

- **Room settings → Overview:** name, description, **thumbnail** (moved from Map & look), who can join,
  **tags and language** (new), **people at once** (moved). Danger zone.
- **Map & look:** template, size, time of day only.
- **Invites:** member links, members can invite, **allow guests** (moved), guests can use voice.
- **Rules & safety** (was Safety): **the room rules text** (new; the "show rules before joining" toggle
  had nothing to show), show rules before joining, word filter, slow mode, new members wait,
  **room-wide games** (moved).
- **Members never open Room settings**: the Room card shows **About** (the room's facts and rules)
  instead; mods land on Members & roles.
- **Your own settings inside 3D:** only from the Room card (expand it → Your settings: My look, Voice &
  sound, Notifications, Privacy, All your settings).
  Not on the My tools rail, which stays for things you use while there (decided 2026-11-09). Same
  dialog as on Home, opening on the tab you picked. Guests have none.

- **Changing your look in a room is live** (decided 2026-11-09): Save in My look swaps your character
  for everyone on the spot with a little sparkle, no rejoin. At most once every 5 s; the server checks
  you own the items. Guests keep the look they picked on the invite page.
- Removed: the "Bouncy animations" switch (everyone gets the bounce). The friend-request switch became
  three plain choices: Anyone / People from my rooms / Nobody.

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
