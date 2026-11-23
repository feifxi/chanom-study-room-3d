# Review notes

For the owner's review at the end, next to the [manual tests](manual-tests.md). Each build part
lists what changed, the bugs found and fixed while building it, and what was **noticed but not
fixed** (still open). Decisions aren't repeated here: they're dated in the
[decision log](decisions.md), and the specs say how things work. Newest step last; add to it in
the same change that builds a part.

## Open: noticed, not fixed

Tick or strike these as they're dealt with.

**Tooling and setup**

- [ ] `pnpm --filter @connecta/web perf` defaults to `/servers/chanom/rooms/…`, a 404 in
      `apps/web`; run it with `WEB_URL=http://localhost:3000/common/`. All three maps give
      near-identical numbers at `/common/<map>`, so those copies may all render the library.
- [ ] No Dockerfile for the game server (`apps/game`) yet; needed before any deploy.
- [ ] LiveKit must be running for voice: `docker compose up -d` (it wasn't, locally, until part 3).

**Docs**

- [ ] [Manual tests](manual-tests.md), Step 2: the guest check still says `/invite/cafe-chanom`; real
      links are `/i/<code>` (member) and `/g/<code>` (guest). Its "kick" line doesn't say kick now
      works on guests (ends their pass).

**App**

- [ ] **Mute for everyone isn't in a mod log.** Spec 01 says every mod action goes in one (who,
      what, reason); there's no mod log yet, so it only reaches the game server's log.
- [x] ~~**The cats are each browser's own until part 5 and block walking**~~: the game server runs
      them now, and people walk through them (part 5).
- [ ] **Phone width, headless test:** tapping the "Press E to sit" hint didn't sit the person down.
      Maybe only the test browser (phone-sized but no touch screen); check on a real phone.
- [ ] **The talking ring** (who's speaking) wasn't verified in a browser: Chrome's fake microphone
      only proves who's connected to whom. Covered by the manual voice checks.
- [ ] **LiveKit logs console errors** ("DataChannel error … User-Initiated Abort") in the browser of
      someone taken out of voice (kicked, room deleted). Harmless, but noisy.
- [ ] **The Demo tab's fakes still run inside real rooms** (e.g. "Someone shares their screen on the
      TV" puts a pretend share on your TV only).
- [ ] The gateway's presence handler still accepts a `roomId` from browsers; they send `null` now
      (the game server reports rooms), so it's a leftover.
- [ ] Guests who never come back aren't cleaned up (needs a background job).
- [ ] Signed out, the browser console logs a 401 from `/api/me`: expected, just noisy.

- [ ] **Gift Plus's hint can't say whether the friend has Plus** (people's Plus isn't in the
      friends list), so it says "on top of any they have" for everyone.
- [ ] **Real Stripe hasn't run end to end:** no keys yet. It's tested against a fake Stripe (every
      webhook event) and Stripe's own signature helper; try it with test keys (manual tests).
- [ ] **No plan change:** while a plan renews, a new checkout is refused ("Change plan" on
      Settings leads to the Plus page, which can't switch monthly ↔ yearly yet). Cancel, then buy.
- [ ] **Settings' "Change" (how you pay) and receipts' "PDF" are still demo toasts**; Stripe's
      customer portal and receipt emails would do both once Stripe is on.
- [ ] **A card plan bought while gifted Plus is left** starts its Stripe period today; the date
      keeps whichever is later, so the overlap is lost (gifts come in part 3).
- [ ] **Screen-share quality is only capped in the browser** (the capture's height); LiveKit doesn't
      enforce it. Fine while it's about bandwidth, not fairness.
- [ ] **A room's new limits reach a running game room with the next join** (capacity comes in the
      join ticket), so turning Plus off doesn't push anyone out; part 4 handles the end of Plus.
- [ ] **Pick a Side's AI deck count still reads the demo's `ME.plus`** (`AI_PER_DAY`); AI decks
      aren't built.
- [ ] **Pets add up to 4 more cats** to a full Buddy Machine (13 NPCs); the perf check doesn't
      measure that either (see the next item).
- [ ] **A full Buddy Machine isn't measured by the perf check:** it runs a mock room with the two
      resident cats. Nine NPCs (4 cats at ~25–30 draw calls each, 5 study buddies) likely go over
      the 5-person draw-call budget (160) until cats are merged
      ([06](features/06-3d-room.md#performance)).
- [ ] **A cat napping up on a shelf may be out of reach to pet:** petting needs you within 1.4 m,
      and some nap spots are higher than the floor next to them (as in V1). Not seen in the test.
- [ ] **NPC bubbles and summon notes aren't in Room chat**, only in Bubbles (like people's bubbles).
      Fine by design, worth a look when you review.
- [ ] **Petting quests still count in this browser only** (the "pet a cat" and "use the Buddy
      Machine" quests), until coins and quests move to the API in step 5.
- [ ] **The countdown uses the browser's clock** against the server's end time: a computer clock
      that's off by a minute shows the countdown off by a minute (the minutes saved are the
      server's, so rankings are right). The labels' `clockOffset` is 0 everywhere; a server time
      sync would fix both.
- [ ] **The focus quests still count in this browser only** until coins and quests.
- [ ] **Watch together's timeline uses each browser's clock** against the server's `startedAt`, like
      the focus countdown: a computer clock that's a few seconds off plays a few seconds off (and
      keeps seeking if it's more than 2 s off). A server time sync would fix both.
- [ ] **A refused link closes the Put something on card** (the toast says why), so trying another
      link means opening it again. The card could stay open until the server answers.
- [ ] **The browser still looks the title up too** (the panel's old oEmbed call) before sending the
      link, though the server's title is the one used: one extra request per link.
- [ ] **Common rooms keep the demo's local TV** until moderation and open rooms; photo mode
      there has no Share (they're text only until feature 14).
- [ ] **The 3D budget check doesn't dress anyone in Shop items** (its crowd picks free looks), so a
      room full of witch hats and flower crowns isn't measured. The crown was cut to about 1,500
      triangles; the café at 52 people had ~170k triangles to spare.
- [ ] **The 5-second look cooldown is only in the browser** now that looks go through the API.
      Changing looks quickly with a script would make the API re-send looks to rooms.
- [ ] **A saved look is sent to every room on every game server** (`roomId '*'`), which only
      matters with many game servers; the gateway's presence knows which room you're in.
- [ ] **Old quest progress is never cleaned up** (three small rows per person per day). A nightly
      job could drop rows older than a month; the coin entries stay as the record.
- [ ] **Focus minutes count towards the quest when a round ends**, not minute by minute, so a long
      round's progress jumps at the end.
- [ ] **The API test for Room chat** checks "say things" only on days when it's the test person's
      quest (the pick depends on the account's random id).
- [ ] **Draw & Guess's timers and Copycat's 8 s look use the browser's clock** against the
      server's deadlines, like Slave's turn bar; the server's timer is what counts.
- [ ] **Draw & Guess text isn't moderated yet** (prompts and descriptions; waits for the
      moderation feature, agreed). The album's reactions count once per person per emoji, but
      aren't shown as who reacted.
- [ ] **Slave's turn bar runs on the browser's clock** against the server's deadline; a clock that's
      off by seconds shows the bar wrong (the server's timer is what counts).
- [ ] **Room deck text isn't moderated yet** (waits for the moderation feature, agreed); decks stay
      inside their room, and the room's owner and mods can delete any.
- [ ] **A signed-in visitor with a guest pass** can't add decks (members only), and Share to Room
      chat checks "guest" by the guest-name link, not the room role; worth one check when guests
      get their pass flow finished.
- [ ] **The whiteboard has no rate limit** beyond its size caps: someone could flood it with tiny
      strokes until the oldest go. Fine among friends; worth a per-person rate with moderation.
- [ ] **The invite card shows for 20 s on the browser's clock** against the server's time, like the
      other countdowns (a server time sync would fix them all).
- [ ] **The photo frames are the three free ones**; the Shop's "Photo frames" come with Plus and
      the Shop.
- [ ] **The Everyone cache lives in each API process:** with several API processes, turning "Show
      me on Everyone" off clears only one of them, so another could list you for up to 5 minutes.
      Fine for one process; Redis would fix it when there are more.
- [ ] **"Back to <room>" is remembered per browser** (last room walked into here), not per
      account: on a new device it says "Find a room" until you walk in once.
- [ ] **Everyone ranks from the period's totals of everyone listed** in one query; fine now, but at
      many thousands of people a day it wants a rollup table.
- [ ] **A label says "0m" for the first minute** of a round ("📖 Mai · 0m · Calculus"), as it did
      before; "<1m" or hiding it might read better.
- [ ] **To-dos don't update live in other tabs or devices**: another open tab sees a change when
      it next refetches (on focus or reopening the panel), not instantly. Fine for one person's
      list; the gateway could push it if it matters.
- [ ] **No reordering of to-dos**: new items go last; the `position` column is ready if dragging
      is wanted later (the spec doesn't ask for it).
- [ ] **Away during a break hides the ☕ on your label** (💤 wins, as the spec orders them); the
      Study panel still shows the break counting down.

**From the demo's design passes**

- [ ] Prompts just above the dock ("Press E to sit…", the game lobby card) are centred on the
      screen; between 768 and 1080 px wide a wide one could overlap the raised chat panel.
- [ ] Phones: the small watch view (and chess's) sits in the corner over the "Press E to sit" hint.

## Step 4: walking in a room

### Part 1: walking in for real (`df84475`)

**Changed:** the game server (`apps/game`, Colyseus) with a signed join ticket from the API;
movement, seats, capacity (owner and mods always fit) with Full · notify me, presence from the
game server, live kick, ban, role and map changes, one of you per room, Back asks "Leave …?". The
maps' data moved to `packages/shared`. Decisions: [decision log](decisions.md), 2026-11-22.

**Bugs found and fixed while building:**

- Colyseus reserves `roomId` and silently drops it from `filterBy`, so everyone landed in one game
  room: the join option is `place`.
- React's dev double-mount opened a second "ghost" connection that took over the first ("in
  another tab"): joining starts on a timeout that cleanup cancels.
- The demo's "little life" put a made-up bubble ("come sit with us!") under a real person's name:
  the demo's scripts are off in real rooms.
- Removing the browser's "in a room" flag broke the inbox toasts in 3D: it came back as a local-only
  flag.
- A manual-test line claimed your own 🛡️ tools appear at once when you're made a mod; they only
  did after walking in again. Corrected then, and made live in part 2.

### Part 2: bubbles, Away and the people list (`fda8035`)

**Changed:** bubbles and typing through the game server (private zones, time outs), Away 💤, Talk
to everyone's 📢, live looks, the people list's real actions (Add friend, Block, time out, make mod,
kick, ban), the reset when a room empties. Floating reactions moved to part 5; Report stays a mock.

**Bugs found and fixed while building:**

- Part 1's syncing overwrote things only the server can do: a new look didn't reach anyone, and a
  time out didn't stop bubbles in 3D. Both go through the game server now.
- Your role was read once, so being made a mod didn't show your 🛡️ tools until you walked in again:
  it's live now.
- Send a message on someone who isn't your friend opened a read-only "you aren't friends" chat: it
  shows only for friends (DMs are friends-only).
- Guests saw Send a message, Add friend and Block: hidden (spec 01).
- A mod couldn't kick a guest (the API needed a membership): kick ends a guest's pass.
- Losing your mod role while talking to everyone left 📢 on your own screen: it turns off.

### Part 3: proximity voice (`64d40df`)

**Changed:** LiveKit voice: distance and stereo, the 12 nearest, private zones enforced by LiveKit
through each speaker's own client (a deviation from the spec's wording, agreed), deafen, guest
voice switched live, Mute for me (remembered per browser) and Mute for everyone (until lifted or the
room empties), time outs and Away take the mic. A dev-only `window.__connecta` test handle.

**Bugs found and fixed while building:** none in the app.

### Part 4: screen share (`9624b93`)

**Changed:** desk shares to your table and the TV share are real (LiveKit, to that audience only);
desk shares use the TV's share panel, one per table. YouTube stays each browser's own until step 5.

**Bugs found and fixed while building:** none in the app (the browser test's own timing needed
fixing).

### Part 5: cats, study buddies and the Buddy Machine (`848eafb`)

**Changed:** the Buddy Machine's panel was designed in the demo first and approved (summon a cat or
a study buddy, the "In the room" list with Goodbye, limits and the cooldown, beside the machine so
the capsule shows). The game server runs the NPCs (`apps/game/src/npc/`, V1's NpcDirector made
map-aware): resident cats on every map, petting with floating hearts (moved here from part 2) and
following, study buddies at desks with 25/5, greetings and cheers, giving up a seat, goodbyes, and
a reset with the room or a map switch. The web app mirrors them and shows their bubbles, hearts
and notes. People walk through cats and study buddies (client collisions no longer include them;
the server never had them). `window.__connecta.npcs()` for browser tests. V1's "sleepier at
night" (Bangkok time) was left out. Decisions: [decision log](decisions.md), 2026-11-23.

**Bugs found and fixed while building:**

- The machine's panel first sat in the middle of the screen, right over the machine and the
  capsule rolling out (seen in the demo's first screenshot): it sits beside it now (right on a
  computer, top on a phone).

The browser test needed fixing twice (a person standing on another's spot, a spot next to a chess
stool where E sat Jod down); neither was an app bug.

## Step 5: the rest, a feature at a time

### Focus, part 1: the timer on the game server (`bb0830a`)

**Changed:** the focus timer runs on the game server (`apps/game/src/focus.ts`): `focus:start`,
`focus:stop` and `focus:subject` replace the client's old `status` message, and `away { on }` is
its own message, with a running round winning over away. Ended rounds of 1+ minute go to a BullMQ
queue (`focus-rounds`) that the API's new focus module saves into `focus_sessions` on the person's
own day (`users.time_zone`, synced quietly from the browser through `PUT /api/me/time-zone`).
`GET /api/rooms/:id/focus/today` plus the game server's `todayMin` and running rounds fill the
Study panel's Today tab in real rooms. One timer per account across rooms (`game:focus`, later replaced by one room at a time), a reload
carries a running round over, and presence shows "Focusing · Calculus" to friends (never Away).
Guests get the timer, never saved. Mock rooms (Common rooms until feature 14) keep the browser's
own timer. Decisions: [decision log](decisions.md), 2026-11-23.

**Bugs found and fixed while building:** none in the app. The game server tests' timing needed
fixing (a start and stop slower than the 40 ms test "minute", state arriving a patch later). A
headless run on the dev stack walked in, ran a real round for a minute, stopped it, and saw it
saved (on the Bangkok day) and listed in Today.

### Focus, part 2: the to-do list (`433889e`)

**Changed:** the to-do list is on the API (`todos` table, `/api/todos`, full accounts only, 50
items of 120 characters) with a 3 am job removing done items older than 7 days (the list hides
them at once). The Study panel's To-do tab uses it with changes shown at once and rolled back with
a toast if the API refuses; the mock to-dos left `lib/focus.ts`. Deleting an account deletes its
list.

**Bugs found and fixed while building:** none in the app. A headless run at phone width in dark mode
added, ticked, reloaded, cleared done and deleted, and the API held the result.

### One 3D room at a time (`3aa567d`)

**Changed:** walking into a room tells every game server (`game:walked-in`), and any other room
you're in lets you go with a new close code (4005, "You walked into another room" with **Walk back
in**). It replaces part 1's separate "one timer per account" channel, since one room at a time
covers it. Decision: [decision log](decisions.md), 2026-11-23.

**Bugs found and fixed while building:** none. A headless run with two tabs in two rooms saw the
first tab let go, Walk back in work, and the second tab let go in turn.

### Focus, part 3: the Focus page and rankings (`d471d13`)

**Changed:** `GET /api/focus/me` (my numbers) and `GET /api/focus/rankings` (Friends or Everyone,
today or this week, in the viewer's time zone, 12 hours a day at most) replace the page's mock
data. "Show me on Everyone" is an account setting (`users.show_on_everyone`, null = the age
default), shared by Settings and the page. The hero goes back to your last room or to Discover.
Rounds now count for the day they started (indexes moved from `ended_at` to `started_at`), "This
room today" included. The room no longer feeds the mock page (`logFocus` and the rest of the mock
focus numbers are gone from `lib/focus.ts`; only mock rooms' "today" stays). Decisions: [decision
log](decisions.md), 2026-11-23.

**Bugs found and fixed while building:** an old "This room today" test placed a round "two days
ago" by its end time only; with days counted by start it showed up as today, so the test now sets
both. Screenshots at 390 dark and 1280 light with a week of sample rounds (removed afterwards)
looked right.

### Watch together on the game server (`1c13f05`)

**Changed:** the big screen is the game server's (`apps/game/src/watch.ts`, room state `watch`):
what's on, the shared timeline and Up next (20 at most), changed by anyone on the rug through
`watch:*` messages, with owners and mods able to turn it off from anywhere. Links are checked with
YouTube's oEmbed on the server first. A TV share pauses the video and it carries on after; nobody
on the rug for 30 s turns it off. In the web app the activity hub mirrors the server's screen in
real rooms (`WatchRemote`), so the panel, the 3D screen, spot tags and the Activities list work as
before; mock rooms keep the hub's own screen. `parseYouTube` and `watchPosition` moved to
`packages/shared`. Decisions: [decision log](decisions.md), 2026-11-23.

**Bugs found and fixed while building:** **in development, a real room stopped following the game
server right after it opened** at phone width: React's development double mount ran the room's
clean-up straight away and nothing subscribed again, so your own position stayed at the door (the
rug, seats and spots thought you were there) while you walked. Desktop hid it because the room got
rebuilt soon after. The room now subscribes in an effect (`LiveRoom.attach`). Production never
double-mounts, so only development was affected. A headless run with two people (desktop and
phone) checked a refused private video, a real video in sync on both, a pause from the phone
reaching the desktop, and Turn off the TV closing the phone's panel.

### Photo mode (`cc75094`)

**Changed:** photo mode's **Share** posts the photo to Room chat as a real picture (the chat's
picture flow: upload, then a message with no text); guests get Save and Copy only. While it's
open the game server shows 📸 by your name (`photo { on }`, the player's `photo` flag) so others
can pose. Decision: [decision log](decisions.md), 2026-11-23 (Watch together and photo mode, in parts).

**Bugs found and fixed while building:** none. A headless run with two people saw 📸 by Mai's name
on the phone, Share post the photo to Room chat (processed, 1248×716), and the 📸 go when she
closed photo mode.

### Party and table games, part 1: the round flow and chess (`447e85f`)

**Changed:** the game server runs the activity framework's round flow (`apps/game/src/activity.ts`):
sitting opens a lobby with the first to sit as host, the host's Start (3 s countdown), End and 📣
Call everyone, Leave and the 30 s rule, leaving the room as leaving, results and Play again. Chess
is its first game (`ChessTable`), every move checked with the rules now shared in
`@connecta/shared/chess`. The web app's hub mirrors the spots the server runs and keeps playing
the others itself until their parts. "Hide game invites while I'm focusing" moved from the
browser to the account (`users.hide_invites_while_focusing`, `PATCH /api/me/notifications`).
Decisions: [decision log](decisions.md), 2026-11-23.

**Bugs found and fixed while building:** **a reload mid-game would have lost it**: the new
connection replaces the old session, which counted as leaving the room. Your place in a round now
moves to the new connection (like the focus timer), with the 30 s to sit back down. A headless run
with Mai (desktop) and Jod (phone) checked the invite card, the lobby, Start, colours on both
boards, a move seen by the other, and Resign ending it with the results card.

### Party and table games, part 2: Slave (`307c590`)

**Changed:** Slave runs on the game server (`apps/game/src/slave.ts`, `SlaveTable`) with the rules
moved to `@connecta/shared/slave`: the deal, the 3♣ leading, every play checked, the 20 s / 15 s
turn timer and the swap's 20 s run there, and the same group's Play again starts with the swap.
The room state carries only the public part (pile, counts, turn, titles); **each hand goes only to
its player** (`slave:hand`), so nobody's browser holds anyone else's cards. A page asks for its
hand when it starts listening (`slave:hand` from the client), which covers a reload mid-game.

**Bugs found and fixed while building:** a hand sent while the page was still loading (a reload
mid-game) would have been lost, leaving you with no cards on screen; the page now asks for it.
A headless run with three people (Mai and Bow on desktop, Jod on a phone) checked the 17/17/18
deal, the 3♣ holder leading, the play showing on the others' felt, and Jod leaving while the other
two played on.

### Party and table games, part 3: the whiteboard (`c4be535`)

**Changed:** the whiteboard is relayed by the game server (`apps/game/src/board.ts`, protocol in
`packages/shared/src/board.ts`): strokes stream as points apart from the room state, kept in
memory with the room, so newcomers get the board as it is. The server checks who's drawing (in
front of the board, not timed out), the pen and the points, and keeps the board from growing
without end. Undo goes by account. **Share to Room chat** now posts the board as a picture
(members only; it was a demo toast). Photo mode and the board share one helper in `RoomView`.

**Bugs found and fixed while building:** a stroke the server refused (walked off mid-stroke,
timed out) would have stayed on the drawer's own screen only; the server now takes it back there
too. A headless run checked a late arrival getting the drawing (panel and wall), Mai's undo
disappearing for Jod, and the Share button for a member.

### Party and table games, part 4: Pick a Side and room decks (`ae3fc3e`)

**Changed:** Pick a Side runs on the game server (`apps/game/src/pickASide.ts`), with the rules
and built-in decks moved to `@connecta/shared/pick-a-side`. The round flow learned **standing
spots**: E opens a lobby with you as host while you walk over (`activity:start`), and the host
picks the mode (`activity:game`). The room state shows only the current question, and a quiz's
answer only at its reveal. **Custom decks now belong to the room** (the owner's call): a
`room_decks` table and API (`src/decks`); members write, the writer edits, the owner and mods
delete, guests play. A room deck reaches the game server as a deck **signed by the API for that
room**. The Deck picker's "My decks" tab is now "This room" (with who wrote each), and the ✨ AI
tab is hidden in real rooms until Plus. Room-wide games is in the join ticket and a live event.

**Bugs found and fixed while building:** a game-server test assumed the first player would stay
ahead when both stood still for the rest of the quiz; it now checks the order by score. A headless
run checked the "This room" tab with "by Mai", picking a room deck, the room deck's question on
Jod's phone, and the Would you rather reveal ("Mai picked with you").

### Party and table games, part 5: Draw & Guess (`5ba5b1f`)

**Changed:** Draw & Guess runs on the game server (`apps/game/src/drawGuess.ts`), with its rules
moved to `@connecta/shared/draw-guess`. The room state carries only the flow; each player gets only
what they work from (`tel:turn`), and the chains go to everyone when the album starts (`tel:album`).
The album, its host controls and its reactions are the server's, so everyone sees the same entry.
When time runs out the server asks each page for what it has (`tel:collect`). A drawing goes up in
pieces (`tel:part`) under the 4 KB message limit. The round flow learned to let a game knock someone
out (`dropouts`, why `idle`: two empty turns). Share to Room chat posts the chain as a picture
(members only); Save names the file `connecta-draw-and-guess.png`.

**Bugs found and fixed while building:**

- The host's **Finish** on the last chain did nothing while the album was paused (in the demo too);
  it now ends the album.
- A whole drawing in one message would have gone over Colyseus's 4 KB limit (closing the player's
  connection). It now goes in pieces, like the whiteboard's strokes.
- An old album could flash for a moment when a new game started; it's cleared on a new game's first
  turn.

A headless run with three people (one on a phone) played a whole game: prompts, drawings (one
collected by the timer without Done), descriptions, then the album in step with the host's Pause
and Finish.

### Coins and quests, part 1: quests and coins (`c403553`)

**Changed:** daily quests and coins are real. The rules and the day's pick moved to
`@connecta/shared/quests`; the API's new `src/quests` module counts and pays (`quest_progress`,
`coin_entries` and `users.coins`; `GET /api/quests/today`). The game server queues what it sees
(bubbles, pets, working summons, finished games, minutes with others, focus rounds) on the
`quest-events` queue; the API counts Room chat itself. The web app reads the API (`useQuests`,
`QuestsListener` with live `quest:done` toasts) and no longer counts anything in the browser; the
demo-only "one step on every quest" button is gone from apps/web. "Play any activity once" joined
the pool.

**Bugs found and fixed while building:** none beyond the design points in the decision log (a
stopped focus round no longer counts as a finished session, as the browser version did when it
reached a break; a refused Buddy Machine summon no longer counts). A headless run checked minutes
with others counted through the queue, and the Buddy Machine paying 15 coins with the toast,
shown live in My tools and the Shop.

### Coins and quests, part 2: the Shop's first set (`a12d0a6`)

**Changed:** the Shop sells 10 items that really show on your character: 6 accessories and 4 outfit
shapes (in your outfit colour), built in code (`features/avatar/character.ts`, the same in the demo
and apps/web) and listed in `@connecta/shared/shop`. Designed in the demo and approved by the owner.
The API's new `src/shop` module owns what you bought (`owned_items`), buys with coins in one
transaction, and checks every saved look (sign-up, guest pass, Settings) only uses free items and
ones you own. The game server takes looks only from the API now (a `look` room event to every
room); the browser's `look` message is gone. Settings → My character shows an Outfit row and your
bought accessories; the Shop page uses the real wardrobe; on a phone the quests come after the items.

**Bugs found and fixed while building:**

- **Anyone could wear anything:** the game server took a look straight from the browser, so a
  changed client could wear Shop items without buying them. Looks now come only from the API.
- **A look saved in Settings changed in the room even when the API refused it** (it switched first
  and saved after). It now saves first and changes only when the API agrees.
- **The same item bought twice at once** answered with a server error from the second buy (nothing
  was charged twice); it now says 409 "You already have it".
- While designing: the flower crown sat inside the hair and cost ~4,600 triangles, the star clips
  were tiny, the bunny ears were cut off in the preview, and the overalls looked like the sailor top
  until they got trouser legs and tee sleeves.

A headless run checked the API refusing an unowned witch hat, buying it in the Shop (1,000 → 620
coins), wearing it, and Jod seeing it on Mai in the room at once.

### Coins and quests, part 3: pets (`798854b`)

**Changed:** four pets in the Shop (Midnight, Tux, Siamese, Snowball): cat coats with an extra (a
star tag, a bow tie, a bell collar, a pink bow; Siamese points, a fluffy ruff, coloured eyes) drawn
by the room's `CatRig`. You name one when buying (`owned_items.name`). The API puts your pets in the
join ticket and sends a `pets` room event after buying one; the game server's NPC director brings
out a pet only for its owner (`pet:summon`), one each and 4 a room on top of the cats, refuses
anyone else's goodbye, and sends it home when its owner's last tab leaves (not when a newer tab
takes over). The Buddy Machine has a Your pets row and hides Goodbye on other people's pets; tags
say "Puff · Mai's cat". The Shop has a Pets tab with a turning preview and a name field. The demo
got the same cats and Shop page (with stand-in hooks), so it still matches.

**Bugs found and fixed while building:**

- The Siamese face mask sat inside the head and didn't show; moved it out.
- The pet preview cut the cat off and swung it side-on; framed wider with a gentler turn.

A headless run checked buying and naming Snowball "Puff" (2,000 → 1,000 coins), Mai bringing Puff
out with Jod in the room (Jod sees the tag and note, and no Goodbye), and Puff going home about
20 s after Mai closed her tab. `demo:perf` passed on every map (one café battery-saver row went
over on JS time once and passed on the rerun).

### Plus, part 1: Plus on the account (`f15cb82`)

**Changed:** `users.plus_until` and a `plus` module on the API (`GET /api/plus`, `plus` and
`plusUntil` on `/api/me`, a dev-only `POST /api/plus/dev`). The "nobody has Plus" constant in rooms
is gone: a room's people at once, members and Big maps follow its owner's plan; the rooms you can
make (new: 10, 30 with Plus) and be in, and your upload size (10, 50 MB), follow yours. The limits
moved into `ROOM_PLANS` (with `owns`, `uploadMb`, `shareHeight`). Players carry `plus` (from the
ticket, and a `plus` room event when it changes), and the name tag shimmers. The web app reads
your real Plus (the Plus page, Settings, the Demo tab's switch and the stand-in checkout call the
dev switch), refreshes on the live `plus` event, sizes uploads by your plan and screen shares by the
room's. The Plus page marks perks with nothing to unlock as Coming soon and uses your own name.

**Bugs found and fixed while building:**

- The new `plus` field never reached the browser: the room copies a fixed list of player fields,
  so the shimmer didn't show until it was added there.
- The Plus page promised "a pet that follows you around" and a profile banner; reworded to what
  exists (the demo too).
- The shimmering name sat on a white chip in the Plus page's hero, where the pastel didn't read;
  it's on a dark chip now.

A headless run checked a Free room (25 / 150), Plus on (50 / 1,000 on a Cosy map), Jod seeing
"✨Mai" shimmer at once, and it going away when Plus ended.

### Plus, part 2: paying (`4a1c755`)

**Changed:** the API's `billing` module: checkouts, plans and receipts (`checkouts`,
`plus_subscriptions`, `payments`), Stripe's hosted Checkout and signed webhook behind one
`StripeGateway`, and a local stand-in when `STRIPE_SECRET_KEY` is unset (the case until the owner
sets up Stripe). Paying, cancelling and resuming are real; a paid checkout moves `plus_until` on and
tells your tabs and rooms. JSON bodies keep their raw bytes (Better Auth's body parser option) for the
signature. The web app's payment page starts a real checkout (Stripe's page, or the stand-in), and
Settings → Plus & billing shows your real plan, date and receipts, with Cancel and Turn renewal back
on. The prices moved to `@connecta/shared/plus`.

**Bugs found and fixed while building:**

- Stripe's newer API moved the renewal date onto the subscription's items and the invoice's
  subscription under `parent.subscription_details`; the code reads them there (checked in the SDK's
  types, not from memory).
- PromptPay's checkout completes before the money arrives (`payment_status: unpaid`), so Plus waits
  for `async_payment_succeeded` instead of turning on early.

A headless run paid for yearly Plus with PromptPay on the stand-in (Plus until next year, a ฿890
receipt), was refused a second plan, and cancelled from Settings ("Ends on 23 Nov 2027").

### Plus, part 3: Gift Plus (`4a147b4`)

**Changed:** `POST /api/billing/gift` starts a gift checkout (friends only); once paid, the months
go on the friend's Plus (on top of any left), you get the receipt and "Gifts you sent", the friend
gets a 🎁 gift card in your DM (`kind: "gift"`) and a `gift` 🔔 notice, and a friend paying by card
has their Stripe charge moved to the new date. The web app's Gift Plus dialog uses your real
friends and is in the friend's "…" on Friends, the DM's "…" and the Plus page; the payment page
pays gifts through the API; the DM card, the DM list's last line, the toast and the inbox icon know
gifts.

**Bugs found and fixed while building:** none; the tests and the headless run passed the first
time.

A headless run: Mai gifted Jod 3 months with a note from Friends; Mai landed in the DM with the
card and "Gift sent to Jod"; Jod had Plus until 23 Feb 2027, the card with the note, the 🔔 notice,
and no receipt; Mai had the ฿249 receipt and "Gifts you sent".

### Plus, part 4: when Plus ends (`fb3119a`)

**Changed:** rooms read their owner's Plus through `roomPlus` (Plus plus 7 days of grace), while
personal perks keep `hasPlus`. A 10-minute sweep (`PlusEndingService`) sends each step once per
date as a 🔔 `plus` item and an email: the 3-day reminder (PromptPay "pay to renew", or "ends on"),
"Plus ended" (and the ✨ name goes live), the last-day warning for owners, then their rooms go back
to Cosy and 25. A failing card keeps Plus while Stripe retries (`invoice.payment_failed`). PromptPay
plans can pay again on top while they run. The web app's grace state, Home banner (naming your
rooms), the Demo tab's Plus states and the inbox icon are real.

**Bugs found and fixed while building:**

- The sweep found nobody: "not already done" was written as SQL `NOT (plus_notice LIKE 'over@%')`,
  which is never true for an empty `plus_notice`. It now asks for empty ones by themselves.
- "Plus ended" said "7 more days" even when it went out late, and "your 6 rooms … goes back"; it now
  counts the days left and agrees with one room or many.

A headless run: Mai with Plus and a Big room set to 80 switched to "Ended · grace": the 🔔 item and
the email arrived, Home showed "your rooms keep their space for 5 more days", and the room stayed
Big at 80.

**Open:**

- [ ] **Plus ending is up to 10 minutes late** (the sweep's pace), and a Plus that just ran out keeps
      its ✨ name in a room until then.
- [ ] **Grace's end isn't live for people inside:** the lower limit applies to the next people to
      come in (by design nobody is moved), and the Big → Cosy switch has no 3D difference yet.
- [ ] **PromptPay renewal uses our payment page,** not a Stripe PromptPay invoice; with Stripe on it
      pays as a one-off checkout, which is fine, but Stripe's own reminders aren't used.

### Moderation, part 1: Common rooms (`10b2d3e`)

**Changed:** Common rooms are real. Their three types live in `@connecta/shared/common`; the API's
`common` module picks your copy (friends first, then the busiest copy under 20, else a new one; up to
25 when joining a friend) and signs a ticket marked Common; the game server makes that copy text
only for everyone (no voice at all, no videos, 3 s slow mode). Presence names a friend's copy so
Home and Friends can walk you in beside them. The web app's Discover and Home cards, the
`/common/<type>` page (with a name-and-look step for people without a session) and the friends'
Walk in links use it; the demo's `COMMON_ROOMS` and `commonCopyFor` mock is gone from `apps/web`
(the admin site's Common page still reads it).

**Bugs found and fixed while building:**

- A guest in a Common room was offered "Join Common rooms ✨" (the old room-name sign-up nudge); it
  says "Make an account ✨" there now.

A headless run: Mai walked in from Discover (copy #1), Jod saw her on Friends and walked in beside
her, and a signed-out visitor picked a name and walked in as a guest: three in Cat Café #1.

**Open:**

- [ ] **The admin site's Common page is still mock** (copies, seats and the notice banner), until
      the admin site step.
- [ ] **Room capacity settings for Common rooms** (25 and 5) are constants, not admin settings yet.
- [ ] **A Common copy's look is the map's default** and the 3D room still takes the mock
      `PUBLIC_SERVER` shape, with the copy as its one room.

### Moderation, part 2: the word filter (`d1006b3`)

**Changed:** `@connecta/shared/moderate` holds the filter (`obscenity`'s English set, our own list
with Thai). The API masks room chat (following the room's Filter words), DMs and edits, and refuses
blocked words in names, @handles, room names, descriptions and rules; the game server masks bubbles
(the ticket carries the room's setting, a room event changes it live; always on in Common rooms).
The pictures worker now asks OpenAI's moderation endpoint (`PictureCheck`), which stays off until
`OPENAI_API_KEY` is set. The web app's sign-up, Settings → Profile and guest steps show the refusal's
reason instead of "Try again", and `problem()` drops the field name from validation messages.

**Bugs found and fixed while building:**

- Validation errors reached the screen as "description: That description has…" (the pipe prefixes
  the field); `problem()` now shows the sentence alone.
- The Common rooms test could fail right after a browser run: it cleared its own Redis keys but not
  the presence of Common copies, which the dev Redis still held for a guest who'd just left. It
  clears those too now.

A headless run: a guest named "Fuckface" was refused with the reason, then walked into the Library
as "Mint" and "this is shit lol" popped up as "this is **** lol".

**Open:**

- [ ] **The word list is in code** (`OWN_WORDS`), until the admin site's Moderation page edits it.
      The Thai list is short and needs a native speaker's pass.
- [ ] **Messages sent before this change** aren't masked after the fact.
- [ ] **The picture check hasn't run against OpenAI** (no key yet): only its test with a stand-in
      answer. When the owner adds a key, send a picture to confirm.
- [ ] **Links aren't clickable in Common rooms** (spec 14) was already true for bubbles (bubbles
      never make links); nothing else changed there.

### Moderation, part 3: reports (`b6876fb`)

**Changed:** a `reports` table and the API's `reports` module (`POST /api/reports`) for people,
messages and rooms, with the context the team needs. The automatic steps count accounts that are
there, once each per window: 3 in 10 minutes mutes someone in a room for 15 minutes (the mod
timeout, never the owner); 5 in 30 minutes puts someone out of Common rooms for an hour (the Common
ticket refuses them, the game server sends them out). The web app has one report dialog for people
and messages (the people list in 3D, DMs' "…", and a new Report button on others' messages in room
chat and DMs, carrying the bubbles you saw), and the room report dialog sends for real. The person
dialog no longer says reports go to the room's mods.

**Bugs found and fixed while building:**

- None in the app. (A browser script's sign-ins hit Better Auth's rate limit when run back to back;
  the script retries now.)

A headless run: Jod wrote in Mai's room, Mai hovered the message → Report → Harassment, "mean to
everyone" → the report was stored with the message, the room's name and counted.

**Open:**

- [ ] **Nobody reads reports yet**: the admin site's Reports page (next step) is still mock; until
      then they're in `pnpm db:studio`.
- [ ] **A guest's automatic mute lasts only while they're inside**: guests have no membership to
      hold a timeout, so walking back in clears it (they can't use room chat anyway).
- [ ] **No limit on how often one account reports**: repeats are kept but count once; the admin
      site can show who reports too much.
- [ ] **The muted person isn't told why**: they see the usual "You're timed out", like a mod's
      timeout.

### Moderation, part 4: team accounts in Common rooms (`c90b71d`)

**Changed:** a `team` flag on users, set by `pnpm --filter @connecta/api team <handle> [off]` and in
`/api/me`. Team accounts get a "Connecta team" chip in Common rooms (the ticket and the game
server's player carry it; the web client now copies the field). The demo's team menu in a person's
"…" is real: Time out (kept per person, so it holds in any copy) and Remove from Common rooms for an
hour (the walk-in screen says the team did it, not reports). Automatic report steps skip team
accounts. Moderation (feature 14) is done apart from what waits for the admin site.

**Bugs found and fixed while building:**

- The chip wouldn't have shown: the web client copies only listed fields from the game state, and
  `team` wasn't on the list.

A headless run: Mai was put on the team, both walked into the Cat Café (Jod saw Mai's chip), Mai
opened Jod's "…" → Remove from Common rooms → Jod got "You were taken out". Mai was taken off the
team and Jod's hour cleared afterwards.

**Open:**

- [ ] **No audit log of team actions** (only the API's log), until the admin site.
- [ ] **"Open in the admin site"** still opens the mock admin site.
- [ ] **A team account has no powers in people's own rooms** (by design for now); suspensions and
      bans come with the admin site.

### Admin site, part 1: the gate, Users and account actions (`7a55952`)

**Changed:** `users.suspended_until` and `banned_at`, `account_actions` and `audit_log` tables; the
API's `admin` module (team only, 404 otherwise) with the Users list, one account and its actions;
a global `AuditService` that the account actions, the Common room team actions and the report steps
write to; account emails (`mail/account-mail.ts`); a Better Auth hook refusing new sessions for
suspended and banned accounts, with the reason. The web app's `/admin` checks the team flag on the
server (the demo's "View as" wall is gone from `apps/web`), the avatar menu's Admin site follows the
account, the Users page is real (with a reason box: every action is emailed), sign-in shows why an
account can't sign in, and open tabs of a suspended account go to sign-in.

**Bugs found and fixed while building:**

- The sign-in message ran the reason into "Reply to our email…" when the reason had no full stop.
- The Users page said "1 accounts".

A headless run: Jod got 404 on `/admin`; Mai (on the team) suspended Jod for a day from the Users
page while Jod had Home open, and Jod's tab went to sign-in; Jod's next sign-in showed the
suspension, its end and the reason; the email arrived. Undone afterwards.

**Open:**

- [ ] **The other admin pages are still mock** (Overview, Reports with its badge, Rooms, Common rooms,
      Money, Moderation, Maps, Audit log), parts 2–4.
- [ ] **Google or Discord sign-in while suspended** shows only "This account can't sign in right
      now. The Connecta team emailed you why." (Better Auth passes back a code, not the message).
- [ ] **The Users list shows the newest 50** with search, no paging.
- [ ] **The gateway doesn't close a suspended person's live socket itself**: the tab closes it when
      it goes to sign-in. A tab that ignores the event keeps its socket until it reconnects (the
      handshake then fails, as the session is gone). Not tested.

### Admin site, part 2: Reports (`bbba969`)

**Changed:** the API's reports queue (`ReportsAdminService`: cases, decisions), `rooms.delisted_at` and
`closed_at` (Discover skips both; a closed room refuses tickets and chat with `code: 'closed'` and
sends everyone inside out), `reports.decided_at`, and `ChatService.erase` (a message gone for
everyone, used by owners, mods and now the team). The web Reports page is real, its nav badge counts
open cases, and walking into a closed room says so.

**Bugs found and fixed while building:**

- A done case's History listed the decision it had just made (the time came from the audit entry,
  written after the action); `reports.decided_at` now holds it.
- At phone width the queue ran off the right edge (a long line widened the grid column); the Users
  page had the same grid and got the same fix.

A headless run: three reports put in the local database (two against Jod in a Common room, one
against Pim); Mai, on the team, saw two cases with the reporters, notes and bubbles, warned Pim with a
reason, and the case moved to Done with the badge at 1. Checked at phone width. Removed afterwards.

**Open:**

- [ ] **No way to undo a delist or a close yet**: the Rooms page (part 3) adds it.
- [ ] **New reports appear within a minute** (the page looks again every 60 s); there's no live event.
- [ ] **The Done tab shows the latest 300 reports' decisions**, no paging.
- [ ] **People inside when a room is closed see "isn't there any more"** (the game server's room-gone
      close), not why; the closed message shows when they try to walk in again.

### Admin site, part 3: Rooms, Common rooms, Moderation (`1778254`)

**Changed:** `settings` and `blocked_words` tables (the migration carries the Thai list that was in
`@connecta/shared/moderate`, which now takes its list through `setWordFilter`); `SettingsService`
(database → memory → Redis key and channel per environment); the game server applies the settings
from Redis at start and on change; the report steps, the picture check and Common room seats read
them. The API's Rooms (list, delist, relist, close, reopen with the owner emailed), Common rooms
(copies, seats, notice) and Moderation (switches, word list) admin routes; report decisions on rooms
go through the Rooms action. The game state has `notice` and `noticeUntil` for Common rooms; the
web shows the banner. The web Rooms, Common rooms and Moderation pages are real.

**Bugs found and fixed while building:**

- The API wouldn't start without its database (loading settings at boot threw); it now starts and
  tries again every 30 s.
- A Common copy opened after a notice didn't show it: the game state's unset `noticeUntil` made the
  comparison false.
- A room action's dialog title replaced "it" inside the room's name ("Sit & Study").
- The test notice would have stayed in a running dev server's Common rooms for 10 minutes (Common
  room keys aren't per environment); the test now clears it.
- Not a code bug: stopping `pnpm dev` mid-write left an empty `packages/shared/dist/plus.js`, and
  turbo cached it, so `pnpm check` failed on every API suite until it ran once with `--force`.

A headless run with Mai on the team: added a word on Moderation (the list shows the Thai words),
posted a notice on Common rooms, opened the Close dialog on Rooms, and walked into the Cat Café
Common room, where the banner showed. Checked at phone width. Undone afterwards.

**Open:**

- [ ] **The Common rooms page shows copies within 15 s** (it looks again), not live.
- [ ] **Changing the seats doesn't move anyone**: people already in a copy stay, even above a lower
      number.
- [ ] **Room and Common room keys in Redis aren't per environment** (`common:*`, the game channels),
      unlike the settings: tests and a running dev server share them.
- [ ] **The Rooms list shows the newest 50** with search, no paging; "people inside" counts only
      those shown.
- [ ] **The mock lists the new pages replaced** (`ADMIN_ROOMS`, `WORDS`, the Common copies in
      `lib/mock.ts`) are still in the web app; part 4 can clear `adminData.ts`.

### Admin site, part 4: Overview, Money, Audit log (`d32db42`)

**Changed:** the API's Overview (numbers from presence and the database, a health strip that asks
each part with a 2 s limit, urgent cases, latest actions), Money (revenue, fees at spec 15's rates,
how members pay, payments) with refunds (`StripeGateway.refund`, `payments.refunded_at`, the
reason, an email, the audit log) and the Audit log list (100 at a time, names resolved);
`PresenceService.everyone`; `GAME_URL`, `LIVEKIT_URL` and `GATEWAY_URL` in the API's config. The
web Overview, Money and Audit log pages are real, and the demo's admin mock data is gone from
`apps/web`. **The admin site is done; so is step 5**, but for the map editor.

**Bugs found and fixed while building:**

- "1 Plus payments this week" and "1 payments" now read in the singular.

A headless run with Mai on the team and test payments and a report in the local database: the
Overview showed the urgent report and every health light green (the picture check and payments amber
without keys); Money showed the numbers, and refunding one payment marked it refunded with "by Mai",
emailed Ken and put the refund in the Audit log. Checked at phone width. Removed afterwards. The
Stripe refund itself is untested: there are no test keys yet.

**Open:**

- [ ] **The Stripe refund hasn't run against Stripe** (no test keys yet); only the local stand-in path
      is tested.
- [ ] **Money doesn't show the server bill or failed renewals**: neither is tracked (failed renewals
      need Stripe's `invoice.payment_failed` webhook).
- [ ] **Online now walks every open tab in Redis** (a SCAN): fine now, slow with many people; a counter
      kept by the gateway would replace it.
- [ ] **The health strip has no history or alerts**: that's the monitoring server's job (spec 15).
- [ ] **A refund doesn't touch Plus**, as decided; if a refunded renewal should also end Plus, the
      person cancels it themselves for now.
