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
- [ ] **The cats are each browser's own until part 5 and block walking:** in a test, a cat sitting
      at the TV rug's entrance stopped someone from walking onto it.
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

### Part 4: screen share

**Changed:** desk shares to your table and the TV share are real (LiveKit, to that audience only);
desk shares use the TV's share panel, one per table. YouTube stays each browser's own until step 5.

**Bugs found and fixed while building:** none in the app (the browser test's own timing needed
fixing).
