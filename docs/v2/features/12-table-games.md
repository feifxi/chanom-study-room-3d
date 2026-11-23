# 12. Table games: chess and Slave

**Status:** **done in the demo** (chess and Slave, 2026-11-21). Werewolf was dropped on 2026-11-20
and Color Cards on 2026-11-21 (see [the decision log](../decisions.md)). On the real backend:
**chess** runs on the game server (2026-11-23, Library only until the other maps get a chess
table); Slave is next.

**Try chess:** http://localhost:3100/servers/chanom/rooms/library → Activities → Chess → **Go
there**, **E** to sit, 📣 **Call everyone** (a friend takes the other stool), **Start**. To watch,
Demo tab → **Two friends play chess**, then walk onto the chess table's rug.

**Try Slave:** same room → Activities → Card games → **Go there**, **E** to sit, 📣 **Call
everyone** (two friends sit down), **Start**. Press **Play again** after the results to see the
card swap. To watch, Demo tab → **Three friends play Slave**, then walk onto the card table's rug. In the demo the other players are scripted; the real app has no bots.

What already exists:

- The **Library** has **one card table with 6 stools** and a **chess table** with 2 stools facing
  each other (where the second card table stood). The Café and Rooftop still have two 4-stool card
  tables and no chess table, until they're redone (see [07-maps.md](07-maps.md#map-polish-backlog)).
  Map files: `demo/src/features/map/*.ts` (`cardTables`, `chessTable`).
- The activity framework ([09-activity-framework.md](09-activity-framework.md)) gives the flow:
  sit at the table → gathering lobby → Start → Playing → Results.
- Common rooms allow card games.

Decided (2026-11-21, the owner):

- **6 seats at the card table:** friend groups are often 5–6. Slave takes 3–6.
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
- **The 3D table is decor:** a walnut board on a small oak table with the pieces always in the
  starting position, in simple but recognisable shapes. The game lives only in the panel (players
  and watchers). It's all static, merged into the map's batch, so it costs nothing per move.

### Backend notes

- The server owns the game (`ChessTable` in `apps/game/src/activity.ts`, room state `chess`):
  `{ white, black, moves (SAN), fen, lastFrom, lastTo, takenW, takenB, drawOffer, endWinner, endWhy }`.
  It checks every move with the rules in `@connecta/shared/chess` (chess.js; the client uses the
  same code to show legal squares) and replays the move list, so repetition draws work. Clients send `chess:move {from, to, promotion}`,
  `chess:resign`, `chess:draw:offer`, `chess:draw:answer`.
- Cost: nothing stored; a game lives with the room.

### Not now

- Playing the computer (a solo mode), clocks, ratings, puzzles, a move list or replays, takebacks,
  **Makruk** (Thai chess) as a second mode.

## Slave

At the **card table** (6 stools), **3–6 players**, Thai rules kept simple. Code:
`demo/src/features/activities/slave/` (`game.ts` the rules, `SlavePanel.tsx` the screen).

### Rules

- One deck dealt out evenly (with 5 or 6 players some hold one more card). **3 is lowest, 2 is
  highest; suits ♣ < ♦ < ♥ < ♠.**
- Play a **single, pair, triple or four of a kind**. The next play must be the **same number of
  cards** and beat it (compared by its highest card). Pass and you sit out the rest of that trick.
  When everyone else has passed, the last player to play **leads anything**; if they just went out,
  the next player still in leads.
- **The 3♣ leads the first game.** You can't pass when leading.
- **No straights, no bombs, no revolution.**
- First out of cards is **King 👑**, second **Queen 💎** (4+ players), last **Slave 🧹**, the rest
  **Commoners 🙂**.

### How it works

- **Joining:** sit on a stool; the lobby's **Start** deals when 3 or more are in.
- **The swap:** when the **same group** presses Play again, the game starts with a swap. The
  Slave's **2 best cards go to the King automatically**; the King **picks 2 to give back**. With a
  Queen, the next-to-last gives the Queen their best card and gets 1 back the same way. 20 s to
  choose (time up: your lowest cards go back). Then **the Slave leads**. A new or missing player
  means a fresh game with no titles.
- **Turns:** **20 s** (**15 s** with 5–6 players). Time up: **pass**, or when leading, **play your
  lowest card**.
- **Someone stops playing:** **Leave**, or **away 30 s** (the framework's rule): they're out as
  **last**, their cards are removed, and the others **play on**. When only one is left holding cards, the
  game ends. The host's **End** stops it with no result.
- **Results card:** "👑 Mai is King!", everyone in finishing order with their title; **Play again**.
- **Watching (like chess):** anyone standing on the card table's rug while a game is on gets a
  **small view in the corner**: whose turn, the cards to beat, everyone's card count. A click makes
  it big (a theater: the chips with cards left, passed and out, and the felt). **Watchers never see
  anyone's hand.**

### On screen and in 3D

- **A theater** ([spec 9](09-activity-framework.md)) while you play: the game's strip on top, then
  the status ("Your turn: beat it or pass", "Mai is thinking…") and a **timer bar**, the others as
  chips (face, name, cards left, passed, out, left), the **pile on green felt** ("Mai played a
  pair"), and **your hand** along the bottom, overlapping when it's long.
- **Tap cards to pick them** (they lift); **Play** lights up only when they make a legal play, and
  **Pass** is beside it. During the swap the felt shows what you were given and the button reads
  "Give back 1/2".
- **Cards** are Connecta's own: cream, rank and suit in a corner, a big suit in the middle, red in
  the app's pink.
- **The 3D table is decor:** a deck, a few cards dealt face down and a score pad, the same during a
  game. The game lives only in the panel.
- **Titles over heads:** while the group stays at the table, the King's name label has a 👑 and the
  Slave's a 🧹.

### Backend notes

- The server owns the game: `{ players, hands, pile, passed, turn, until, finished, gone, titles,
swap, stage }`. **Each client receives only its own hand** and the others' card counts. Clients
  send `slave:play {cards}`, `slave:pass`, `slave:giveBack {cards}`; the server checks them with
  the same rules (`canPlay`) and runs the turn timer. Watchers get the public part only (pile,
  counts, turn, titles).
- Titles live with the table's group between games; nothing is stored.

### Not now

- Straights, bombs, revolution and other house rules, scores across games, a second card game,
  any live 3D of the game (cards on the table, a turn ring).
