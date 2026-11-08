# 1. App shell and navigation

Status: final (2026-11-08). The user and the team chose this layout; the other layouts and
design variants were removed from the demo. Overview and the room model:
[`docs/v2-plan.md`](../../v2-plan.md).

Try it: `pnpm --filter @study/demo demo:dev` → http://localhost:3100. The Demo tab (right edge)
switches theme and palette, fills the 3D room's people list with a crowd (50 or 100), and
jumps to any page.

## Why it looks like this

Two rounds of Discord-shaped layouts (a server column, a channel list, then the page), restyled four
ways, still read as a Discord copy to the team. The structure caused that feeling, not the colours.
So the shell follows Gather instead:

- **The room is the app.** There's no server page and no channel list.
- **Everything else is a panel over the room:** chat, people, settings.
- **Discord's features stay** (chat, mentions, DMs, roles, invites, boosts). Only where they live changes.

## Screens

### Home (`/home`)

- **Slim header:** logo, Home / Friends / Discover / Shop, a Messages button (DMs in a popover with
  unread counts and "See all messages"), and your avatar menu (character & settings, shop with
  coins, Connecta Plus, sign out).
- **"Friends out right now":** one chip per friend in a room. Tapping it walks you in.
- **Your rooms** = the rooms you own **and** the rooms you're a member of, in one list.
  - **Order:** pinned first, then rooms where something is happening (people inside, unread), then the rest.
  - **Filters and search:** All / You run / Active, and "Find a room".
  - **Scale (tested at 100 rooms, the join limit):** the first 6 are big cards (pinned and active
    ones). The rest are compact rows with the same facts and "…": 8 rows, then "Show all", sortable
    Recent / A–Z. Rooms nobody's opened for 30+ days fold away under **"Quiet for a while · N"**,
    which suggests leaving the ones you don't need. Searching or filtering lists every match.
  - **A card shows:** a picture of the map, `inside/capacity`, an unread chip (`@ you · 3 new` for
    a mention), boost level, pinned, your role (owner/mod), the faces inside, **Walk in** and **Chat**.
  - **Clicking a room** opens its page (the chat outside 3D, with its info on the side). Walk in enters 3D.
  - **When it's full:** the chip says `25/25 full` and Walk in becomes **Full · notify me**. Chat still works.
  - **"Make a room"** in the section header: a name and a map.
- **The "…" on a room** (cards, rows, the room's Chat page): About this room, Invite friends, Copy
  room link, Pin / Unpin, Mark as read, Notifications (every message / only @mentions / nothing),
  **Room settings** (owners and mods: edit the room from Home without walking in), Boost this room,
  and Leave room (members; owners transfer or delete in Settings).
- **About this room:** a quick card with everything: picture, description, next event, map, who can
  join, members, inside now, owner, mods, boosts and your role, plus Walk in / Chat / Settings.
- **"Open now":** two open rooms you're not in (friends inside first) and two drop-in rooms, with
  "See all in Discover". Home suggests; Discover is the full list with search and tags.
- **Open room cards** show how full the room is (`41/50`, members). **Drop-in cards** show everyone
  across its copies instead (`142 here · 8 rooms open`), since copies open as people come.

### Messages (`/home/messages`)

- **Left:** your conversations (newest first, unread in bold, "You:" on your own last message),
  then friends you haven't messaged yet. Each friend shows where they are ("in 🍓 Chanom Friends").
- **Middle:** the chat. Header: who, where they are, **Join them**, search, and "…" (Invite to a
  room, Mute this chat, Block, Report). **No call button:** DMs are text only; to talk, meet in a room.
- **Right:** their profile, "Right now" with Walk in, and the rooms you share.
- **Phones:** the list, then the chat full screen with a back arrow.

### Discover (`/discover`)

- **Open rooms:** made by people and set to Open (owner, members, saved chat, one copy: full is
  full). Search and tags. Buttons: Walk in (you're a member), Join & walk in, Ask to join, or Full.
- **Drop-in rooms:** run by Connecta from templates. No members, no saved chat; a new copy opens when one fills.

### A room's chat, outside 3D (the room's URL)

- The permanent chat full size, over a blurred picture of the room.
- **Header:** back to Home, the room (name, boost level, map, `inside/capacity`), Invite, Settings and a big **Walk in**.
- **Side panel:** who's inside now, then the other members.
- **Pinned on top:** the next event.
- **Visibility:** "You're reading from outside · nobody sees you". You don't appear in the room, and voice is off.
- **Who uses it:** phones, slow laptops and quick replies. 3D is one tap away.
- **Links:** any link to the room's chat opens this page.

### Inside the room (3D)

The HUD has five named parts. Each owns one kind of thing, so it's always clear where to look:

| Part          | Where         | What it holds                                                              |
| ------------- | ------------- | -------------------------------------------------------------------------- |
| **Room card** | top left      | the room itself: name, map, who's here; Invite, Settings, Your view, Leave |
| **My tools**  | left rail     | your own things: Study session, Music, How to play                         |
| **Chat**      | bottom left   | all text: Room chat, Bubbles, Messages                                     |
| **People**    | top right     | who's here, and what you can do with each person                           |
| **Zoom**      | bottom right  | − 175% + (not on touch screens)                                            |
| **Dock**      | bottom centre | your voice and actions: Mic, Sound, Chat, Photo, Activities                |

Plus the **chat window**: Room chat or a DM opened large over the dimmed room (⤢ in Chat).

- **Every HUD panel closes when you press anywhere else** or hit Escape (room card, people, my
  tools). Chat stays open; the Chat button in the dock shows or hides it. Menus and dialogs opened
  from a panel don't close it.
- **Room card** (300px). Like Gather there's no back button: you're in the room or you've left it.
  Expanded:
  - Invite friends, and Settings (members only)
  - **Your view** (only you see it): Clock / Day / Night, and Battery saver. Moved here from My
    tools: it's about the room, set once and rarely touched.
  - **Leave room** at the bottom; goes to Home. Guests can expand the card too (Invite copies the link).
- **My tools:** Study session (Pomodoro, to-do, Focus today), Music, How to play.
- **Chat**, one panel with three tabs, so the room's main text is always one tap away:
  - **Bubbles** (first tab, the default): what people say out loud right now. It pops over their
    head and is gone when the room empties. In the room you're there to talk to whoever is around,
    so the live conversation comes first.
  - **Room chat**: the room's saved chat, the same one as the Chat page outside 3D. Its unread count
    stays on the tab, with an @ when someone mentions you. Drop-in rooms have no saved chat, so no tab.
  - **Messages**: your DMs; open one to read and reply inside the panel.
  - Unread counts sit on the tabs. Photos show inline in the small panel (like a chat bubble on the
    web); tapping one, or ⤢, opens Room chat or the DM in the big chat window.
- **People:** a pill of faces with the count; whoever is talking shows first.
  - Tapping it opens one people panel (no folded rail mode), built to work with 100 people:
    - a **Talking** strip on top, since that's what you look for in a voice room
    - **Find someone** search and filter chips with counts: Mic on, Focusing, Friends, Guests
    - the list grouped as You, Friends, Everyone else (A–Z), Guests, with sticky group headers
    - each row: face with a mute/deafened badge and a speaking ring, name, owner/mod/guest chip, status
    - tapping someone shows a path to them ("Showing")
  - **The "…" on each person** holds everything else:
    - for everyone: Find in the room, Send a message, Add friend, Mute for me (only you stop
      hearing them), Block, Report (a reason, optional details, "also block"; goes to the Connecta
      team and the room's mods, anonymous)
    - guests have no account, so no message or friend actions on them
    - **Moderate** (owners and mods, in the same menu, so there's no separate admin screen): Mute
      for everyone, Kick (they can come back with an invite), Ban (they can't; unban in Settings →
      Members), and for the owner Make mod / Remove mod. Kick and ban ask to confirm and take an
      optional reason, shown to them and kept in a mod log.
    - a mod can act on members and guests; the owner on everyone but themselves
- **Zoom** (bottom right, from V1): − 175% +, which also follows scroll zoom. Rooms open at 175%;
  100% is the whole library in view, and it goes from 55% to 340%. Hidden on touch screens: they
  pinch, and the tablet joystick has that corner.
- **Dock:** Mic, Sound, Chat, Photo, Activities. Screen share only appears once you're seated at a desk.
- **Phones:** People and Chat share one bottom sheet. **Tablets:** the joystick sits bottom-right,
  because Chat has the bottom-left.

### Room settings

Opened from the room's "…" (Home or the Chat page), its Chat page, or the Room card in 3D. Tabs:
Overview (name, description, who can join, and for the owner a danger zone: transfer ownership,
delete), Map & capacity, Members & roles, Invites, Safety, Boosts.

- **Who can join:** Private (invite only, not listed), Ask to join (listed, mods approve), Open (listed, anyone can walk in and join).
- **Members vs capacity:** two different limits, explained on the Members tab. Members: 150
  free, 300 / 500 / 1,000 with boosts. Capacity: how many are inside at once (25 / 50 / 100 by boosts).
  When it's full, members wait for a spot or ask to be told; the owner and mods always fit.

- **Map:**
  - Pick a template.
  - If people are inside, the switch waits until the room empties; "Switch now" gives everyone a heads-up and reloads them.
  - The chat, members and link stay either way.
- **Capacity:** a slider up to the boost level's limit (25 / 50 / 100). When it's full, it's full.
- **Boosts:** the current level, progress to the next, every level's perks, and "Boost this room".
  Anyone can boost; Plus includes 2 boosts.

### Phones

- **Home:** a single column, with the header icons compacted.
- **Room chat:** full screen, with the people panel hidden.
- **3D:** the compact HUD, as before.

## Theme and palettes

- Light and dark, plus ten drink palettes (each with light and dark).
- Only these remain switchable in the demo.

### Tried and removed (2026-11-08)

- **Discord-structured layouts:** Rails and its restyles (Notebook, Stickers, Tinted).
- **Other shells:** Top bar, Dock and Town.
- **Old page designs:** the Home designs (Live, Dashboard, Feed), the server page designs, and the
  room HUD variants (One bar, Sidebar, Zen).
- One bar's people pill was kept and now sits top right in the room.
- The people panel's two modes (a small list that folded into a rail of faces) were replaced by one panel.

## Backend notes

- **Moderation** is enforced server-side: kick/ban remove the Colyseus client and a ban is checked
  at join; "mute for everyone" revokes the LiveKit publish permission; "mute for me" is client-only.
  Every mod action is written to a mod log (who, what, reason).

- **The Chat page doesn't join Colyseus.** It needs only the chat/presence gateway (WebSocket) and
  the REST API, so reading a room from a phone costs almost nothing.
- **Home's live data** (who's inside, unread per room) comes from the presence gateway, not by polling each room.
- **Room cards need a recent picture** of each map. Start with one static image per template; a
  periodic snapshot of each room is a later nice-to-have.
- **Capacity is enforced by Colyseus** at join time (`maxClients` from the room's boost level).
- **Switching maps** is a field on the room plus a "pending map" applied when the room empties, or on Switch now.

## Open questions

- **Two chats in 3D:** now named **Room chat** (saved) and **Bubbles** (out loud, gone when the
  room empties), as two tabs of Chat. Still open: merge them, so every Room chat message also pops
  over the sender's head and the Bubbles tab goes away?
