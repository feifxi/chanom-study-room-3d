# 3. Rooms and membership

**Status:** built in the real app (2026-11-22): making rooms, Room settings, members and roles,
Ask to join, invites and guest passes, kick, ban and time out, Discover's listed rooms; and with
step 3, who's inside, unread counts, the 🔔 for join requests and being let in, time outs in chat,
and inviting a friend from Friends or a DM card (feature 5); and with step 4, kick, ban, leaving,
a new role or a new map take effect inside the 3D room at once. Waiting on later steps: the safety
switches in 3D (guest voice with part 3), uploading a thumbnail (it stays in your browser for now) and
reporting a room (feature 14). **Try it:** http://localhost:3000/home after `pnpm dev` (the demo is still at
http://localhost:3100/home).

Like Discord, you're a member of a room before you walk in. Three fixed roles, two kinds of invite
link, and kick, ban and time out where you see the person.

## Getting in

| Room                  | How you get in                                                           |
| --------------------- | ------------------------------------------------------------------------ |
| **Private** (default) | A member invite link only. Not listed.                                   |
| **Ask to join**       | Listed in Discover. Ask with an optional note → a mod lets you in.       |
| **Open**              | Listed. One button, **Join & walk in**: you become a member and walk in. |
| **Common** (Connecta) | No membership; anyone walks in, guests too. Text only (feature 14).      |
| **Guest pass**        | Walk into that one room for 24 hours without an account.                 |

- **Preview before joining:** an Open or Ask-to-join room opens a card with its map, description,
  owner, inside/capacity, members, tags, friends inside and rules. The chat stays hidden until you
  join. A full Open room can still be joined; you walk in when there's a spot.
- **Ask to join:** a note up to 150 characters → "Request sent 💌", Home shows "Waiting". Mods see
  "3 asking to join" and decide in Members & roles → Requests (Let in or ✕). Declined people can ask
  again after **7 days**.
- **Leaving:** in the room's "…" on Home. Owners transfer or delete in Room settings first.

## Roles

Fixed roles, no custom ones (they're much of why Discord feels complicated; our rooms are small).

| Role       | Can                                                                                                                 | Can't                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Owner**  | Everything: name, map, visibility, mods, hand over, delete, plus all a mod can                                      | Act on themselves                                  |
| **Mod**    | Kick, ban, time out members and guests; approve requests; make and cancel invites; delete messages; safety settings | Act on the owner or mods; change map or visibility |
| **Member** | Chat, walk in, invite if "Members can invite" is on                                                                 |                                                    |

## Invites

One **Invite** dialog (room "…", the Room card, the room's page):

- **Member invite** (`connecta.app/i/<code>`): whoever opens it joins. Expires after **7 days**
  (or 1 day, or never). **No use limits** (to invite one person, invite them as a friend). A new
  expiry makes a new link; old links keep theirs.
- **Guest pass** (`connecta.app/g/<code>`): 24 hours without an account, if the room allows guests.
- **Invite a friend:** friends who aren't members, sent in a DM.

**Room settings → Invites:** Members can invite, Allow guests, Guests can use voice, and the active
links (kind, made by, times used, expiry, **Cancel**).

## Kick, ban, time out

The same actions in Members & roles and in the in-room people list:

- **Time out** 10 minutes / 1 hour / 1 day: they stay but can't talk or type.
- **Kick:** removed from the room and its membership (a guest: their pass ends); a new invite brings
  them back.
- **Ban:** removed, and can't rejoin or use guest passes. Tied to the account, so a new guest name
  doesn't get around it. Members & roles → Banned lists who, why, by whom, with **Unban**.
- **Make or remove mod:** owner only. In 3D there's also **Mute for everyone**.

## Backend notes

- **Tables** (`apps/api/prisma/schema.prisma`): `rooms` (name, emoji, description, map, size, time
  of day, visibility, capacity, tags, language, rules and the safety and invite switches, the
  picked heir); `memberships` (room, user, role, joined, last visited, pinned, notifications,
  timed out until); `join_requests` (a decline stays, for the 7 days); `room_bans`; `invites`
  (code, kind, expiry, uses, expires and cancelled at); `guest_visits` (who a guest pass let in,
  until when).
- **API** (`apps/api/src/rooms/`): `GET/POST /api/rooms` (yours, make one), `GET/PATCH/DELETE
/api/rooms/:id`, `PUT :id/owner`, `PATCH/DELETE :id/me` (pin and notifications, leave), `PUT
:id/visit`, `POST :id/join`, `:id/requests` (ask, list, accept, decline), `:id/members` (list,
  role, time out, kick), `:id/bans`, `:id/invites` (your link, the active ones), `GET
/api/rooms/listed` (Discover), `GET/POST/DELETE /api/invites/:code` (preview, use, cancel).
- **Server checks:** every action goes through the role rules (`canActOn` in `@connecta/shared`);
  the web app only hides buttons. Mods may change only the invite and safety settings. Bans are
  checked on join, asking, invite use and guest pass use. A private room you're not in is a 404.
- **Limits:** 150 members a room and 100 rooms a person on Free (1,000 and 200 with Plus, which isn't
  built yet). Capacity is the owner's choice up to the plan and map size.
- **Timeouts** are stored now and enforced by the chat gateway and by Colyseus and LiveKit (no
  publish permission) when those are built.
- **Invite codes** are 8 random characters; opening and using one is rate-limited.
- **Deleting an account** hands each room it owns to the member picked in Settings → Account (or a
  mod, or the longest-standing member); a room with nobody else goes with the account.
- **Cost:** database rows and notifications only.
