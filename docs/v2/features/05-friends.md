# 5. Friends

**Status:** built in the real app (2026-11-22): friends, requests, blocking, the friend link, "Who
can send me friend requests", the message button, and presence: "Out in rooms", Online, Offline
with last seen, "Ask to join", "Invite to a room", "Appear offline" and "Show what I'm doing".
Being "in a room" means being connected to it on the game server (step 4). Still to come:
"Add friend" in a room's people list (step 4), the activity text (with each activity's port) and
Gift Plus (with Plus). **Try it:** http://localhost:3000/home/friends in two browsers after
`pnpm dev`, one walking into a room (the demo: http://localhost:3100/home/friends).

Friends are how you find each other: only friends can DM, and only friends see where you are. You
add people by exact @handle, from a room, or by a friend link; nothing is ever pushed at you.

## What friends get

- **DMs** (only friends can DM; feature 4).
- **Presence:** friends see you're online, away (no input in any tab for 10 minutes; never while
  focusing) or offline ("Last seen 3h ago"), what you're doing ("📖 Focusing · Calculus", unless
  "Show what I'm doing" is off) and which room you're in. Everyone else sees nothing unless you share
  a room. "Appear offline" hides you from friends too.
- **No notifications when a friend walks into a room.** Like Discord's "Active Now": you see where
  friends are when you look (Home, this page, Messages); nothing pings you. No favourites either.

## Adding someone

- **By exact @handle.** No searching by name, so nobody can browse people.
- **From a room's people list:** "Add friend" in the person's "…".
- **Friend link** `connecta.app/f/<handle>` to post anywhere; opening it sends you a request.
- **No** "people you may know" and no contact syncing (creepy, and risky with 13+).
- The Add friend dialog answers right away: sent, "already friends", "no one is @x" or "that's you".

## Requests

- **Requests dialog:** Incoming (Accept ✓ / Ignore ✕, with what you share, e.g. "You're both in
  Chanom Friends") and Sent (Pending, Cancel). The badge on Requests and on the header's Friends
  shows how many are waiting.
- **Silent:** ignoring, declining and removing a friend tell nobody; the sender just sees "Pending".
- Requests **expire after 30 days**. At most **20 sent a day**.
- Who can send you one (Privacy & safety, three choices): **Anyone** (your @handle, friend link, or a
  room you're both in), or **People from my rooms** (members of rooms you're in, and people inside the
  same room as you right now), or **Nobody** (you can still send requests yourself).
- **Limit: 1,000 friends**, like Discord.

## The Friends page

Sorted by "who can I go hang out with", not A–Z:

1. **Out in rooms:** friends inside a room right now, **one card per room** (3 friends in the same
   room = one card) with each friend's activity and a button:
   - **Join** when you can walk in anyway: you're a member, it's Open, or it's a Common room (you land in your friend's copy).
   - **Ask to join Earth** when you can't. Earth gets a DM card "feifei wants to join you · Send
     invite / Not now"; Send invite gives you a member invite if Earth may make one, otherwise a
     24-hour guest pass if the room takes guests (even with "Members can invite" off).
   - **A private room you're not in is never named:** the card says "🔒 A private room" with no
     name, map or others, one card per friend so it doesn't reveal who's together. Listed rooms (Ask
     to join, Open) are named, since anyone can find them in Discover.
2. **Online** (not in a room; Away shown as such) and 3. **Offline** ("Last seen 3h ago"), each
   with 💬 and "…" (Invite to a room, Remove friend, Block). **Invite to a room** lists your rooms
   and sends the same invite card as Send invite.

Home has the same presence: "Friends out right now" (a chip per friend in a room you can walk into)
and each room card's live `inside/capacity` and faces; a room's page lists who's inside. Messages
and the DM header show friends' presence dots.

## Backend notes

- **Tables** (`apps/api/prisma/schema.prisma`): `friendships` (one row each way), `friend_requests`
  (from, to, created, expires, ignored at), `blocks`; who can send you requests is
  `users.requests_from`.
- **API** (`apps/api/src/friends/`): `GET /api/friends`, `DELETE /api/friends/:userId`, `GET/POST
/api/friends/requests` (POST takes an exact handle; rate-limited), `POST
/api/friends/requests/:userId/accept|ignore`, `DELETE /api/friends/requests/:userId` (cancel),
  `GET /api/blocks`, `PUT/DELETE /api/blocks/:userId`, `PATCH /api/me/privacy`.
- **Silent by design:** an ignored request stays "Pending" for the sender until it expires, and
  asking again doesn't put it back in front of them. A request to someone who blocked you is kept
  but never shown to them, so it looks the same as being ignored.
- **Presence** (`apps/api/src/presence/`): the gateway reports each open tab to `PresenceService`
  (connect, disconnect, and the tab's `presence` message: how long since the last input, sent
  when you come back and every minute), plus the game server's connections (the room). Redis keeps each person's tabs
  (`presence:tabs:<id>`), what friends last heard (`presence:last:<id>`) and who's inside each
  room (`presence:inside:<roomId>`); a tab silent for 2.5 minutes is dropped (a crashed gateway).
  Changes go only to friends, each seeing their own view: a private room they're not in has no
  name. "Appear offline" (`users.appear_offline`) shows you offline and out of rooms' "inside now";
  "Show what I'm doing" is `users.show_activity`; only `users.last_seen_at` is stored. The room
  comes from the game server (each connection a tab, `game:<session>`, via Redis; see
  [06-3d-room.md](06-3d-room.md#backend-notes)); browser tabs report only how active you are.
- **Reading it:** `GET /api/friends` carries each friend's `presence` (status, last seen, activity,
  room); `GET /api/rooms` and `GET /api/rooms/:id` carry `inside` (members only). A tab sends
  `watch:inside` with your room ids to get `inside` events when the numbers change.
- **Ask to join and invites:** DM messages with `kind` `ask` or `invite` and a `card` (room, state,
  invite code). `POST /api/dms/with/:handle/ask` (your friend must be in a room you're not a member
  of), `POST /api/dms/asks/:messageId` with `{ send }` (only the one asked; once), `POST
/api/dms/with/:handle/invite` with `{ roomId }`. Cards can't be edited.
- **Limits** (20 requests a day, 1,000 friends) are checked on the server.
