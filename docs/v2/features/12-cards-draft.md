# 12. Table games: cards and chess (DRAFT, not decided)

**Status:** paused mid-discussion (2026-11-09); it is the last feature before the port. Nothing
below is approved. These are Claude's proposals from the first discussion, kept so the next person
or agent resumes from here instead of starting over. Discuss each game in detail with the owner
(plain-text questions with a recommendation), research how popular web versions do it, keep it
simple, then build in `demo/` and turn this file into the spec `12-cards.md`. Werewolf was
dropped on 2026-11-20 (see [the decision log](../decisions.md)).

What already exists:

- The **Library** has **one card table with 6 stools** and a **chess table** with 2 stools facing
  each other (where the second card table stood). The Café and Rooftop still have two 4-stool card
  tables and no chess table, until they're redone (see [07-maps.md](07-maps.md#map-polish-backlog)).
  Map files: `demo/src/features/map/*.ts` (`cardTables`, `chessTable`).
- The activity framework ([09-activity-framework.md](09-activity-framework.md)) gives the flow:
  sit at the table → gathering lobby → Start → Playing → Results. The card table runs a placeholder
  game today.
- Common rooms allow card games.

Decided so far (2026-11-21, the owner):

- **6 seats at the card table:** friend groups are often 5–6. Slave 3–6, Color Cards 2–6. With 5–6
  players, consider 15-second turns.
- **Chess**, so a pair has a head-to-head game (Slave and Draw & Guess need 3). Exactly 2 players;
  others at the table watch. Casual: **no clock** (the framework's away rule stops abandoned games).
  Rules from the open-source chess.js library (legal moves, check, mate, castling, promotion). The
  board is a big panel, so it opens in the theater; the 3D board shows the game to people walking
  past. Makruk (Thai chess) could come later as a second mode.

## Card games (at the card table, 2–6 players)

Proposed for both games:

- A **hand tray** at the bottom of the screen (not a big panel), and the camera leans in to the table.
  The room stays visible, so no theater ([spec 9](09-activity-framework.md)); if the game moves into
  a big panel instead, it opens in the theater.
- In 3D: face-down hands in front of each player, a readable pile in the middle, cards that fly when
  played, a ring showing whose turn it is.
- **20-second turns** (time up = auto pass or draw). One round per game, then Play again.

**Slave** (3–4 players, Thai rules):

- 3 is lowest, 2 is highest; suits ♣ < ♦ < ♥ < ♠; the 3♣ leads.
- Singles, pairs, triples and four of a kind. No straights, no revolution.
- Titles King / Queen / Commoner / Slave, with the card swap next game, and a 3D crown or broom over
  heads.
- Open questions: allow straights? (proposed no)

**Color Cards** (an Uno-like game, 2–4 players):

- Own pastel art and name (never Uno's name or art), official-style rules.
- "Last card!" button, and Catch! (+2) if someone forgets.
- Open question: stacking +2s? (proposed no, official rules)
