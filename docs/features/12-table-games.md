# 12. Table games: chess and Slave

Two table games on the activity flow ([9](09-activity-framework.md)). Both live **only in their
panels**: the 3D tables are decor, and people who want to follow a game step onto the table's rug
for a small read-only view that grows when clicked (never anyone's hand).

The Library has a **6-stool card table** and a **2-stool chess table**. The Café and Rooftop have
no chess table.

## ♟️ Chess

- **2 players, casual, no clock.** Sit on a stool; Start when both are in. Random colours, swapped
  in a rematch.
- Tap a piece, dots show legal squares, tap one (drag works too). The board turns to your colour.
  Promotion asks which piece. No move list.
- Ends by checkmate, stalemate, the automatic draws, **Resign** or an accepted **draw offer**. No
  takebacks. No turn timer: leaving or 30 s off the stool loses.
- Our own pastel piece set (`chess/Pieces.tsx`).

## 🃏 Slave

At the card table, **3–6 players**, Thai rules kept simple.

- One deck dealt out. **3 lowest, 2 highest; suits ♣ < ♦ < ♥ < ♠.**
- Play a single, pair, triple or four of a kind; the next play must be the same count and higher.
  Pass and you sit out the trick. **3♣ leads the first game.**
- **No straights, no bombs, no revolution.**
- First out is **King 👑**, second **Queen 💎** (4+ players), last **Slave 🧹**, the rest Commoners.
- **The swap:** when the same group plays again, the Slave's 2 best cards go to the King, who gives
  2 back (the Queen and next-to-last swap 1). Then the Slave leads.
- **Turns:** 20 s (15 s with 5–6 players); time up passes, or plays your lowest card when leading.
- Leaving or 30 s away puts you last; the others play on.
- Tap cards to pick; **Play** lights only for a legal play. 👑 and 🧹 show on name labels while the
  group stays.

## In the code

- Chess: `ChessTable` in `apps/game/src/activity.ts`, rules in `packages/shared/src/chess.ts`
  (chess.js, BSD; the client uses the same code for legal squares).
- Slave: `apps/game/src/slave.ts`, rules `packages/shared/src/slave.ts`. The room state holds only
  the public part; **each hand goes to its player alone** in a private `slave:hand` message (asked
  again after a reload).
- Web: `apps/web/src/features/activities/` (`slave/SlavePanel.tsx`, `chess/`). Nothing is stored.

## Not doing

Playing the computer, clocks, ratings, takebacks, Makruk; Slave house rules, scores across games, a
second card game (Color Cards and Werewolf were dropped), live 3D of the games.
