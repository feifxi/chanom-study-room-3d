# 2. Rooms and membership

PBIs: [ROOM-1 to ROOM-12](../releases.md#2-rooms-and-membership) · How the code works: [Release 1](../guide/04-release-1.md#rooms-and-membership-room-1-to-room-7), [Release 2](../guide/05-release-2.md#room-mods-room-8), [Release 3](../guide/06-release-3.md#rooms-others-can-find-room-9-to-room-12)

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
| **Owner**  | everything: name, map, visibility, mods (up to 5), hand over, delete                        | act on themselves                         |
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

- **Members** belong to the room: 30 Free, 100 Plus. **People at once** is capacity: 15 Free, 30
  Plus, never more: rooms are for groups, and every map is built for 30. A room follows its
  **owner's** plan ([Plus](15-plus.md)); the owner can set it lower.
- **Up to 5 mods** per room, on every plan.
- **Two seats are held inside the cap:** one only the owner takes, one the first mod takes. Everyone
  else fills the rest (28 on Plus, 13 on Free); more mods take an ordinary seat if there's one. So
  the owner and a mod can always walk in, and a room never holds more than its capacity. Common
  rooms hold nothing back. The owner can't set fewer than 3 at once.
- **Full is for you:** Home, the room's page and Discover say Full when there's no seat for _you_
  (a mod can still see Walk in when members can't).
- **Full is full:** the room shows Full (its chat still works) and Walk in comes back when someone
  leaves. No waiting list.
- You can make 10 rooms and be in 100 (30 and 200 with Plus).

## In the code

- `apps/api/src/rooms/`: rooms, memberships, requests, bans, invites, guest passes, Discover
  (`GET /api/rooms/listed`), thumbnails (`thumbnail.service.ts`). Role rules:
  `packages/shared/src/rooms.ts` (`canActOn`); plan numbers: `ROOM_PLANS`; seats: `hasSeat` (the
  game server's check, and the API's `full` from presence), all in the same file.
- **Every action is checked on the server;** the web app only hides buttons.
- A write people inside the 3D room should feel (kick, ban, leave, role, map, delete) also calls
  `GameService.roomEvent`. Capacity is enforced by the game server from the join ticket.
- Handing the room over keeps the old owner as a mod, or a member when all 5 mod seats are taken.
- Deleting an account hands each room to the picked heir, else the longest-serving mod, else the
  longest-standing member.
- Web: `apps/web/src/features/rooms/`, `features/place/` (Home, room pages, settings).
