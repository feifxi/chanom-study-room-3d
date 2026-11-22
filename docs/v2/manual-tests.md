# Manual tests

The owner tests every feature by hand **at the end**, once everything is on the API and the
[seed](../v2-plan.md#whats-left) fills the data. Each feature adds its checks here in the same
change that builds it (newest step last). Tick them off then; until then the API tests and the
builder's own browser runs are the safety net.

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
