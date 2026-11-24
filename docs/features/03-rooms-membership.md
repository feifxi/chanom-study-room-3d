# 3. Rooms and membership

Like Discord, you're a member of a room before you walk in. Three fixed roles, two kinds of invite
link, and kick, ban and time out wherever you see the person.

## Getting in

| Room                  | How you get in                                                                  |
| --------------------- | ------------------------------------------------------------------------------- |
| **Private** (default) | A member invite link only. Not listed.                                          |
| **Ask to join**       | Listed in Discover. Ask with a note (150 chars) → a mod lets you in.            |
| **Open**              | Listed. **Join & walk in** makes you a member at once.                          |
| **Common** (Connecta) | No membership, anyone walks in, guests too ([14](14-open-rooms-moderation.md)). |
| **Guest pass**        | That one room for 24 hours, no account.                                         |

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
- **Invite a friend:** a DM card ([5](05-friends.md)).

## Kick, ban, time out

- **Time out** 10 min / 1 h / 1 day: they stay but can't talk or type.
- **Kick:** out of the room and its membership (a guest's pass ends).
- **Ban:** out, and can't rejoin or use guest passes. Tied to the account. Works on non-members too.
- **Mute for everyone** (3D only) and **make or remove mod** (owner only).
- Kick, ban, role and map changes take effect inside the 3D room at once.

## Limits

150 members and 25 people at once on Free; Plus raises them ([15](15-plus-coins-shop.md)). You can
be in 100 rooms (200 with Plus). The owner and mods always fit.

## In the code

- `apps/api/src/rooms/` (rooms, memberships, requests, bans, invites, guest passes, Discover's
  `GET /api/rooms/listed`); role rules in `packages/shared/src/rooms.ts` (`canActOn`)
- Every action is checked on the server; the web app only hides buttons.
- Deleting an account hands each room to the picked heir, else the longest-serving mod, else the
  longest-standing member.
- Web: `apps/web/src/features/rooms/`, `features/place/` (Home, room pages, settings)
- **Thumbnail** (owner only, Settings → Overview): uploaded like a chat picture, then cropped to
  16:9, made a 1280×720 WebP and checked by the picture check at once (`rooms/thumbnail.service.ts`).
  Anyone can see it (`GET /api/rooms/<id>/thumbnail`): it's on Home cards, Discover and invites.

## Not built yet
