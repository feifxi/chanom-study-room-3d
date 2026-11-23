# 11. Pick a Side, whiteboard, Draw & Guess

**Status:** decided and built in the demo. On the real backend: the **whiteboard** is relayed by
the game server (2026-11-23), and so are **Pick a Side** with the room's own decks (2026-11-23)
and **Draw & Guess** (2026-11-23). **Try it:** http://localhost:3100/servers/chanom/rooms/library

- Activities → Pick a Side → **Go there**, press **E**, pick a mode and a deck (try **✨ AI**), 📣
  **Call everyone**, **Start**. Walk into a zone to answer. Or Demo tab → **Someone starts Pick a
  Side**.
- Walk to the whiteboard and draw (no E: the small board opens as you arrive). Demo tab → **Someone draws on the whiteboard** shows a
  cat appear on the wall, live.
- Activities → Draw & Guess → **Go there**, **E**, pick a mode, **Start**. Or Demo tab → **Someone
  starts Draw & Guess**.

Three party pieces, all on the shared activity flow ([09-activity-framework.md](09-activity-framework.md)):
a walk-to-answer quiz game, a free drawing wall, and a pass-it-along drawing game.

## 🗳️ Pick a Side

### The game

A room-wide game on the **open floor** (feature 9's rounds flow). A question and a timer; you answer by
**walking into a zone** of the floor's rug. When the timer ends, answers lock where people stand; the reveal
shows for 4 s; then the next question. Standing outside every zone = no answer.

| Mode                    | Zones | Right answer                                | Timer | Ends                                   |
| ----------------------- | ----- | ------------------------------------------- | ----- | -------------------------------------- |
| 🤔 **Would you rather** | 2     | none; the reveal shows the split ("7 vs 3") | 10 s  | after 10 questions; no winner          |
| 🧠 **Quiz**             | 4     | yes, +1 each                                | 15 s  | after 10 questions; highest score wins |

- **Nobody is knocked out for a wrong answer:** everyone plays the whole game.
- Ties in Quiz share the win. Leaving mid-game is a loss, as in every activity; one player left wins.
- Would you rather ends with "that's a wrap", and who stood with you most ("Jod thinks most like you").
- **Both modes can be played alone** (1–50 players). Solo there's no winner: Would you rather just
  shows your picks ("Play with friends to see how the room splits"); Quiz ends with your score ("you
  got 7 of 10 right").

### Questions: decks

A **deck** is one topic. The host picks **mode, then deck**; the game draws the questions. Nothing else
to set (question count and timer are fixed above). Opinion decks (2 answers) go with Would you rather;
quiz decks (4 answers, one right) go with Quiz. Changing the mode switches to a
deck that fits.

- **Built in**, by topic. Would you rather: Food, Pets, Love & dating, Study life, Weird. Quiz: General
  knowledge, Movies, Science, Geography. (The content team grows these.)
- **This room's decks:** a room's own questions (inside jokes, the class's notes), kept with the
  room. **Members write them** (a name and 3–50 questions) and change their own; the owner and mods
  can delete any; **everyone let in can host with them**, guests too. Up to 100 per room. The picker
  shows who wrote each. (Decided 2026-11-23: decks belong to the group, like its chat.)
- **✨ AI deck:** type a topic ("Thai history", "chapter 3 biology") and AI writes 15 questions of the
  right kind. You glance over them, then **Use it** (and can **Save to this room**). **3 a day on Free, 30
  with Plus** (AI calls cost money). This replaces the separate "AI quiz" game.
- **No repeats:** the room remembers which questions it has played and draws unplayed ones first; when
  a deck runs out, it starts over (Jackbox's trick).

### On screen

- **3D (everyone sees it, from anywhere):** the open floor splits into 2 or 4 coloured zones (A pink, B blue,
  C yellow, D green) with just the letter painted on the floor (the answers are read in the panel). The rug is cut along its own
  edges (a 2×2 square, never pizza slices); the camera looks in corner-on, so on screen A is the top
  quarter, B right, C left, D bottom, which is the HUD's 2×2 grid turned 45°. With two zones, A is
  up and left, B down and right. The zones are opaque, so the four-colour rug underneath never shows
  through (Would you rather shows two colours). The letters lie flat but turn with the camera, so they
  read straight however the view is turned. At the reveal the right zone stays lit and the others
  fade.
- **Small HUD** under the top strip (the room stays visible): question number, deck, timer bar, the
  question, the answers with **live counts** of who's standing where, "You're on B · you can still
  move". Quiz shows the top three scores.
- **Reveal:** the right answer ticked; the split as bars; your result ("✓ Right! +1", "Not this time · it was
  B", "7 vs 3 · you're with the few 😎 · Mai picked with you").
- **Lobby:** the mode picker plus a **Deck** button (tabs: Built in · This room · ✨ AI; the AI tab waits for Plus); non-hosts see
  the deck's name.
- **Results card:** Would you rather lists who stood with you; the quizzes list right answers, with
  medals.

### Backend notes

- Runs on the game server as the floor's game (`apps/game/src/pickASide.ts`, rules and built-in
  decks in `@connecta/shared/pick-a-side`). The floor is a **standing spot**: E sends
  `activity:start`, the host picks the mode (`activity:game`) and the deck (`side:deck`). The room
  state `side` shows **only the question being asked** and a quiz's right answer only at its
  reveal; answers are read from where people stand when the timer ends. `picks` (each player's
  answers so far) lets everyone see who picked like them.
- Room decks: `room_decks(id, room_id, author_id, name, kind, questions jsonb)`, API module
  `src/decks` (`GET/POST /api/rooms/:id/decks`, `PATCH/DELETE /api/decks/:id`). The host's page
  asks `POST /api/decks/:id/pass` for the deck **signed with GAME_SECRET for that room** and hands
  it to the game server, which trusts it like a join ticket (it has no database) and checks it
  against the rules again. Built-in decks go by id.
- Room settings → Room-wide games is in the join ticket and a live room event: off, the floor's
  game ends and E there does nothing.
- Played questions per room: a small list of question ids per deck (in memory with the room is enough;
  it resets when the room empties).
- AI decks: one LLM call per deck (15 questions as JSON), a per-user daily counter. Text from users and
  AI goes through text moderation (later, with AI moderation).
- Cost: AI calls only; capped per user per day.

### Not now

- Sharing or publishing decks, a deck library, pictures in questions, custom timers and question counts,
  mixed modes in one game.

## 🎨 Whiteboard

A **free zone**, not an activity (like the Buddy Machine: not in the Activities list, no activity
strip). It uses the drop-in machinery at each map's whiteboard (the library's board, the café's menu
board, the rooftop's chalk wall), the same flow as the big screen.

### How it works

- **Always on, no E.** **Being right in front of it is drawing**: the area is only the strip in front
  of the board (1.6 m deep in the library), with **no rug, outline or step-on flash**. Walk up and the
  board opens small in the corner (walking past never fills your screen); click it to make it big.
  Step out and it closes. Everyone there draws on the same board, live; voice keeps working.
- **The wall shows the drawing live** to the whole room, so people walking past see it fill up. It's
  a matte board lit by the room (dimmer at night), not a glowing screen.
- **The drawing stays** until someone presses Clear or the room empties (the room resets then, like
  everything else). Nothing is kept by Connecta.

### The panel

- **Big panel** for drawing (precise input, phones too), opened from the small board. A theater like
  the watch panel's: it fills the screen above the dock, the room dims and the other panels step
  aside, the chat too. **Chat** opens the chat beside the board (the board moves over to make room).
  A press on the room, Escape or Activities shrinks it to the corner (that press doesn't walk you); a
  click on the small board makes it big.
- **One fixed board** (16:9, like the wall). No pan or zoom.
- **Tools:** pen, 6 colours, 3 sizes, eraser, **undo** (your own last stroke, Ctrl/Cmd+Z), **clear**
  (anyone at the board; asks "Clear the whole board for everyone?").
- **Save as image** (PNG) and **Share to Room chat**, like photo mode. No gallery.
- No text boxes, stickers or shapes for now: a pure drawing board. Draw & Guess reuses this
  canvas and its tools.

### Backend notes

- Strokes are relayed by the game server as a stream of points, apart from the room state
  (`apps/game/src/board.ts`; the protocol is `packages/shared/src/board.ts`): `board:start`,
  `board:add`, `board:undo` (your own last stroke, by account, so it works after a reload),
  `board:clear`, and `board:sync` → `board:all` for whoever arrives. Kept in memory with the room
  (gone when it empties or the map changes). Points are 0–1 board coordinates, so every screen and
  the wall draw the same.
- **Who draws:** whoever stands in the board's area, guests too; not someone timed out. The server
  checks the pen (the board's colours and sizes, or the eraser) and the points, and takes back a
  refused stroke on the drawer's screen too.
- **Limits:** 200 points per message, 4,000 per stroke; past 200,000 points on the board the
  oldest strokes give way (everyone's copy drops them too), so the wall keeps drawing fast.
- **Share to Room chat** is for members (a picture message, like photo mode); Save as image is
  for everyone.
- Your own strokes draw at once; the pointer's coalesced events go out once per move (about once a
  frame). The 3D wall redraws at most 10 times a second.
- Cost: nothing stored; sharing is a normal Room chat image upload.

## ✏️ Draw & Guess

A pass-it-along drawing game at the **Art corner** (rounds, 3–10 players). The whiteboard stays free
drawing; the art corner is where the game is. Two modes, picked by the host:

- **Draw & Guess:** write a prompt → the next person draws it → the next describes the drawing →
  the next draws that → … Watching "a cat in bubble tea" become "a sad potato" is the fun.
- **Copycat:** draw anything → the next person sees it for 8 s and redraws it from memory → … No
  writing.

**Names:** the game is older than Gartic Phone (the paper game Telephone Pictionary). It's called
**Draw & Guess** (it was "Drawing telephone"; "telephone" meant little to people), with the line
"Pass it along and see how it ends up", so nobody expects one drawer and everyone guessing. Our mode
name is **Copycat**. Never use Gartic Phone, Telestrations or their mode names (Knock-off) in the app.

### How it works

- **A theater while you play** ([spec 9](09-activity-framework.md)): the step's panel fills the screen
  and the room dims. It opens with the chat closed, like the whiteboard; **Chat** opens it beside the
  panel, which moves over to make room. The room comes back after the album, between rounds.
- Everyone plays at once. Each player starts a **chain**; every step, each chain moves on to the next
  player. **Chain length = players, capped at 8** steps (with more players, not everyone sees every
  chain).
- **Timers:** write 30 s, draw 60 s, describe 30 s; Copycat's copy step is 8 s to look + 45 s to
  draw. The step ends early when everyone has pressed **Done**.
- **Prompts:** your own, or 🎲 for a random one.
- **Time runs out = what you have is sent** (half a drawing, half a sentence). Sending nothing counts
  as an empty turn: **two empty turns in a row, or leaving, = out**; your later turns are skipped and
  the chains carry on from the last real entry. Out players stay for the album.
- **The album plays on its own** (like Gartic): each chain, step by step, then the next chain. The
  **host can pause it or skip to the next chain** (the last one says Finish). Everyone can react
  (😂 😍 😮 👏), **save a chain** as one tall image or **share it to Room chat**.
- **No scores**: it's for laughs. The results card says "That's a wrap!" with no medals; **Again**
  starts a new round with whoever's there.

### Panel only, no 3D game

- The whole game happens in **one panel** under the activity strip, like Gartic Phone: your turn
  (write / draw / describe / copy), "Sent. Waiting for the others…", then the album. The room and
  voice carry on around it.
- **Where you play:** in the library, a round art table with 10 stools (one per player at most):
  sit down to start or join, like the card tables. Maps without one still use easels and E.
- **Nothing in 3D changes during a game:** no drawings on the table, easels or walls. The art corner
  (table or easels, stools, a paint cart, a gallery) is decor in the map's static batch, so it costs
  nothing per frame.
- The drawing step reuses the whiteboard's canvas and tools (colours, sizes, eraser, undo, clear).

### Backend notes

- The server owns the game (`DrawGuess` in `apps/game/src/drawGuess.ts`, the rules in
  `@connecta/shared/draw-guess`): order (by stool), step, timers, who sent, chains, the album and
  its reactions. The room state `tel` is the flow only: `{ stage, mode, order, steps, step, until,
lookUntil, sent, revealChain, revealShown, revealPaused, reactions, rev }`, never an entry.
- **Nobody can peek:** each player gets only what they work from in a private `tel:turn { step,
source }`; the whole chains go to everyone as `tel:album` when the album starts. A page asks for
  either again with `tel:sync` (a reload mid-game keeps your place).
- **A turn is sent once:** text with `tel:send { step, text }`; a drawing first goes up in pieces,
  `tel:part { step, s, color, size, pts }` (strokes in 0–1 coordinates, under the server's 4 KB
  message limit like the whiteboard's), then `tel:send { step }`. In-progress strokes stay on the
  device; **when the time runs out the server sends `tel:collect`** and waits 2 s for each page to
  send what it has, so half a drawing still makes it. Anyone silent is skipped.
- **Limits:** a prompt or description up to 80 characters, a drawing up to 20,000 points (more
  is dropped), the whiteboard's pens only. Text isn't moderated until the moderation feature.
- The album runs on the server so everyone sees the same entry; the host's `tel:pause` and
  `tel:next` (Finish on the last chain ends it, even paused) work for the room; `tel:react` counts
  one of each emoji per person per entry. Two empty turns in a row knocks you out (`activity:out`
  with why `idle`); you still get the album.
- Cost: nothing stored; a saved chain is drawn on the device, Share is a normal Room chat picture
  (members only).

### Not now

- Scores or votes for the best chain, custom timers, a word-only mode, animation steps.
