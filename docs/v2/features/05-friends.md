# 5. Friends

Status: decided (2026-11-08). Overview: [`docs/v2-plan.md`](../../v2-plan.md). DMs and blocking:
[`04-chat-and-dms.md`](04-chat-and-dms.md).

Try it: `pnpm --filter @study/demo demo:dev` → http://localhost:3100/home/friends.

## What friends get

- **DMs** (only friends can DM; feature 4).
- **Presence:** friends see you're online, what you're doing ("📖 Focusing · Calculus", unless
  "Show what I'm doing" is off) and which room you're in. Everyone else sees nothing unless you share
  a room. "Appear offline" hides you from friends too.
- **No notifications when a friend walks into a room.** Like Discord's "Active Now": you see where
  friends are when you look (Home's "Friends out right now", this page, Messages), and nothing pings
  you. (No favourites either: too much for now.)

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
- Who can send you one: anyone with your @handle or link, or (Privacy switch off) only people who
  share a room with you.
- **Limit: 1,000 friends**, like Discord.

## The Friends page

Sorted by "who can I go hang out with", not A–Z:

1. **Out in rooms:** friends inside a room right now, **one card per room** (3 friends in the same
   room = one card) with each friend's activity and a button:
   - **Join** when you can walk in anyway: you're a member, it's Open, or it's a drop-in room.
   - **Ask to join Earth** when you can't (a private room you're not in). Earth gets a DM card
     "feifei wants to join you · Send invite / Not now"; Send invite gives you a 24-hour guest pass, or
     a member invite if Earth is allowed to make one.
2. **Online** (not in a room) and 3. **Offline** ("Last seen 3h ago"), each with 💬 and "…" (Invite
   to a room, Remove friend, Block).

## Backend notes

- **Tables:** friendship (user pair, since), friend request (from, to, created, expires; ignored
  ones just stay until they expire), block (feature 4).
- **Presence:** the gateway keeps who's online and in which room in Redis and pushes changes only to
  that person's friends (and to rooms they're in), respecting "Appear offline" and "Show what I'm
  doing". Nothing is stored long-term except "last seen".
- **Ask to join:** a DM message of a special kind with two buttons; "Send invite" makes a guest pass
  or member invite (feature 3) and posts it back.
- **Limits** (20 requests a day, 1,000 friends) are checked on the server.
