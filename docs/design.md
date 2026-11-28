# Design: how the app is laid out

Not a feature: the frame every feature sits in. Read it before building any screen.

**The room is the app** (like Gather, not Discord): no servers or channel lists. Home lists your
rooms, a room's page is its chat, and inside 3D everything is a panel over the room.
[Why](decisions.md#concept).

## Principles

- **Attractive by default:** pages look like well-known products (Nitro, Spotify, Duolingo,
  Gather). Check every change at phone and desktop width, light and dark, and as a guest.
- **Mood first** in all copy; UI text is English.
- **One theme:** light and dark, one colour (Thai tea orange). No colour picker.
- **Simple and uniform:** one way to do each thing, no extra modes or settings.

## Pages outside 3D

| Page                             | What's on it                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Header** (every page)          | logo, Home / Friends / Focus / Discover / Shop, 🔔 Inbox, Messages, avatar menu (settings, Shop, Plus, Admin site for the team, sign out) |
| **Home** `/home`                 | friends out right now, your rooms (pinned, active, then the rest; 30+ days unopened folds away), Open now, Make a room (a name and a map) |
| **A room's page** `/r/<id>`      | its saved chat, who's inside, a big **Walk in**. Doesn't join the game server, so reading from a phone costs almost nothing               |
| **Messages** `/home/messages`    | DM list, the chat, the friend's profile. No call button: to talk, meet in a room                                                          |
| **Friends**, **Focus**, **Shop** | see [Friends](features/03-friends.md), [Study tools](features/07-study-tools.md), [Coins and the Shop](features/14-coins-and-shop.md)     |
| **Discover** `/discover`         | Common rooms, then listed rooms with search, tags and language. Open to everyone, signed in or not                                        |

- **Phones:** the five pages move to a bottom tab bar (hidden inside a DM thread).
- **Guests and signed-out visitors** see only Discover and Sign up; other pages show what an
  account adds. The landing page's "Try a room as a guest" opens Discover.
- A full room shows **Full**; its chat still works, and Walk in comes back when someone leaves.

## Inside a room (3D)

| Part          | Where         | Holds                                                       |
| ------------- | ------------- | ----------------------------------------------------------- |
| **Room card** | top left      | name, map, who's here; Invite, Room settings; Leave         |
| **My tools**  | left rail     | Study session, Music, Quests, How to play                   |
| **Chat**      | bottom left   | Bubbles (default), Room chat, Messages                      |
| **People**    | top right     | one panel built for a full room, actions per person         |
| **Zoom**      | bottom right  | 37%–260%, opens at 100% (touch screens pinch)               |
| **Dock**      | bottom centre | Mic, Sound, Chat, Activities; 🛡️ Room (owner, mods); ⋯ More |

- **The dock stays short.** Owner and mod tools go under 🛡️ Room; occasional things (Photo mode,
  your settings) under ⋯ More.
- **Nothing navigates away silently.** Only Leave leaves; links out ask "Leave {room}?" first
  (`LeaveRoomLink`).
- Panels close on a press elsewhere or Escape, and that press never walks you.
- **A big panel is a theater:** it fills the screen above the dock and dims the room
  ([Activities](features/08-activities.md#on-screen)).
- Changing your look is live (no rejoin, with a sparkle), at most once every 5 s.
- **Phones:** compact HUD, chat as a sheet, a joystick and an action button.

## In the code

- Frame and header: `apps/web/src/components/app/AppFrame.tsx`, `features/place/PlaceHeader.tsx`
- The 3D HUD: `apps/web/src/features/room/` (`RoomView.tsx`)
- Screenshots for review: `pnpm --filter @connecta/web screens 390 dark guest` ([dev guide](dev-guide.md))

## Not built yet

- A room without an uploaded thumbnail shows its map's picture; live snapshots later.
- Events (an inbox item and a pinned "next event").
