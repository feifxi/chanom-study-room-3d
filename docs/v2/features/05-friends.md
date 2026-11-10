# 5. Friends

**Status:** decided and built in the demo. **Try it:** http://localhost:3100/home/friends

Friends are how you find each other: only friends can DM, and only friends see where you are. You
add people by exact @handle, from a room, or by a friend link; nothing is ever pushed at you.

## What friends get

- **DMs** (only friends can DM; feature 4).
- **Presence:** friends see you're online, what you're doing ("📖 Focusing · Calculus", unless
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
     invite / Not now"; Send invite gives you a 24-hour guest pass, or a member invite if Earth may
     make one.
   - **A private room you're not in is never named:** the card says "🔒 A private room" with no
     name, map or others, one card per friend so it doesn't reveal who's together. Listed rooms (Ask
     to join, Open) are named, since anyone can find them in Discover.
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
