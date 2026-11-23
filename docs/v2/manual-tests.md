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
