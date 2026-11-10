# 1. App shell and navigation

**Status:** decided and built in the demo. **Try it:** http://localhost:3100/home

The shell follows Gather, not Discord: **the room is the app.** There's no server page and no
channel list; Home lists your rooms, a room's page is its chat, and inside 3D everything is a panel
over the room. Discord's features (chat, mentions, DMs, roles, invites) stay; only where they live
changes. Why: [decisions.md](../decisions.md#concept).

## Pages outside 3D

### Header (every page)

- **Desktop:** logo, Home / Friends / Focus / Discover / Shop, 🔔 Inbox, Messages, your avatar menu
  (character & settings, Shop with coins, Connecta Plus, sign out).
- **Phones:** logo, Inbox, Messages and avatar on top; the five pages move to a **bottom tab bar**
  (hidden inside a DM thread, where the message box owns the bottom).
- **Guests** see only Discover and Sign up. Any other page shows what an account adds, with Sign up
  and Browse Common rooms.

### 🔔 Inbox

A popover with an unread badge, All / Unread and "Mark all read". Items open what they're about and
are kept 30 days. **In it:** friend requests, Ask to join replies and requests, @mentions in room
chats, space in a full room, events starting, Connecta team actions on your account. **Not in it:**
DMs (Messages has its own badge) and "a friend walked in" (never pushed, see feature 5). Inside a
room the same things arrive as toasts.

### Home (`/home`)

- **Friends out right now:** one chip per friend in a room; tapping it walks you in.
- **Your rooms:** rooms you own and rooms you're a member of, in one list.
  - Order: pinned, then active (people inside or unread), then the rest. Filters All / You run /
    Active, and search.
  - The first 6 are big cards, the rest compact rows (8, then "Show all", sortable Recent / A–Z).
    Rooms unopened for 30+ days fold under "Quiet for a while". Tested at 100 rooms.
  - **A card shows:** the map picture, `inside/capacity`, unread (`@ you · 3 new`), Plus badge,
    pinned, your role, faces inside, **Walk in** and **Chat**. Full rooms say `25/25 full` and offer
    **Full · notify me**; chat still works.
  - **Make a room:** a name and a map.
- **The room "…" menu** (cards, rows, the Chat page): About this room, Invite friends, Copy link,
  Pin, Mark as read, Notifications (all / @mentions / nothing), Room settings (owner and mods), Leave.
- **Open now:** two open rooms you're not in (friends first) and two Common rooms, then "See all in
  Discover". Common room cards show everyone across copies (`142 here · 8 rooms open`).

### Messages (`/home/messages`)

Conversations on the left (unread bold, friends you haven't messaged below), the chat in the middle
(header: where they are, **Join them**, search, "…" with invite, mute, block, report), their profile
and shared rooms on the right. **No call button:** DMs are text only; to talk, meet in a room. On
phones: the list, then the chat full screen.

### Discover (`/discover`)

Common rooms first, then open rooms with search and tags. Buttons: Walk in, Join & walk in, Ask to
join, or Full. Details: [14-open-rooms-moderation.md](14-open-rooms-moderation.md).

### A room's page: its chat outside 3D

The permanent Room chat full size over a blurred picture of the room, with the next event pinned and
who's inside on the side. Header: back, the room (name, map, `inside/capacity`), Invite, "…" and a
big **Walk in**. "You're reading from outside · nobody sees you": you're not in the room and voice
is off. It's how phones, slow laptops and quick replies use a room; 3D is one tap away.

## Inside the room (3D)

The HUD has six named parts, each owning one kind of thing:

| Part          | Where         | Holds                                                               |
| ------------- | ------------- | ------------------------------------------------------------------- |
| **Room card** | top left      | the room: name, map, who's here; This room + Your settings; Leave   |
| **My tools**  | left rail     | your things: Study session, Music, Quests 🎯, How to play           |
| **Chat**      | bottom left   | all text: Bubbles, Room chat, Messages; ⤢ opens the big chat window |
| **People**    | top right     | who's here and what you can do with each person                     |
| **Zoom**      | bottom right  | − 100% + (not on touch screens: they pinch)                         |
| **Dock**      | bottom centre | Mic, Sound, Chat, Photo, Activities; 🛡️ Room for owner and mods     |

- **Room card** (300 px, no back button: you're in the room or you've left). Expanded, it has two
  labelled parts so owners never mix them up: **This room** (Invite; Room settings for owner and
  mods, About & rules for members) and **Your settings** (My look, Voice & sound, Notifications,
  Privacy, Battery saver, Click to walk, All your settings). **Leave room** sits at the bottom.
  Your settings in 3D live only here, not on the My tools rail. **Changing your look is live:** a
  sparkle, no rejoin, at most once every 5 s; guests keep the look they picked.
- **Chat tabs:** **Bubbles** (default; said out loud, pops over heads, gone when the room empties),
  **Room chat** (the saved chat, same as the room's page; none in Common rooms), **Messages** (DMs).
  Emoji everywhere; pictures (up to 4) in Room chat and Messages, not Bubbles.
- **People:** a pill of faces, talking first. Opens one panel built for 100 people: search, filter
  chips (Mic on, Focusing, Friends, Guests), groups You / Friends / Everyone else / Guests. Tapping
  someone shows a path to them. Each person's **"…"**: Find, Message, Add friend, Mute for me, Block,
  Report (a reason, optional details, "also block"; anonymous, goes to the team and the room's
  mods), and for owner and mods **Moderate** (mute for everyone, kick, ban, make or remove mod; kick
  and ban confirm and take an optional reason). Guests have no message or friend actions.
- **Dock stays short:** only what most people use every session. Owner and mod tools live under 🛡️
  Room (today: Talk to everyone). Future occasional tools go in a **⋯ More** button, not the dock.
  Screen share appears only when seated at a desk.
- **Zoom:** rooms open at 100% (narrow screens open wider, so at least 9 m of floor fits across);
  range 37%–260%.
- **Panels close on any press elsewhere or Escape, and that press never walks you.** Neither does a
  press that only leaves a text box.
- **Phones:** the compact HUD (rail along the top, chat as a sheet, icon-only dock, joystick and an
  action button). **Tablets:** the joystick sits bottom right.

## Room settings

Opened from the room's "…", its page, or the Room card. Mods see only Members & roles, Invites and
Rules & safety. Members never open it: they get **About** (the room's facts and rules).

| Tab                 | Holds                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| **Overview**        | name, description, thumbnail, who can join, tags and language, people at once; owner: transfer, delete |
| **Map & look**      | template, size, time of day (live switch, feature 7)                                                   |
| **Members & roles** | members, requests, banned; what each role can do                                                       |
| **Invites**         | Members can invite, Allow guests, Guests can use voice; active links                                   |
| **Rules & safety**  | the rules text, show rules before joining, word filter, slow mode, new members wait, room-wide games   |

- **Who can join:** Private (invite only, the default), Ask to join, Open. See feature 3.
- **Members vs people at once:** members belong to the room (150 free, 1,000 with the owner's Plus);
  people at once is capacity (25 free; with Plus 50 on a Cosy map, 100 on a Big one). When it's
  full, members wait or ask to be told; the owner and mods always fit.

## Theme

Light and dark, plus ten drink palettes, each with a light and dark version.

## Backend notes

- **Moderation is server-side:** kick and ban remove the Colyseus client and a ban is checked at
  join; mute for everyone revokes LiveKit publish permission; mute for me is client-only. Every mod
  action goes in a mod log (who, what, reason).
- **A room's page doesn't join Colyseus:** only the chat and presence gateway plus the REST API, so
  reading a room from a phone costs almost nothing.
- **Home's live data** (who's inside, unread) comes from the presence gateway, not polling rooms.
- **Capacity** is enforced by Colyseus at join (`maxClients` from the owner's plan and map size).
- **Room pictures:** one static image per template to start; periodic snapshots later.
- **Inbox:** `notifications(id, user_id, kind, payload jsonb, created_at, read_at)`, written by the
  API, pushed through the gateway, rows older than 30 days deleted nightly.
