# 8. Study tools

**Status:** decided and built in the demo. On the real backend: part 1 of 3 (the server-run
timer, "This room today", "Focusing" for friends) done 2026-11-23; the to-do list and the Focus page
are next ([why three parts](../decisions.md#engineering-and-infra)). **Try it:** http://localhost:3100/servers/chanom/rooms/library
→ My tools → 📖 Study session, and http://localhost:3100/home/focus

A personal focus timer, a private to-do list, and rankings that count real focus minutes. Kept
minimal on purpose: two presets, no streaks, no shared sessions.

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
- While the timer runs you're never away (feature 6), and friends see "Focusing · Calculus" (unless
  you turned "Show what I'm doing" off).
- Guests get the timer too; nothing is saved for them.
- **Inside the 3D room only:** the room's chat page has no timer (the game server times it).
- **One at a time:** starting a timer in another room ends the first one, counting what you did.
- **A reload keeps your round** if you're back within 20 seconds (the game server's reconnect
  window); a longer drop ends it like leaving.

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
- At most **12 hours a day** count towards rankings (your own numbers show everything). The day is
  yours: a round counts for the day it started in your own time zone, which the web app keeps in
  step with your browser.
- No streaks, on purpose: a missed day shouldn't feel like losing something.

## The Focus page (`/home/focus`)

- **My numbers (only you):** Today, Last 7 days, Daily average (over days you focused), a 7-day bar
  chart (hover a day for its minutes), and minutes per subject over the last 7 days.
- **Rankings:** Friends / Everyone × Today / This week.
  - Friends: all your friends plus you, in order.
  - Everyone: the top 10, then "⋯" and your own rank pinned under it.
  - Days and weeks are in the viewer's time zone; weeks start Monday.
- The room's own ranking ("Focus in this room today") stays in the Study panel, with no link to the
  Focus page: nothing in a room navigates away ([06-3d-room.md](06-3d-room.md#leaving-a-room)).

## Everyone ranking and privacy

- Listed only with **"Show me on the Everyone focus ranking"** on (Settings → Privacy & safety, and
  a switch on the Focus page). Default **on for 18+, off under 18** (`can(user, 'listOnGlobalRank')`).
- Shows name, character and minutes; never the room you're in.
- Hidden people still see the list and their own minutes, just without a rank.
- Friends always see you in the Friends ranking (friends already see your presence).

## Backend notes

- The **game server** runs each person's timer (`apps/game/src/focus.ts`): `focus:start { preset,
subject }`, `focus:stop`, `focus:subject`; it shows the status on your player and tells the
  gateway you're focusing (presence). When a member's round of 1+ minute ends, it adds a job to the
  `focus-rounds` BullMQ queue; "a timer started" goes to other game servers on `game:focus`.
- `focus_sessions (id, user_id, room_id, subject, started_at, ended_at, minutes, day)`, written by
  the API's focus worker: the id is the game server's round id (a retried job saves once), `day` is
  the start's date in the person's `users.time_zone` (`PUT /api/me/time-zone`), and `room_id` is
  cleared if the room is deleted, so the minutes stay yours. Deleting an account deletes them.
- `todos (user_id, id, text, done, done_at, position)`, REST CRUD; a nightly job removes done items
  older than 7 days.
- Rankings are `SUM(minutes)` per user over the window, capped per day. Today and This week depend on
  the viewer's time zone, so compute per request for Friends (small) and cache Everyone per time zone
  offset for ~5 minutes (top 10 + the viewer's rank via a window function).
- Room "today": `GET /api/rooms/:id/focus/today?tz=` gives members' saved minutes since the
  viewer's midnight (for members and guests with a pass); each person in the room also carries
  `todayMin` (rounds finished there since the room opened, guests too) and their running round. The
  web app shows the larger of saved and `todayMin`, plus the running minutes, capped at 12 hours.
- Cost: small. A few writes per round and one cached query; no realtime beyond the existing status.

## Not now

- Shared or joined timers, room sessions, custom lengths, auto cycles.
- Streaks, badges, focus goals.
- Flashcards (dropped). AI quizzes are AI decks in Pick a Side (feature 11).
