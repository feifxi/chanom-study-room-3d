# 3. Rooms and membership

**Status:** decided and built in the demo. **Try it:** http://localhost:3100/home (you own Chanom
Friends and mod CPE Year 3; Discover has rooms to preview). The Demo tab's **View as** switches role.

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
  (or 1 day, or never), optionally after **1 / 5 / 10 / 25 uses**. New options make a new link; old
  links keep their rules.
- **Guest pass** (`connecta.app/g/<code>`): 24 hours without an account, if the room allows guests.
- **Invite a friend:** friends who aren't members, sent in a DM.

**Room settings → Invites:** Members can invite, Allow guests, Guests can use voice, and the active
links (kind, made by, uses, expiry, **Cancel**).

## Kick, ban, time out

The same actions in Members & roles and in the in-room people list:

- **Time out** 10 minutes / 1 hour / 1 day: they stay but can't talk or type.
- **Kick:** removed from the room and its membership; a new invite brings them back.
- **Ban:** removed, and can't rejoin or use guest passes. Tied to the account, so a new guest name
  doesn't get around it. Members & roles → Banned lists who, why, by whom, with **Unban**.
- **Make or remove mod:** owner only. In 3D there's also **Mute for everyone**.

## Backend notes

- **Tables:** room; membership (room, user, role, joined at, timed out until); join request (room,
  user, note, status, decided by and at); ban (room, user, by, reason, at); invite link (code, room,
  kind, created by, max uses, uses, expires at, cancelled at).
- **Server checks:** every action goes through the role rules (`canActOn(me, them)`); the client only
  hides buttons. Bans are checked on join, invite use and guest pass use.
- **Timeouts** are enforced by the chat gateway and by Colyseus and LiveKit (no publish permission).
- **Invite codes** are short and random; opening one is rate-limited.
- **Cost:** database rows and notifications only.
