# 5. Friends and presence

Only friends DM and only friends see where you are. You add people by exact @handle, from a room,
or by a friend link. Nothing is ever pushed at you.

## Adding friends

- **Exact @handle** only (no browsing people by name), **"Add friend"** in a room's people list,
  or a **friend link** `/f/<handle>` (sends on a tap, not on opening).
- No "people you may know", no contact sync, no favourites.
- Adding someone who already asked you makes you friends at once.
- **Requests are silent:** ignoring or removing tells nobody; the sender sees "Pending". Requests
  expire after 30 days. 20 sent a day, 1,000 friends.
- **Who can send me requests:** Anyone / People from my rooms / Nobody.
- **Blocking** ends the friendship; their requests are kept but never shown (looks like being ignored).

## Presence

- Friends see **Online, Away** (no input in any tab for 10 min; never while focusing), **Offline**
  ("Last seen 3h ago"), what you're doing ("📖 Focusing · Calculus") and which room you're in.
- **Appear offline** and **Show what I'm doing** are account settings.
- **No "a friend walked in" notifications.** You see where friends are when you look.
- **A private room you're not in is never named:** "🔒 A private room", one card per friend, so it
  doesn't reveal who's together. Listed rooms are named.

## The Friends page

1. **Out in rooms:** one card per room with **Join** (you're a member, it's Open, or it's Common:
   you land in your friend's copy) or **Ask to join** (a DM card; the friend's Send invite gives a
   member invite if they may make one, else a 24-hour guest pass).
2. **Online**, then **Offline**, each with 💬 and Invite to a room, Remove, Block.

Home shows the same: "Friends out right now" and live faces on room cards.

## In the code

- `apps/api/src/friends/` (`friendships` one row each way, `friend_requests`, `blocks`)
- `apps/api/src/presence/`: each tab's state lives in Redis (a tab silent for 2.5 min is dropped);
  only "last seen" goes to Postgres. The room comes from the game server through Redis; the
  gateway is presence's only writer. Each friend gets their own view.
- Ask to join and invite cards are DM messages with a `card` (`apps/api/src/dms/`).
- Web: `apps/web/src/features/friends/`, `features/presence/`
