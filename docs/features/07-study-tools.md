# 7. Study tools

A personal focus timer, a private to-do list, and rankings of real focus minutes. Minimal on
purpose: two presets, no streaks, no shared sessions.

## Focus timer

- **Personal only.** Presets 25/5 and 50/10; each round needs a press to start. No custom lengths,
  no auto-repeat.
- An optional subject (24 chars) shows over your head: "📖 32m · Calculus". Friends see "Focusing".
- **In the 3D room only** (the game server times it). One running timer per account.
- While it runs you're never Away. A reload keeps the round if you're back within 20 s.
- Guests get the timer; nothing is saved for them.

## To-do list

One private list per account, the same in every room. 120 characters an item, up to 50; done
items clear after 7 days. No due dates, no sharing.

## What counts

- Server-timed focus minutes of a round that ends or is stopped after 1+ minute. Breaks don't count.
- A round counts for the day it started, in **your own time zone**.
- Rankings cap a day at **12 hours**; your own numbers count everything.
- **No streaks**: a missed day shouldn't feel like losing something.

## The Focus page (`/home/focus`)

- **Hero:** this week's minutes, your place among friends, and a button back to the room you last
  walked into on any device (else "Find a room to study in" → Discover).
- **My numbers:** Today, Last 7 days, daily average, a 7-day chart, minutes by subject.
- **Rankings:** Friends / Everyone × Today / This week. Friends lists only those who focused, plus
  you. Everyone shows the top 10 and your rank; people you blocked or who blocked you are hidden.
- **Everyone is opt-in:** "Show me on Everyone", on by default for 18+, off under 18. Never shows
  which room you're in.
- The room's own "This room today" lives in the Study panel.

## In the code

- Timer: `apps/game/src/focus.ts` (`focus:start`, `focus:stop`, `focus:subject`); a finished round
  goes to the `focus-rounds` BullMQ queue so it survives an API restart.
- `apps/api/src/focus/` (`focus_sessions`, rankings; Everyone cached 5 minutes), to-dos in the same
  module (`/api/todos`, a 3 am cleanup job; each change tells your other tabs live). Shared rules:
  `packages/shared/src/focus.ts`.
- Web: `apps/web/src/features/focus/`, `app/(app)/(home)/home/focus/`

## Not doing

Shared or room timers, custom lengths, streaks, badges, goals, flashcards (dropped).
