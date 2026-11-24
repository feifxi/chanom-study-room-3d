# 2. Rooms and membership

A room is the top-level thing in Connecta. Like Discord, you're a **member** of a room before you
walk in. Three fixed roles, two kinds of invite link, and kick, ban and time out wherever you see
the person.

## Getting in

| Room                  | How you get in                                                           |
| --------------------- | ------------------------------------------------------------------------ |
| **Private** (default) | a member invite link only. Not listed                                    |
| **Ask to join**       | listed in Discover. Ask with a note (150 chars) → a mod lets you in      |
| **Open**              | listed. **Join & walk in** makes you a member at once                    |
| **Guest pass**        | that one room for 24 hours, no account                                   |
| **Common**            | Connecta's own rooms, no membership ([Common rooms](13-common-rooms.md)) |

- Listed rooms open a preview first (map, owner, members, rules); the chat stays hidden until you join.
- A declined request can ask again after **7 days**.
- A private room you're not in is a 404, never "forbidden".

## Roles

Fixed roles, no custom ones (they're much of why Discord feels complicated).

| Role       | Can                                                                                         | Can't                                     |
| ---------- | ------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Owner**  | everything: name, map, visibility, mods, hand over, delete                                  | act on themselves                         |
| **Mod**    | kick, ban, time out members and guests; requests; invites; delete messages; safety settings | act on the owner or mods; map, visibility |
| **Member** | chat, walk in, invite if "Members can invite" is on                                         |                                           |

## Invites

- **Member invite** `/i/<code>`: whoever opens it joins. Expires in 1 day, 7 days (default) or
  never. **No use limit** ([why](../decisions.md#rooms-and-people)). The dialog reuses your link
  while at least half its time is left.
- **Guest pass** `/g/<code>`: 24 hours without an account, if the room allows guests.
- **Invite a friend:** a card in their DMs ([Friends](03-friends.md)).
- Both links show a "Join Connecta" button to people without an account.

## Kick, ban, time out

- **Time out** 10 min / 1 h / 1 day: they stay but can't talk or type, and are told who did it.
- **Kick:** out of the room and its membership (a guest's pass ends).
- **Ban:** out, and can't rejoin or use guest passes. Tied to the account; works on non-members too.
- **Mute for everyone** (3D only) and **make or remove mod** (owner only).
- All of these take effect inside the 3D room at once, and go in the team's audit log
  ([Admin site](16-admin.md)).

## Room settings

Owner: every tab. Mods: Members & roles, Invites, Rules & safety. Members see **About** instead.

| Tab             | Holds                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------- |
| Overview        | name, description, thumbnail, who can join, tags, language, people at once; transfer, delete |
| Map & look      | template, size, time of day, switched live ([Maps](06-maps.md))                              |
| Members & roles | members, requests, banned                                                                    |
| Invites         | Members can invite, Allow guests, Guests can use voice; active links                         |
| Rules & safety  | rules, show before joining, word filter, slow mode, new members wait, room-wide games        |

**Thumbnail** (owner): uploaded like a chat picture, cropped to 16:9 and checked by the picture
check. Anyone can see it: it's on Home cards, Discover and invites.

## Discover

- Any room can be listed (no account-age rule). **Tags:** 1–3 from a fixed list (Study, Chill,
  Games, Language exchange, Music, Art, Anime, Late night) plus a language. No free-text tags.
- Order: rooms with your friends inside first, then the most people inside now, then the most
  members. Cards show how many are inside now.
- Common rooms come first, then rooms by people. Signed-out visitors browse too; listed rooms say
  "Sign up to join".

## Limits

- **Members** belong to the room: 150 Free, 1,000 Plus. **People at once** is capacity: 25 Free;
  Plus 50 on a Cosy map, 100 on a Big one. A room follows its **owner's** plan ([Plus](15-plus.md)).
- **The owner and mods always fit.**
- You can make 10 rooms and be in 100 (30 and 200 with Plus).

## In the code

- `apps/api/src/rooms/`: rooms, memberships, requests, bans, invites, guest passes, Discover
  (`GET /api/rooms/listed`), thumbnails (`thumbnail.service.ts`). Role rules:
  `packages/shared/src/rooms.ts` (`canActOn`); plan numbers: `ROOM_PLANS` in the same file.
- **Every action is checked on the server;** the web app only hides buttons.
- A write people inside the 3D room should feel (kick, ban, leave, role, map, delete) also calls
  `GameService.roomEvent`. Capacity is enforced by the game server from the join ticket.
- Deleting an account hands each room to the picked heir, else the longest-serving mod, else the
  longest-standing member.
- Web: `apps/web/src/features/rooms/`, `features/place/` (Home, room pages, settings).
