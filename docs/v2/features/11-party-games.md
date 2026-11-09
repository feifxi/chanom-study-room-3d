# 11. Pick a Side, whiteboard, drawing telephone

Status: Pick a Side and the whiteboard decided (2026-11-09); drawing telephone is next. Overview: [`docs/v2-plan.md`](../../v2-plan.md). The shared activity flow (lobby, host, invites,
leaving): [`09-activity-framework.md`](09-activity-framework.md).

Try it: `pnpm --filter @study/demo demo:dev` → http://localhost:3100/servers/chanom/rooms/library.

- Dock → Activities → Open floor → **Go there**, press **E**. Pick a mode and a deck (try **✨ AI**),
  📣 **Call everyone** (two friends walk over), **Start**. Walk into a zone to answer.
- Demo tab → **Someone starts Pick a Side**: someone else hosts (a different mode each time).
- Activities → Whiteboard → **Go there**, press **E**, draw. Demo tab → **Someone draws on the
  whiteboard**: watch a cat appear on the wall, live.

## 🗳️ Pick a Side

### The game

A room-wide game on the **open floor** (feature 9's rounds flow). A question and a timer; you answer by
**walking into a zone** of the ring. When the timer ends, answers lock where people stand; the reveal
shows for 4 s; then the next question. Standing outside every zone = no answer.

| Mode                     | Zones | Right answer                                | Timer | Ends                                         |
| ------------------------ | ----- | ------------------------------------------- | ----- | -------------------------------------------- |
| 🤔 **Would you rather**  | 2     | none; the reveal shows the split ("7 vs 3") | 10 s  | after 10 questions; no winner                |
| 🧠 **Quiz**              | 4     | yes, +1 each                                | 15 s  | after 10 questions; highest score wins       |
| 💀 **Last one standing** | 4     | yes, wrong or no answer = out               | 15 s  | when one is left (or after 15: all left win) |

- **Last one standing:** if everyone is wrong, nobody is out. People who are out step to the edge and
  watch (the HUD stays, marked "You're out").
- Ties in Quiz share the win. Leaving mid-game is a loss, as in every activity; one player left wins.
- Would you rather ends with "that's a wrap", and who stood with you most ("Jod thinks most like you").

### Questions: decks

A **deck** is one topic. The host picks **mode, then deck**; the game draws the questions. Nothing else
to set (question count and timer are fixed above). Opinion decks (2 answers) go with Would you rather;
quiz decks (4 answers, one right) go with Quiz and Last one standing. Changing the mode switches to a
deck that fits.

- **Built in**, by topic. Would you rather: Food, Pets, Love & dating, Study life, Weird. Quiz: General
  knowledge, Movies, Science, Geography. (The content team grows these.)
- **My decks:** write your own once (a name and at least 3 questions), saved to your account, usable in
  any room. **Private to you** for now; sharing decks comes later.
- **✨ AI deck:** type a topic ("Thai history", "chapter 3 biology") and AI writes 15 questions of the
  right kind. You glance over them, then **Use it** (and can **Save to my decks**). **3 a day on Free, 30
  with Plus** (AI calls cost money). This replaces the separate "AI quiz" game.
- **No repeats:** the room remembers which questions it has played and draws unplayed ones first; when
  a deck runs out, it starts over (Jackbox's trick).

### On screen

- **3D (everyone sees it, from anywhere):** the ring splits into 2 or 4 coloured zones (A pink, B blue,
  C yellow, D green) with the letter and answer painted on the floor. Zones follow the screen: A is on
  the left (top left with four). At the reveal the right zone stays lit and the others fade.
- **Small HUD** under the top strip (the room stays visible): question number, deck, timer bar, the
  question, the answers with **live counts** of who's standing where, "You're on B · you can still
  move". Quiz shows the top three scores; Last one standing shows how many are left.
- **Reveal:** the right answer ticked; the split as bars; your result ("✓ Right! +1", "💀 Wrong side,
  you're out", "7 vs 3 · you're with the few 😎 · Mai picked with you").
- **Lobby:** the mode picker plus a **Deck** button (tabs: Built in · My decks · ✨ AI); non-hosts see
  the deck's name.
- **Results card:** Would you rather lists who stood with you; the quizzes list right answers, with
  medals.

### Backend notes

- Runs as the floor's game in the activity module: `{ mode, deck, questions, i, stage, until, answers,
scores }`. The server reads zones from positions it already has, at the moment the timer ends.
- Decks: `decks(id, owner_id, name, kind, questions jsonb, source)`; built-in decks ship with the app.
  The host's client sends the chosen deck's questions when the game starts.
- Played questions per room: a small list of question ids per deck (in memory with the room is enough;
  it resets when the room empties).
- AI decks: one LLM call per deck (15 questions as JSON), a per-user daily counter. Text from users and
  AI goes through text moderation (later, with AI moderation).
- Cost: AI calls only; capped per user per day.

### Not now

- Sharing or publishing decks, a deck library, pictures in questions, custom timers and question counts,
  mixed modes in one game.

## 🎨 Whiteboard

A **drop-in** activity at the board spot (the library's is on the left wall, between the corner plant
and the Buddy Machine), the same flow as the big screen.

### How it works

- Walk up (or **Go there**) and press **E**: the board is on. **Being in front of it is drawing**: step
  into the area and the panel opens; step out and it closes. Everyone there draws on the same board,
  live; voice keeps working.
- **The wall shows the drawing live** to the whole room, so people walking past see it fill up.
- **Cleared when everyone leaves** (30 s after the last person steps away, like the big screen
  turning off). Nothing is kept by Connecta.

### The panel

- **Big panel** for drawing (precise input, phones too). Like the watch panel: a press anywhere else
  shrinks it to the corner (that press doesn't walk you); a click on the small board makes it big.
- **One fixed board** (16:9, like the wall). No pan or zoom.
- **Tools:** pen, 6 colours, 3 sizes, eraser, **undo** (your own last stroke, Ctrl/Cmd+Z), **clear**
  (anyone at the board; asks "Clear the whole board for everyone?").
- **Save as image** (PNG) and **Share to Room chat**, like photo mode. No gallery.
- No text boxes, stickers or shapes for now: a pure drawing board. Drawing telephone reuses this
  canvas.

### Backend notes

- Strokes are relayed as a stream of points (`stroke:start`, `stroke:add`, `stroke:undo`,
  `board:clear`), apart from the room state, and kept in memory with the room so newcomers get the
  board as it is. Points are 0–1 board coordinates, so every screen and the wall draw the same.
- The client batches points per animation frame; the 3D wall redraws at most 10 times a second.
- Cost: nothing stored; sharing is a normal Room chat image upload.

## ✏️ Drawing telephone

Next: designed with the user before it's built.
