# 8. Study tools

Status: decided (2026-11-09). Overview: [`docs/v2-plan.md`](../../v2-plan.md). Status above heads and
"focusing is never away": [`06-3d-room.md`](06-3d-room.md). Focus quests:
[`v2-plan.md`, Business model](../../v2-plan.md#business-model).

Try it: `pnpm --filter @study/demo demo:dev`, then:

- http://localhost:3100/servers/chanom/rooms/library → My tools (left rail) → 📖 Study session
- http://localhost:3100/home/focus (header → Focus)

## What's in it

| Tool             | Where                 | Who sees it                                |
| ---------------- | --------------------- | ------------------------------------------ |
| Focus timer      | Study session → Timer | you; others see 📖 + minutes + subject     |
| To-do list       | Study session → To-do | only you                                   |
| This room today  | Study session → Today | everyone in the room                       |
| My numbers       | Focus page            | only you                                   |
| Friends ranking  | Focus page            | you and your friends                       |
| Everyone ranking | Focus page            | everyone (only people who opted in listed) |

## Focus timer

- **Personal only.** Each person runs their own timer; there is no shared, joined or room-wide
  session. Others see "📖 32m · Calculus" on your label and in the people list.
- **Minimal.** Two presets, 25/5 and 50/10. Focus → chime → break → chime → done. Each round needs a
  press to start (no auto-repeat, no custom length, no stopwatch).
- **Subject** (24 chars, optional) is shown above your head and feeds "By subject" on the Focus page.
- While the timer runs you're never away (feature 6).
- Guests get the timer too; nothing is saved for them.

## To-do list

- **One list per account**, the same in every room, private. Not tied to a room, so it doesn't reset
  when the room empties.
- Add (120 chars), tick, delete, "Clear done". Up to 50 items; done items clear themselves after 7 days.
- No "working on this task" link to the timer, no due dates, no sharing.
- Guests see "Sign up to keep a to-do list…" (sign-up keeps their character, feature 2).

## What counts as focus

- Minutes on the focus timer, timed by the **server**, counted when a round ends or is stopped after
  1+ minute. Breaks don't count.
- You must be connected to a room while the timer runs (other tabs are fine). Leaving the room ends
  the round and counts what you did.
- At most **12 hours a day** count towards rankings (your own numbers show everything).
- No streaks, on purpose: a missed day shouldn't feel like losing something.

## The Focus page (`/home/focus`)

Header nav: Home · Friends · **Focus** · Discover · Shop.

- **My numbers (only you):** Today, Last 7 days, Daily average (over days you focused), a 7-day bar
  chart (hover a day for its minutes), and minutes per subject over the last 7 days.
- **Rankings:** Friends / Everyone × Today / This week.
  - Friends: all your friends plus you, in order.
  - Everyone: the top 10, then "⋯" and your own rank pinned under it.
  - Days and weeks are in the viewer's time zone; weeks start Monday.
- The room's own ranking ("Focus in this room today") stays in the Study panel; it lists members and
  guests who focused in this room today. It has no link to the Focus page: nothing in a room navigates
  away (see "Leaving a room" in [06-3d-room.md](06-3d-room.md)).

## Everyone ranking and privacy

- Listed only with **"Show me on the Everyone focus ranking"** on (Settings → Privacy & safety, and
  a switch on the Focus page). Default **on for 18+, off under 18** (`can(user, 'listOnGlobalRank')`).
- Shows name, character and minutes; never the room you're in.
- Hidden people still see the list and their own minutes, just without a rank.
- Friends always see you in the Friends ranking (friends already see your presence).

## Backend notes

- Table `focus_sessions (user_id, room_id, subject, started_at, ended_at, minutes)`, written by the
  game server when a round ends or stops (V1 already does this). `todos (user_id, id, text, done,
done_at, position)`, REST CRUD from the web app; a nightly job removes done items older than 7 days.
- Rankings are `SUM(minutes)` per user over the window, capped per day. Today and This week depend on
  the viewer's time zone, so compute per request for Friends (small) and cache Everyone per time zone
  offset for ~5 minutes (top 10 + the viewer's rank via a window function).
- Room "today" is in memory on the game server (like the rest of the room) plus that day's
  `focus_sessions` for the room when it reopens.
- Cost: small. A few writes per round and one cached query; no realtime beyond the existing status.

## Not now

- Shared or joined timers, room sessions, custom lengths, auto cycles.
- Streaks, badges, focus goals.
- Flashcards: dropped (2026-11-09). AI quizzes are AI decks in Pick a Side (feature 11).
