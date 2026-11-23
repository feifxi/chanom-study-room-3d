# Manual tests

The owner tests every feature by hand **at the end**, once everything is on the API and the
[seed](../v2-plan.md#whats-left) fills the data. Each feature adds its checks here in the same
change that builds it (newest step last). Tick them off then; until then the API tests and the
builder's own browser runs are the safety net. What changed in each part, the bugs found along the
way and what's still open are in the [review notes](review-notes.md).

**Setup:** `docker compose up -d`, `pnpm db:reset` (migrate and seed), `pnpm dev`. Use two browsers
(or one normal and one private window) as two people; email codes arrive in Mailpit
(http://localhost:8025). Check pages at phone width and desktop, light and dark, and as a guest.

## Step 2: accounts and rooms

### Sign-in and sign-up (feature 2)

- [ ] Sign in with an email code; with Google and Discord (needs their keys in `apps/api/.env`).
- [ ] A new account asks for a birthday; under 13 is refused and stays locked for that browser.
- [ ] Pick a character, a name and an @handle; a taken handle is refused; Home opens after.
- [ ] Guest from an invite link (`/invite/cafe-chanom`): pick a character, walk in; later sign up
      and keep the character.
- [ ] My profile: change the name; change the @handle (then a second change is refused for 30
      days, and the old handle is held).
- [ ] My character: change it; the change shows everywhere.
- [ ] Settings → Account: linked sign-ins and birthday show.
- [ ] Delete the account: it waits 7 days, signing in offers to keep it; rooms you own ask you to
      pick new owners.

### Rooms, members and invites (feature 3)

- [ ] Make a room (name + map); it shows on Home and opens at `/r/<id>`.
- [ ] Room settings (owner): name, description, map and look, visibility (Private / Ask to join /
      Open), Members can invite, Allow guests, Guests can use voice, slow mode. A mod can change
      only the invite and safety settings.
- [ ] Member invite link: someone opens it and joins. Guest pass: walks in for 24 hours without
      joining. Room settings → Invites lists links and can cancel one.
- [ ] Ask to join (an Ask-to-join room from Discover): the owner or a mod lets them in, or
      declines (then they can ask again after 7 days).
- [ ] Make and remove a mod; kick; time out (they can't post in chat until it ends); ban (they
      can't rejoin or use a guest pass); unban.
- [ ] Hand the room to someone else; leave a room; delete a room (type its name).
- [ ] Discover lists Open and Ask-to-join rooms with search and tags; private rooms never show.
- [ ] Home: pin a room, mark as read, search, filters (All / You run / Active), rows past the
      first 6 cards.

## Step 3: the gateway

### Friends (feature 5)

- [ ] Add a friend by exact @handle; wrong handle, yourself, already friends each say so.
- [ ] Your friend link `/f/<handle>`: opening it sends a request.
- [ ] Requests dialog: accept, ignore (they only see "Pending"), cancel one you sent.
- [ ] "Who can send me friend requests": Anyone / People from my rooms / Nobody is respected.
- [ ] Remove a friend (silent); block (they leave your friends, their room messages fold away);
      unblock from Privacy & safety.

### Room chat (feature 4)

- [ ] Messages arrive live in the other browser, on the room's page and in 3D (Chat panel, ⤢).
- [ ] Reply, edit (shows "edited"), delete with Undo; the owner or a mod deletes others'.
- [ ] Reactions: quick ones and the picker; tap a chip to add or remove yours.
- [ ] @mention picker; @room only for the owner and mods; mentions are tinted.
- [ ] "… is typing", the "New messages" line, "Jump to latest", loading earlier messages.
- [ ] Unread counts and "@ you" on Home's room cards; reading clears them.
- [ ] Slow mode and time outs stop posting as set.

### Pictures in chat

- [ ] Send 1–4 pictures (also pasted); "Getting it ready…" for you only, then everyone
      sees them; a big photo comes out small (WebP).
- [ ] Over 10 MB or not a picture is refused; a broken file gets "A picture couldn't be sent, so it
      was left out" and the rest of the message still goes.
- [ ] Someone outside the room can't open a picture's link.

### DMs (feature 4)

- [ ] Friends → 💬 opens the chat; it joins the Messages list only once a message is sent.
- [ ] Messages page, the header's Messages popover and the Messages tab in 3D show the same chat,
      live, with typing, reactions, replies, edits and pictures.
- [ ] Unread badge on the header's Messages; reading clears it.
- [ ] Unfriended: history stays, read-only, with Add friend. Blocked: "You blocked …" with Unblock.

### Presence (feature 5)

- [ ] Friend online in another browser: green dot and "Online" on Friends, Messages, the DM header.
- [ ] No input in any tab for 10 minutes: "Away" (yellow).
- [ ] Close their tabs: "Offline · Last seen just now" (then minutes, hours).
- [ ] They open a room in 3D:
  - [ ] Their room you're a member of: Friends shows the room's card with **Walk in**; Home shows
        "Friends out right now" and the card's live `1/25 inside` with their face; the room's page
        lists them under "Inside now".
  - [ ] An Open room you're not in: named, with **Join**.
  - [ ] A private room you're not in: "🔒 A private room", one card per friend, **Ask to join**.
- [ ] Ask to join: they get a DM card "… wants to join you" with Send invite / Not now. Send invite
      posts an invite card back; **Join** on it works. With "Members can invite" off, a member's
      Send invite gives a 24-hour guest pass instead (if the room takes guests).
- [ ] Friends → "…" → Invite to a room: the invite card lands in your DM.
- [ ] Inside 3D, a card's Join asks "Leave …?" first.
- [ ] Settings → Privacy & safety: "Appear offline" makes you offline to friends at once (and out of "inside
      now"); turning it off brings you back.

### The 🔔 inbox

- [ ] A friend request lands in the bell live, with the badge; opening it goes to Friends and
      marks it read. Their accepting yours lands too.
- [ ] Someone asks to join a room you run: "… wants to join …", then "2 people want to join …" as
      one item. When you let them in, they get "You're in!".
- [ ] @mention and @room in room chat land in the bell; a room set to Nothing (room "…" →
      Notifications) gives none; Every message gives one item that counts up while unread.
- [ ] All / Unread tabs and "Mark all read".
- [ ] Inside 3D, new bell items and DMs pop up as toasts.
- [ ] Mute a DM (its "…"): 🔕 in the list, its unread greyed and out of the header badge, no
      toasts in 3D. Unmute brings them back.

## Step 4: walking in a room

### Walking in for real (part 1)

Start everything with `pnpm dev` (the game server is on :4002, reached at `/game`). Two people in
two browsers, members of the same room.

- [ ] Both walk in: each sees the other's character and name; walking (keys, click to walk, the
      phone joystick) shows smoothly on the other screen; sitting and standing too, and a seat
      someone's on can't be taken.
- [ ] The Room card's "N here", Home's `inside/capacity` and the room page's "Inside now" count both
      of you; friends see you "Out in rooms".
- [ ] Leave (the Room card, or Back → Leave room): you're out of "inside now" at once. Closing the
      tab: out after about 20 seconds (your place is held in case the network drops).
- [ ] Open the same room in a second tab: the first says "You're in … in another tab"; **Walk in
      here** takes it back.
- [ ] Walk into a different room in a second tab: the first says "You walked into another room";
      **Walk back in** takes you back there, and now the second tab says it. Home, chats and DMs in
      other tabs are never affected.
- [ ] The owner kicks you while you're inside: "You were taken out of …". Ban: "You can't come
      into …", and walking in again stays refused.
- [ ] The owner makes you a mod while you're inside: the people list shows "Mod" by your name at
      once (your own 🛡️ Room tools appear the next time you walk in). Leaving the room from Home
      sends your open 3D tab out ("… isn't there any more"); deleting the room sends everyone out.
- [ ] The owner switches the map in Room settings: everyone moves to the new map's door, nobody
      reloads.
- [ ] Room settings → people at once lower than who's inside: the next member gets "… is full"
      (with Read the chat and Notify me); the owner and mods still walk in. **Notify me** (here, on
      Home's "Full · notify me" or the room page) puts "There's space in … now" in the 🔔 once
      someone leaves.
- [ ] Back inside a room asks "Leave …?"; Stay keeps you in, Leave room goes Home.
- [ ] A guest from a guest link (`/g/<code>`) walks in with their character and shows as a guest;
      after the pass ends (24 h) they can't walk in again.
- [ ] Inside 3D, 🔔 items and DMs still arrive as toasts.

### Bubbles, Away and the people list (part 2)

Three people in a room: the owner and two members.

- [ ] A bubble shows over your head and in everyone's Bubbles tab; the "…" typing dots show while
      you type.
- [ ] Inside a private zone (the Fireside rug), your bubbles reach only people on the same rug; a
      bubble from outside still reaches you there. The owner talking to everyone reaches the rug
      too.
- [ ] No input for 10 minutes (or Demo tab → "Go away now"): others see 💤 over your head and
      "💤 Away" in the people list; moving brings you back. With a focus timer running you never
      go away.
- [ ] The owner: 🛡️ Room → Talk to everyone: everyone sees "📢 Talking to everyone" by their name;
      it turns off when they go away.
- [ ] Settings → My character inside a room: everyone sees the new look (at most once every 5 s).
- [ ] The people list's "…" on someone who isn't your friend: Find, Add friend (a real request),
      Block, Report (still a mock); no Send a message. On a friend: Send a message opens your chat.
- [ ] As the owner or a mod, on someone in the list: Time out (their bubbles stop and they're told
      until when), Make mod (their 🛡️ Room button appears at once), Kick, Ban (with a reason): they
      leave the room at once. Kick on a guest ends their pass.
- [ ] A guest's "…" on others shows only Find and Report.
- [ ] Everyone leaves; walking back in a few seconds later starts fresh (nobody seated, no typing
      dots).

### Proximity voice (part 3)

Real microphones and headphones, three people in a room (the owner and two members); LiveKit runs
in `docker compose`.

- [ ] Turn your mic on (the browser asks once): people near you hear you, louder the closer they
      stand, and from the side you're on; past about 9 m they don't. Their face in the people list
      gets a ring while they talk; the 🎙️ mark by their name shows their mic is on, and "· deafened"
      and a crossed-out headphone badge show when they're deafened.
- [ ] Block the mic in the browser, then press Mic: it turns back off with a note about the
      permission.
- [ ] Step onto the Fireside rug: you hear only people on the rug (at full volume), and people off
      it don't hear you. The owner talking to everyone is heard on the rug too.
- [ ] Sound (deafen): you hear nobody, your mic goes off, others see "· deafened" by your name;
      undeafen brings the mic back as it was.
- [ ] Go away (Demo tab → "Go away now"): your mic turns off and stays off when you come back.
- [ ] "…" → Mute for me on someone: you stop hearing them, only you; it's still on after a reload.
- [ ] As the owner or a mod, "…" → Mute for everyone: their mic goes off and its button greys out
      ("A mod turned your mic off…"); walking out and back in keeps it; unticking lets them talk.
      A mod can't mute the owner or another mod.
- [ ] Time out someone talking: their mic goes off until it ends.
- [ ] A guest listens but can't turn the mic on ("Guests can't use voice in this room"); the owner
      turns on Room settings → Invites → Guests can use voice and the guest's mic works at once.

### Screen share (part 4)

Desktop Chrome or Edge to share (phones only watch); three people in a room.

- [ ] Two people sit at the same desk table; one presses **Share screen to table** and picks a tab
      with "Share tab audio": the other gets the big share panel ("…'s screen · your table · 🔊
      with sound"), hears its sound, and can change their own volume or shrink it to the corner.
      🖥️ shows by the sharer's name for everyone.
- [ ] The third person, not at that table, never sees or hears it. Someone else at the table can't
      share at the same time (the button waits).
- [ ] The sharer stands up (or presses Stop sharing, or the browser's own Stop bar): the share ends
      for everyone and the sharer sees "Your screen share ended".
- [ ] On the TV rug: Put something on → Share your screen: people on the rug watch it in the Watch
      together panel; people off the rug don't get it. Walking off the rug ends it.
- [ ] A share without sound says "🔇 no sound", and the sharer gets the tip to share a tab with its
      audio.
- [ ] On a phone at the table: the share panel fits, big and small; there's no share button.

### Cats, study buddies and the Buddy Machine (part 5)

Two people in a room on the Cosy Library.

- [ ] Both see the same two cats: Mochi napping and Tofu near the door, then wandering, grooming
      and napping in the same places on both screens.
- [ ] Walk up to a cat: "Press E to pet Tofu 🐾" (tap it on a phone). Hearts float up on both
      screens, it says something ("purr~ ❤️", or "_yawn_" if it was napping), and it follows you
      around for about 20 s; it stops when you sit down.
- [ ] Walk straight through a cat or a study buddy: nothing stops you.
- [ ] At the pink machine by the door: "Press E: Buddy Machine" opens the panel beside it (right on
      a computer, top on a phone; check light and dark). Walking away closes it.
- [ ] **Summon** a cat: the knob turns and a capsule rolls out on both screens; about 2 s later the
      cat steps out, the panel says "… is here ✨", and both Bubbles logs say "✨ Mai summoned a …
      cat, …!". The button counts down 2 s before the next pull.
- [ ] Summon a study buddy: it appears at a free desk, focusing (📖 and a subject on its label).
      Sit in its seat: it says something like "Oh, take my seat! 😊" and finds another desk.
- [ ] With 4 cats in the room the cat button says **Full**; the counts match on both screens.
- [ ] The other person presses **Goodbye 👋** on one: it waves, walks back to the machine and is
      gone for both; both logs say "👋 Jod said goodbye to …".
- [ ] A guest can summon and say goodbye too.
- [ ] Start a focus timer at a desk next to a study buddy and let the round end (or end it): the
      study buddy cheers you by name. With 3 or fewer people in the room, a study buddy says hi
      a few seconds after someone walks in.
- [ ] Everyone leaves, then walks back in: the summoned ones are gone, Mochi and Tofu are back. The
      owner switches the map live: the new map starts with its own two resident cats.

## Step 5: the rest

### Focus, part 1: the timer

Two people (Mai and Jod, friends) in a room; a third browser as a guest with a pass.

- [ ] My tools → 📖 Study session → **▶ 25 / 5 min**: the ring and the countdown run, the tool
      button shows the time left, and the other person sees "📖 Mai · 0m · Calculus" over your head
      (type a subject first, or while it runs) and "📖 Focusing · Calculus · …m" in the people list.
- [ ] Let a round run out (or check with a short wait and **Stop**): a chime at the end of focus,
      ☕ Break time with its own countdown, another chime at the end of the break, then "Not
      started". Stop doesn't chime.
- [ ] **Today** tab: you're listed with your minutes (1+ minute rounds only), the running round's
      minutes count up live, the other person's minutes show too, most first. Leave and walk back
      in: your minutes are still there. Next day (after your midnight) the list starts empty.
- [ ] Stop after less than a minute: nothing is added to Today.
- [ ] Leave mid-round: the round ends and what you did counts (Today shows it when you're back).
- [ ] **Reload** the page mid-round: you walk back in still focusing, same countdown and subject.
- [ ] Mid-round, walk into a second room in another tab: the first tab says "You walked into
      another room" and the round's minutes count (Today in the first room shows them).
- [ ] Leave the keyboard alone for 10+ minutes while focusing: no 💤, your mic isn't turned off.
      After stopping, 10 quiet minutes make you Away as before.
- [ ] Jod's Friends page: Mai shows "Focusing · Calculus" while her round runs and never "Away".
      Mai turns off Settings → Privacy & safety → "Show what I'm doing": Jod sees just Online and
      the room.
- [ ] The guest gets the timer and shows in Today while they're in the room; their minutes aren't
      kept (Today after the room empties and fills again doesn't list them). The To-do tab still
      says "Sign up to keep…".
- [ ] Phone width, light and dark: the Study session panel and its Today list fit.

### Focus, part 2: the to-do list

- [ ] Study session → To-do: add a few tasks (Enter or ➕); they appear at once, in order, and the
      tab shows how many are left. Tick one: it's crossed out and the count drops.
- [ ] Reload, or walk into a different room: the same list, ticks and all. Sign in as the same
      person in another browser: the same list there too.
- [ ] Delete one (the ✕ on hover, or always there on a phone); **Clear done** removes the ticked
      ones and only shows while something is ticked.
- [ ] Another person never sees your list.
- [ ] At 50 items the box says "Full (50). Clear some done ones" and won't take more.
- [ ] As a guest: "Sign up to keep a to-do list…" with the sign-up button (it asks "Leave …?").
- [ ] With the API stopped, ticking or adding shows a toast and puts the list back as it was.
- [ ] Phone width, light and dark: long tasks wrap, the panel fits.

### Focus, part 3: the Focus page

- [ ] Run a couple of rounds with different subjects (one typed "Calculus", one " calculus "), then
      open Focus: Today, Last 7 days and the chart's today bar match; "By subject" has one
      Calculus line with both rounds, under the spelling you used most.
- [ ] Nothing yet this week: the subjects card says so, and the hero's numbers are 0.
- [ ] The hero's button says "Back to <the room you were last in>" and walks you in; in a fresh
      browser (or after leaving that room for good) it says "Find a room to study in" → Discover.
- [ ] Rankings → Friends: you and only the friends who focused, most first; "1 friend hasn't
      focused this week yet" counts the rest. Today and This week switch (weeks start Monday).
- [ ] The hero says "#2 among friends. 25m behind …" when someone's ahead.
- [ ] Rankings → Everyone: the top 10; if you're below it, "⋯" and your row. Someone you blocked
      (or who blocked you) never appears, even with more minutes.
- [ ] "Show me on Everyone" off: you vanish from the list at once (for other people too, reload
      theirs) and your row has no rank; on again brings you back. The same switch in Settings →
      Privacy & safety follows it, both ways.
- [ ] A new account aged under 18 starts with it off; 18+ starts with it on.
- [ ] Phone and desktop, light and dark: the hero button doesn't overflow with a long room name.

### Watch together on the game server

- [ ] Two people in a real room, both on the TV rug. One clicks **Put something on** and pastes a
      YouTube link: it plays for both, within a couple of seconds of each other, "put on by …
      · 2 watching", with YouTube's title.
- [ ] Pause, seek and skip from either one: the other follows. Add a few to Up next from both;
      remove one; a video that ends plays the next for everyone (once, not two skips).
- [ ] A guest on the rug can do all of that too.
- [ ] Paste a private or deleted video, or a non-YouTube link: a toast says why, nothing plays.
      With 20 in Up next, a 21st says it's full.
- [ ] Walk off the rug: the panel closes; walk back on: it opens at the right moment of the video.
      Everyone off for 30 s: the screen turns off and Up next is empty.
- [ ] Someone shares their screen on the TV while a video plays: it pauses for everyone and carries
      on from the same moment when the sharer walks off (or presses Stop sharing). A video added
      during the share waits in Up next.
- [ ] As owner or mod: **Turn off the TV** in the panel and in Activities (from across the room)
      clears it for everyone. A member or guest doesn't see the button.
- [ ] From across the room the 3D screen shows the video's thumbnail; the Activities list says
      what's on and how many are watching.
- [ ] Phone width: the panel works, and walking onto the rug opens it (this broke on phones in
      development until this change, see the review notes).

### Photo mode

- [ ] Two people in a real room. One opens ⋯ More → Photo mode: the other sees 📸 by their name
      (not in the photo itself: names never show in photos); closing it takes the 📸 away.
- [ ] Snap (now, and with the 3 s timer), pick each frame, then **Share**: "📸 Shared to Room
      chat", and the photo shows in Room chat for everyone (chat page and the room's chat panel).
- [ ] **Save** downloads the PNG; **Copy** puts it on the clipboard (or says the browser won't).
- [ ] As a guest: Save and Copy only, no Share.
- [ ] With the API stopped, Share says it couldn't and keeps the photo on screen to try again.

### Party and table games, part 1: the round flow and chess

- [ ] Two people in a real Library room. Mai sits at the chess table: the lobby card opens with her
      as host (👑). 📣 **Call everyone**: Jod gets "Mai is starting Chess · Go there" (it goes after
      ~20 s or when closed); Go there runs him over.
- [ ] Jod sits: "You're in. Mai starts the game." Only Mai has Start; it counts down 3 s.
- [ ] The board opens big for both, your colour at the bottom; only the player to move can move,
      illegal moves don't go; the other sees each move at once (last move tinted, check glows).
- [ ] Offer a draw (Accept / Decline), Resign ("Resign this game?"), checkmate: each ends it with
      the right results card on both screens. **Play again** swaps colours.
- [ ] Mid-game: **Leave** (or stand up) → the other wins "the other player left", and you get "You
      left the game". Walk away for 30 s → "You were away…, so you're out". Leave the room → the
      other wins at once.
- [ ] Mid-game: reload the page → you're back at the door; walk back and sit within 30 s and play
      on (same colour). Wait longer and you lose.
- [ ] The host's **End** stops it with no result, back to the lobby.
- [ ] A third person standing on the chess table's rug sees the small read-only board; it never
      lets them move.
- [ ] Settings → Notifications → **Hide game invites while I'm focusing** on: with a focus round
      running, no invite card; it stays on after a reload and on another device. Off: cards show.
- [ ] In the Café or Rooftop, the Activities list has no chess.
- [ ] Phone width: the lobby card, the board and the results card fit.

### Party and table games, part 2: Slave

- [ ] Three people in a real Library room sit at the card table (Activities → Card games → Go
      there, **E**). The host's **Start** deals: 18/17/17 (with 4: 13 each); each sees only their
      own hand, the others as chips with their card counts.
- [ ] Whoever holds the **3♣** leads; only the player whose turn it is can pick cards, **Play**
      lights up only for a legal play, and the pile shows on everyone's felt ("Mai played a pair").
- [ ] **Pass** sits you out of that trick; when everyone else has passed, the last player leads
      anything. You can't pass when leading.
- [ ] Let the turn bar run out: you pass, or when leading, your lowest card is played.
- [ ] Play to the end: the results card shows 👑 King, (💎 Queen with 4+), 🧹 Slave; the King's and
      Slave's name labels show 👑 and 🧹 while the group stays at the table.
- [ ] **Play again** with the same group: the swap. The Slave's 2 best go to the King, who picks 2
      to give back (Give back 2/2); with a Queen, the same with 1. Let 20 s run out: the lowest cards
      go back. Then the Slave leads. Someone new at the table: a fresh deal, no swap.
- [ ] Mid-game **Leave** (or walk away 30 s): "Jod left" on the chips, the others play on; with
      one left holding cards, it ends.
- [ ] Mid-game reload: back at the door with your same cards; sit back within 30 s and play on.
- [ ] Someone standing on the card table's rug sees the small view (turn, pile, counts) and never
      anyone's cards.
- [ ] Phone width: the hand overlaps but every card can be tapped; the buttons fit.

### Party and table games, part 3: the whiteboard

- [ ] Two people in a real room walk up to the whiteboard: the small board opens for both. One
      draws; the other sees each stroke appear as it's drawn, on the panel and on the wall. People
      elsewhere in the room see the wall fill up.
- [ ] Both draw at once: neither's strokes get mixed up or lost. Colours, sizes and the eraser all
      show the same for everyone.
- [ ] **Undo** (button or Ctrl/Cmd+Z) takes back only your own last stroke, for everyone; after a
      reload you can still undo what you drew before.
- [ ] **Clear** asks first, then empties the board for everyone.
- [ ] Someone who walks up later (or reloads) sees the board as it is.
- [ ] Walk away from the board: you can't draw (the small board closes).
- [ ] A guest can draw; **Share to Room chat** shows only for members and posts the board as a
      picture; **Save as image** downloads a PNG for anyone.
- [ ] A timed-out person can't draw (their stroke disappears).
- [ ] Everyone leaves the room and comes back: the board is empty. Change the room's map: empty too.
- [ ] Phone width: drawing with a finger works and the page doesn't scroll.

### Party and table games, part 4: Pick a Side and room decks

- [ ] A real room: Activities → Pick a Side → **Go there**, **E**: the lobby opens with you as host
      while you walk over. Others who walk onto the floor are in.
- [ ] The host switches **Would you rather / Quiz**; the deck follows the mode. Non-hosts see the
      deck's name and can't change either.
- [ ] Deck → **This room** → **New deck**: write 3 questions, Save; it's picked and shows "by you".
      Another member sees it (with your name), can host with it, but can only edit their own. The
      owner or a mod can delete anyone's (Delete? to confirm). A guest sees and plays the decks but
      has no New deck.
- [ ] Quiz needs 4 answers with one ticked; Would you rather 2; fewer than 3 finished questions
      can't be saved.
- [ ] **Start**: everyone sees the same question and timer; walking into a zone moves your live
      count. When time's up the answers lock; the reveal shows the split, and in a quiz the right
      one (✓). Nobody can see a quiz's answer before the reveal.
- [ ] Would you rather's reveal says who picked with you; the results list who stood with you most.
      A quiz ends with the best score first (ties share it). Alone: no winner, just your picks or
      score.
- [ ] Play again draws questions the room hasn't had from that deck yet.
- [ ] Someone walking onto the floor mid-game plays from the next game; walking off for 30 s, or
      Leave, takes you out.
- [ ] Room settings → **Room-wide games** off: a game on the floor ends, and E there does nothing.
- [ ] The ✨ AI tab isn't there (it comes after Plus).
- [ ] Phone width: the lobby, the deck picker, the editor and the question card fit.

### Party and table games, part 5: Draw & Guess

- [ ] A real room with 3 people: Activities → Draw & Guess → **Go there**, sit at the art table (in
      the Café and Rooftop, stand at the easels and press **E**). The host picks Draw & Guess or
      Copycat and **Start**s.
- [ ] Write a prompt (🎲 gives one); after Done you see "Sent. Waiting for the others…" and the
      count of who's done. When everyone's done the next step starts at once.
- [ ] Each person draws the prompt written by the one before them, then describes the drawing
      they got. Nobody sees another chain before the album.
- [ ] Draw something and don't press Done: when the time runs out your half drawing is still sent
      (it shows in the album).
- [ ] Copycat: the drawing shows for 8 s, hides, and you redraw it from memory.
- [ ] Miss two turns in a row: "You missed two turns, so you're out"; the chains carry on and you
      still see the album.
- [ ] Reload mid-game: you're back on your turn with what you were working from.
- [ ] The album plays the same entry for everyone. The host's **Pause** stops it for all, **Next
      chain** skips, and **Finish** on the last chain ends it (also while paused). Reactions show
      for everyone, one of each per person.
- [ ] Save a chain (one tall picture). A member's 💬 posts it to Room chat; a guest has no 💬.
- [ ] "That's a wrap!" then **Again** starts a new game with whoever's there; no old album flashes.
- [ ] Phone width: writing, the drawing pad and the album fit.

### Coins and quests, part 1: quests and coins

- [ ] A new account has 0 coins; Shop and My tools → 🎯 show the same three quests (one 📖 focus,
      one together, one play) with 0 progress.
- [ ] Do each kind (whichever you have today): focus a full round (and Stop one early: its minutes
      count, the session doesn't); stay a few minutes in a room with someone else; say things in
      bubbles or Room chat (DMs don't count); pet a cat; use the Buddy Machine; finish any game.
      The progress moves without reloading.
- [ ] When one's done: a toast "🎯 … · +N 🪙", it turns green with ✓, and the coins go up in the
      Shop, the header menu and My tools. Doing more pays nothing more.
- [ ] After your midnight (your computer's time zone) there are three new quests; the coins stay.
- [ ] A guest without an account earns nothing; a member visiting another room on a guest pass
      does.
- [ ] The Shop's Buy says the Shop opens soon (part 2).

### Coins and quests, part 2: the Shop's first set

- [ ] The Shop lists the 10 items (6 accessories, 4 outfits) with prices; the tabs filter them;
      "New this week" shows the Yukata on your own character.
- [ ] Try anything on: your character in the Shop wears it (outfits in your outfit colour). Take
      off puts it back.
- [ ] Without enough coins Buy says how many to go. With enough, Buy takes the coins (the header
      and quests card follow), the card says Owned ✓, and Wear it changes your look.
- [ ] Someone in a room with you sees your new look at once, with no rejoin.
- [ ] Settings → My character shows an Outfit row and your bought accessories next to the free
      ones; switching and saving works; the free items are still there.
- [ ] Check each item in a room from a few angles (walking and sitting): nothing pokes through the
      hair or floats oddly; the overalls' trouser legs and the raincoat's boots move with the legs.
- [ ] A guest's character maker (invite page) shows only the free items.
- [ ] Phone width: the Shop opens on your character and the items; the quests come after.

### Coins and quests, part 3: pets

- [ ] The Shop's Pets tab lists Midnight, Tux, Siamese and Snowball; picking one shows that cat up
      close, turning; "New this week" shows Snowball.
- [ ] Buying asks for a name (the pet's own to start with); the toast uses your name for it.
- [ ] In a room, the Buddy Machine shows **Your pets** with Bring out; a capsule rolls out and the
      cat appears with "Name · Your-name's cat" on its tag; everyone's Bubbles log says it came to
      visit.
- [ ] Your pet wanders, naps and follows whoever pets it, like the other cats; petting it counts
      toward "pet a cat".
- [ ] Someone else sees no Goodbye on your pet's row; you can send it home.
- [ ] With one pet out, your other pets say "One at a time". Five people can't have more than 4
      pets out in one room.
- [ ] Leave the room: about 20 s later your pet walks back to the machine ("went home with you").
- [ ] Buy a pet while you're in a room: it's in the machine without rejoining.
- [ ] Look at each coat in a room from a few angles: the bow, star tag, bow tie and bell sit right.

### Plus, part 1: Plus on the account

Turn Plus on and off with the Demo tab → Your Plus (or by finishing the stand-in checkout).

- [ ] Free: the Plus page says Get Plus; your room says 25 people at once and 150 members; Room
      settings won't pick a Big map.
- [ ] Plus on: the Plus page says you're on Plus; your rooms say up to 50 (100 on a Big map) and
      1,000 members; a Big map can be picked.
- [ ] In a room, your name shimmers with ✨ for everyone, and stops when Plus ends (no rejoin).
- [ ] A member who has Plus doesn't change your room's limits; only the owner's plan counts.
- [ ] Free: an 11th room you'd own is refused; with Plus you can make up to 30.
- [ ] Free: a 20 MB picture is refused (10 MB); with Plus it goes (up to 50 MB).
- [ ] Share your screen in a Plus owner's room: it's sharper (1080p) than in a Free room (720p).
- [ ] The Plus page marks premium maps, Plus skins and pets, and AI decks Coming soon.
