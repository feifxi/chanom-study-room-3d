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

### Focus, part 3: the Focus page and rankings

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
