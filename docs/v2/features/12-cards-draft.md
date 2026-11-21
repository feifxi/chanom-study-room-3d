# 12. Table games: chess and Slave (chess decided; Slave DRAFT)

**Status:** **Chess is decided and built in the demo** (2026-11-21, [below](#chess)). **Slave is
next** and still a draft: the proposals under [Slave](#slave-at-the-card-table-36-players) are
Claude's from the first discussion, not approved. Discuss it in detail with the owner (plain-text
questions with a recommendation), build it in `demo/`, then turn this file into the spec
`12-table-games.md`. It is the last feature before the port. Werewolf was dropped on 2026-11-20 and
Color Cards on 2026-11-21 (see [the decision log](../decisions.md)).

**Try chess:** http://localhost:3100/servers/chanom/rooms/library → Activities → Chess → **Go
there**, **E** to sit, 📣 **Call everyone** (a friend takes the other stool), **Start**. To watch,
Demo tab → **Two friends play chess**, then walk onto the chess table's rug.

What already exists:

- The **Library** has **one card table with 6 stools** and a **chess table** with 2 stools facing
  each other (where the second card table stood). The Café and Rooftop still have two 4-stool card
  tables and no chess table, until they're redone (see [07-maps.md](07-maps.md#map-polish-backlog)).
  Map files: `demo/src/features/map/*.ts` (`cardTables`, `chessTable`).
- The activity framework ([09-activity-framework.md](09-activity-framework.md)) gives the flow:
  sit at the table → gathering lobby → Start → Playing → Results. The card table runs a placeholder
  game until Slave is built.
- Common rooms allow card games.

Decided so far (2026-11-21, the owner):

- **6 seats at the card table:** friend groups are often 5–6. Slave 3–6. With 5–6
  players, consider 15-second turns.
- **Slave is the only card game for now**: Color Cards (the Uno-like game) is dropped.
- **Chess**, so a pair has a head-to-head game (Slave and Draw & Guess need 3): see below.

## Chess

At the **chess table** (2 stools facing each other; the Library for now). Exactly **2 players**,
casual, **no clock**. Rules from the open-source **chess.js** (BSD): legal moves, check, mate,
castling, en passant, promotion and the automatic draws.

### How it works

- **Joining:** sit on a stool (sitting is joining); when both are taken, the lobby's **Start** begins
  the game. **Colours are random; a rematch between the same two swaps them.**
- **Playing (a theater, [spec 9](09-activity-framework.md)):** the big board fills the stage under
  the game's strip, the room dims, and the chat opens closed like every theater. **Tap a piece**,
  dots show its legal squares (a ring on a capture), **tap one**; dragging a piece there works too.
  The board turns so **your colour is at the bottom**. The last move is tinted, a king in check
  glows red, and **promotion** asks which piece (queen, rook, bishop, knight). No move list or
  notation.
- **Above and below the board:** each player's face, name and colour, the pieces they've taken and
  "+2" for the one ahead; the player to move is highlighted ("Your move" / "Mai is thinking…").
- **Ending:** checkmate; stalemate; the automatic draws (threefold repetition, the 50-move rule, not
  enough pieces to mate); **Resign** (asks "Resign this game?" first); **Offer a draw** (the other
  player sees "Mai offers a draw · Accept / Decline"; any move withdraws it). **No takebacks.**
- **Someone stops playing:** no turn timer. The framework's rules apply: **Leave**, or **away from
  the stool for 30 s**, loses the game. The host's **End** stops it with no result.
- **Results card:** "♟️ Mai won by checkmate" (by resignation, "· the other player left") or
  "🤝 Draw agreed" (Stalemate, Draw by repetition…); each player's colour; **Play again**.
- **Watching:** anyone standing on the chess table's rug gets a **small read-only board in the
  corner** ("Ploy vs Mai"); a click makes it big (a theater; a press on the room, Escape or
  Activities shrinks it back). Watchers can't move or hint.

### On screen and in 3D

- **Pieces:** Connecta's own simple pastel set (cream and cocoa silhouettes, `chess/Pieces.tsx`);
  the popular free sets carry licences that don't suit the app. Board squares cream and caramel,
  small coordinates on the edges.
- **The 3D table** shows the real game, live: a walnut board on a small oak table, the pieces in
  simple but recognisable shapes (king, queen, rook, bishop, knight, pawn), White's side facing
  White's stool. Between games it shows the starting position. The table is static (in the map's
  batch); the pieces are one instanced mesh per piece type, coloured per piece: 6 draw calls for
  all 32.

### Backend notes

- The server owns the game: `{ white, black, moves (SAN), fen, last, taken, drawOffer, end }`. It
  checks every move with chess.js (the same library the client uses to show legal squares) and
  replays the move list, so repetition draws work. Clients send `chess:move {from, to, promotion}`,
  `chess:resign`, `chess:draw:offer`, `chess:draw:answer`.
- Cost: nothing stored; a game lives with the room.

### Not now

- Playing the computer (a solo mode), clocks, ratings, puzzles, a move list or replays, takebacks,
  **Makruk** (Thai chess) as a second mode.

## Slave (at the card table, 3–6 players)

Proposed:

- A **hand tray** at the bottom of the screen (not a big panel), and the camera leans in to the table.
  The room stays visible, so no theater ([spec 9](09-activity-framework.md)); if the game moves into
  a big panel instead, it opens in the theater.
- In 3D: face-down hands in front of each player, a readable pile in the middle, cards that fly when
  played, a ring showing whose turn it is.
- **20-second turns** (time up = auto pass or draw). One round per game, then Play again.

**Rules** (Thai):

- 3 is lowest, 2 is highest; suits ♣ < ♦ < ♥ < ♠; the 3♣ leads.
- Singles, pairs, triples and four of a kind. No straights, no revolution.
- Titles King / Queen / Commoner / Slave, with the card swap next game, and a 3D crown or broom over
  heads.
- Open questions: allow straights? (proposed no)
