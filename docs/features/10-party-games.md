# 10. Party games: Pick a Side, whiteboard, Draw & Guess

PBIs: [PG-1 to PG-4](../releases.md#10-party-games) · How the code works: [Release 2](../guide/05-release-2.md#party-games-pg-1-to-pg-3), [Release 3](../guide/06-release-3.md#room-decks-for-pick-a-side-pg-4)

Three party pieces on the shared activity flow ([Activities](08-activities.md)): a walk-to-answer
game, a free drawing wall, and a pass-it-along drawing game.

## 🗳️ Pick a Side

A room-wide game on the **open floor**. A question and a timer; you answer by **walking into a
zone** of the rug. Answers lock where people stand when the timer ends.

| Mode                    | Zones | Right answer          | Timer | Ends                                |
| ----------------------- | ----- | --------------------- | ----- | ----------------------------------- |
| 🤔 **Would you rather** | 2     | none; shows the split | 10 s  | 10 questions; "who thinks like you" |
| 🧠 **Quiz**             | 4     | +1 each               | 15 s  | 10 questions; highest score wins    |

- **Nobody is knocked out** for a wrong answer. Playable alone (1–50 players).
- **Decks:** the host picks mode, then deck. **Built in** (Food, Pets, Love & dating, Study life,
  Weird; General knowledge, Movies, Science, Geography) or **this room's decks**: members write
  them (3–50 questions), the owner and mods can delete any, anyone let in can host with them. Up
  to 100 per room. Decks belong to the room, not the person.
- No repeats until a deck runs out (remembered while the room is open).
- Deck text is masked by the room's word filter ([Moderation](12-moderation.md)).
- **3D:** the floor splits into opaque coloured zones (A–D) with just the letter; answers are read
  in the small HUD, which keeps the room visible.

## 🎨 Whiteboard

A **free zone**, not an activity. **Always on, no E:** standing in the strip in front of it is
drawing. It opens small in the corner; click to make it big (a theater). The wall shows the
drawing live to the whole room; it stays until Clear or the room empties.

Tools: pen, 6 colours, 3 sizes, eraser, undo (your own last stroke), Clear (anyone, with a
confirm). **Save as image**, and **Share to Room chat** for members. Anyone in front draws, guests
too, but not someone timed out. A rate limit per person (`apps/game/src/rules.ts`) lets a fast pen
draw all day and cuts a flood to a trickle.

## ✏️ Draw & Guess

A pass-it-along drawing game at the **art corner** (3–10 players, sit at the table to join).

- **Draw & Guess:** write a prompt → the next draws it → the next describes it → …
- **Copycat:** draw anything → the next sees it for 8 s and redraws it from memory → …

Writing is masked by the room's word filter. Everyone plays at once; each player starts a chain, chains move on each step (up to 8 steps).
Timers: write 30 s, draw 60 s, describe 30 s (Copycat: 8 s look + 45 s draw). Time up sends what
you have; two empty turns in a row, or leaving, puts you out. Then **the album** plays chain by
chain for everyone (host can pause or skip; reactions; save or share a chain). **No scores.**

The whole game is one panel (a theater); nothing in 3D changes. Generic names only: never Gartic
Phone, Telestrations or their mode names.

## In the code

- Pick a Side: `apps/game/src/pickASide.ts`, rules and built-in decks
  `packages/shared/src/pickASide.ts`. The room state shows only the current question, and a quiz's
  right answer only at the reveal.
- Room decks: `apps/api/src/decks/`. The host's page gets the deck **signed for that room**
  (`POST /api/decks/:id/pass`) and hands it to the game server, which trusts it like a join ticket.
- Whiteboard: `apps/game/src/board.ts`, protocol `packages/shared/src/board.ts`. Strokes relayed as
  points (0–1 coordinates), kept in memory. Limits: 4,000 points a stroke; past 200,000 on the
  board the oldest strokes give way.
- Draw & Guess: `apps/game/src/drawGuess.ts`, rules `packages/shared/src/drawGuess.ts`. **Nobody
  can peek:** each player gets only what they work from (`tel:turn`); chains go out at the album.
  When time runs out the server asks each page for what it has (`tel:collect`) and waits 2 s.
  Drawings go up in pieces under Colyseus's 4 KB message limit. Text up to 80 chars, drawings up to
  20,000 points.

## Not built yet

- **✨ AI decks** (a [Plus](15-plus.md) perk, shows as Coming soon): type a topic, AI writes 15 questions, 3 a day
  Free and 30 Plus. Needs an AI provider key the owner sets up.

## Not doing

Sharing decks between rooms (could come later as "copy to another room"), pictures in questions,
custom timers, scores in Draw & Guess.
