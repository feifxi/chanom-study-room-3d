# 3. Rooms and membership

Status: decided (2026-11-08). Overview: [`docs/v2-plan.md`](../../v2-plan.md). Accounts and guests:
[`02-accounts.md`](02-accounts.md).

Try it: `pnpm --filter @study/demo demo:dev` → http://localhost:3100/home. You own Chanom Friends
(owner view of Room settings) and are a mod in CPE Year 3 (mod view, join requests). Discover has
open rooms to preview and join.

## You're a member before you walk in

Like Discord, you join a room before you can be inside it. The exceptions are Common rooms
(platform-run, no membership) and guest passes.

| Room                  | How you get in                                                           |
| --------------------- | ------------------------------------------------------------------------ |
| **Private** (default) | A member invite link only. Not listed.                                   |
| **Ask to join**       | Listed in Discover. Ask with an optional note → a mod lets you in.       |
| **Open**              | Listed. One button, **Join & walk in**: you become a member and walk in. |
| **Common** (platform) | No membership; anyone walks in, guests too. Text only (feature 14).      |
| **Guest pass**        | Walk into that one room for 24 hours without an account.                 |

**Preview before joining** (our version of Discord's server preview): tapping an Open or Ask-to-join
room opens its card: map, description, owner, inside/capacity, members, tags, friends inside, and
the room rules. The chat stays hidden until you're a member. A full Open room can still be joined
("Join · tell me when there's a spot"): the chat works, and you walk in when there's room.

Leaving is in the room's "…" menu on Home. Rooms you haven't opened in 30+ days fold away under
"Quiet for a while".

## Roles

Three fixed roles, no custom roles (custom roles are a big part of why Discord feels complicated,
and our rooms are small groups). Explained in Members & roles → "What can each role do?".

| Role       | Can                                                                                                                                     | Can't                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Owner**  | Everything: name, map, visibility, make or remove mods, hand the room over, delete it, plus everything a mod can                        | Act on themselves                                        |
| **Mod**    | Kick, ban and time out members and guests; approve join requests; make and cancel invite links; delete messages; change safety settings | Act on the owner or other mods; change map or visibility |
| **Member** | Chat, walk in, invite people if the room allows it ("Members can invite")                                                               |                                                          |

Room settings for a **mod** only show Members & roles, Invites and Safety. Overview (name,
visibility, hand over, delete) and Map & look are the owner's.

## Invites

One **Invite** dialog (room "…" menu, the room card in 3D, the Chat page), two kinds of link:

- **Member invite** (`connecta.app/i/<code>`): whoever opens it joins. Expires after **7 days** by
  default (or 1 day, or never), optionally after **1 / 5 / 10 / 25 uses**. Changing the options or
  pressing ↻ makes a new link; the old one keeps its own rules.
- **Guest pass** (`connecta.app/g/<code>`): walk in without an account for **24 hours**. Only when
  the room allows guests (Map & look → Allow guests).
- **Invite a friend:** friends who aren't members yet, with an Invite button that sends it in a DM.

**Room settings → Invites** (owner and mods): the "Members can invite" and "Guests can use voice"
switches, and **Active links**: kind, who made it, uses (`9/10`), expiry, and **Cancel** (stops
working right away).

## Ask to join

1. The person taps **Ask to join** on the preview and can add a note (up to 150 characters, e.g.
   "I'm in Mai's class"). The preview then says "Request sent 💌", and Home shows the room as "Waiting".
2. Owners and mods get a notification and see **"3 asking to join"** on the room's Home card.
3. **Members & roles → Requests (3):** name, note, when, who they know there, **Let in** or ✕.
4. Let in → they're a member and get a notification. Declined → they can ask again after **7 days**.

## Kick, ban, time out

In each person's "…" in Members & roles **and** in the in-room people list (same actions, so
managing people happens where you see them):

- **Time out** 10 minutes / 1 hour / 1 day: they stay, but can't talk or type. Shows as
  "Timed out · 1 hour" in the list.
- **Kick:** removed from the room and its membership; a new invite lets them back in.
- **Ban:** removed, and can't rejoin or use guest passes for this room. Tied to the account, so a
  new guest name doesn't get around it. **Members & roles → Banned** lists who, why, by whom and
  when, with **Unban** (they still need a new invite).
- **Make mod / Remove mod:** owner only.
- In 3D there's also **Mute for everyone** (mic off for the room).

## Backend notes

- **Tables:** room, membership (room, user, role, joined at, timed out until), join request (room,
  user, note, status, decided by/at), ban (room, user, by, reason, at), invite link (code, room,
  kind, created by, max uses, uses, expires at, cancelled at).
- **Checks on the server:** every action goes through the role rules above (`canActOn(me, them)`);
  the client only hides buttons. A ban is checked on join, on invite use and on guest pass use.
- **Timeouts** are enforced by the chat gateway and by Colyseus/LiveKit (no publish permission
  until the time is up).
- **Invite codes** are short and random; opening one is rate-limited so codes can't be guessed.
- **Cost:** only database rows and notifications; nothing paid.
