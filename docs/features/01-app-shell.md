# 1. App shell and navigation

**The room is the app** (like Gather, not Discord): no servers or channel lists. Home lists your
rooms, a room's page is its chat, and inside 3D everything is a panel over the room.
[Why](../decisions.md#concept).

## Pages outside 3D

- **Header:** logo, Home / Friends / Focus / Discover / Shop, 🔔 Inbox, Messages, avatar menu
  (character & settings, Shop with coins, Plus, Admin site for the team, sign out). On phones the
  five pages move to a bottom tab bar (hidden inside a DM thread).
- **Guests and signed-out visitors** see only Discover and Sign up. Other pages show what an
  account adds. The landing page's "Try a room as a guest" opens Discover.
- **🔔 Inbox:** friend requests, Ask to join requests and replies, @mentions, space in a full room,
  team actions on your account. Kept 30 days. Not DMs (Messages has its own badge) and never "a
  friend walked in". Inside a room the same items also show as toasts.
- **Home (`/home`):** Friends out right now (chips that walk you in), your rooms (pinned, then
  active, then the rest; 6 big cards, then rows; 30+ days unopened folds away), Open now, Make a
  room (a name and a map). A full room offers **Full · notify me**.
- **Messages (`/home/messages`):** list, chat, the friend's profile. No call button: to talk, meet
  in a room.
- **Discover (`/discover`):** Common rooms, then listed rooms with search, tags and language.
  Anyone can browse it, signed in or not.
- **A room's page (`/r/<id>`):** its saved chat with who's inside and a big **Walk in**. Doesn't
  join the game server, so reading from a phone costs almost nothing.

## Inside the room (3D)

| Part          | Where         | Holds                                                       |
| ------------- | ------------- | ----------------------------------------------------------- |
| **Room card** | top left      | name, map, who's here; Invite, Room settings; Leave         |
| **My tools**  | left rail     | Study session, Music, Quests, How to play                   |
| **Chat**      | bottom left   | Bubbles (default), Room chat, Messages                      |
| **People**    | top right     | one panel built for 100 people, actions per person          |
| **Zoom**      | bottom right  | 37%–260%, opens at 100% (touch screens pinch)               |
| **Dock**      | bottom centre | Mic, Sound, Chat, Activities; 🛡️ Room (owner, mods); ⋯ More |

- **The dock stays short.** Owner and mod tools go under 🛡️ Room; occasional things (Photo mode,
  your settings) under ⋯ More.
- **Nothing navigates away silently.** Only Leave leaves; links out ask "Leave {room}?" first.
- Panels close on a press elsewhere or Escape, and that press never walks you.
- Changing your look is live (no rejoin), at most once every 5 s.
- **Phones:** compact HUD, chat as a sheet, joystick and an action button.

## Room settings

Owner: every tab. Mods: Members & roles, Invites, Rules & safety. Members get **About** instead.

| Tab             | Holds                                                                                 |
| --------------- | ------------------------------------------------------------------------------------- |
| Overview        | name, description, who can join, tags, language, people at once; transfer, delete     |
| Map & look      | template, size, time of day (switches live)                                           |
| Members & roles | members, requests, banned                                                             |
| Invites         | Members can invite, Allow guests, Guests can use voice; active links                  |
| Rules & safety  | rules, show before joining, word filter, slow mode, new members wait, room-wide games |

**Members vs people at once:** members belong to the room (150 Free, 1,000 Plus); people at once
is capacity (25 Free; Plus 50 on a Cosy map, 100 on a Big one). The owner and mods always fit.

**Theme:** light and dark, one colour, Thai tea orange. No colour picker.

## In the code

- Frame and header: `apps/web/src/components/app/AppFrame.tsx`, `features/place/PlaceHeader.tsx`
- The 3D HUD: `apps/web/src/features/room/` (`RoomView.tsx`)
- Inbox: `apps/api/src/notifications/` (grouped items via `group_key`, deleted after 30 days),
  `apps/web/src/features/inbox/`
- Capacity is enforced by the game server from the join ticket (see [6](06-3d-room.md))

## Not built yet

- Room pictures are one image per map; periodic snapshots later.
- Events (the inbox item and the pinned "next event") have no feature yet.
