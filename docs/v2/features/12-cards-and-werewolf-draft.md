# 12. Card games and Werewolf (DRAFT, not decided)

**Status:** paused mid-discussion (2026-11-09); it is the last feature before the port. Nothing
below is approved. These are Claude's proposals from the first discussion, kept so the next person
or agent resumes from here instead of starting over. Discuss each game in detail with the owner
(plain-text questions with a recommendation), research how popular web versions do it, keep it
simple, then build in `demo/` and turn this file into the spec `12-cards-and-werewolf.md`.

What already exists:

- Every map has **two card tables** (4 stools each) and a **Werewolf circle** (12 seats around a
  lantern), from the map files (`demo/src/features/map/*.ts`: `cardTables`, `wolf`).
- The activity framework ([09-activity-framework.md](09-activity-framework.md)) gives the flow:
  sit at the table → gathering lobby → Start → Playing → Results. The card table runs a placeholder
  game today; the Werewolf spot is listed as "coming" (`built: false` in `activities/spots.ts`).
- Common rooms allow card games but **not Werewolf** (it needs voice).

## Card games (at a card table, 2–4 players)

Proposed for both games:

- A **hand tray** at the bottom of the screen (not a big panel), and the camera leans in to the table.
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

## Werewolf (at the Werewolf circle, not discussed yet)

Preview ideas only:

- At night the table's voice is muted and wolves get a private text chat; an automatic narrator.
- Roles: Werewolf, Seer, Doctor, Villager.
- 3D: the circle darkens at night, sleeping heads, glowing wolf eyes, ghosts for the dead,
  click-to-vote with arrows between players. "More 3D than just sitting" is the goal from the plan.
