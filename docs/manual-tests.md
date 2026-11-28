# Manual tests

The owner's hand-test checklist, grouped by feature. Every feature adds its checks here in the
same change that builds it.

**Setup:** `docker compose up -d`, `pnpm db:reset`, `pnpm dev`. Use two browsers (or a normal and a
private window) as two people. Email codes arrive in Mailpit (http://localhost:8025). Check pages
at phone and desktop width, light and dark, and as a guest.

## The seed

`pnpm db:seed` fills the app; rerun it any time to start over. Everyone signs in as
`<handle>@connecta.test`.

| Who   | Handle    | What's special                                                                     |
| ----- | --------- | ---------------------------------------------------------------------------------- |
| Fei   | `fei`     | Connecta team; Plus by card; owns Chanom Friends; a friend request and inbox items |
| Ter   | `ter`     | Owns CPE Year 3 (Pim's request waits); mod in Chanom Friends                       |
| View  | `view`    | Owns Lo-fi Study Hall; banned from Chanom Friends; an urgent open report           |
| Ploy  | `ployy`   | Owns Game Night Club (two room decks); a pet                                       |
| Nam   | `namwhan` | Member of three rooms                                                              |
| Bow   | `bowbow`  | 16 (under-18 rules)                                                                |
| Pim   | `pimmy`   | Warned a week ago; a message reported for selling                                  |
| Mook  | `mookie`  | Mod in Game Night Club; a pet                                                      |
| Earth | `earth.k` | Plus as Fei's gift; mod in Lo-fi Study Hall                                        |

Rooms: **Chanom Friends** (private, Library, Plus: 30 at once), **CPE Year 3** (ask to join), **Game Night
Club** (open, Café), **Lo-fi Study Hall** (open, Rooftop, slow mode).

- [ ] As Fei after `pnpm db:reset`: four rooms on Home (Chanom Friends "4 new"), 4 unread in 🔔,
      Ter's DMs, two weeks of Focus, coins and worn items in the Shop, reports and payments on the
      admin site.
- [ ] `pnpm db:seed` again: same data, no doubles; your own accounts stay.
- [ ] **Test tools** (dashed tab, right edge): theme, a pretend crowd of 14 or 35 in a room
      (yours only), the perf overlay, "Go away now", "Your Plus". A production build has no tab.

## Sign-in and accounts

- [ ] Sign in with an email code; with Google and Discord (needs their keys).
- [ ] **Make your room** and the header's **Sign up** open "Join Connecta ✨"; **Sign in** opens
      "Welcome back 👋". Either signs an existing account in, and a new one goes through "making
      your account 1/2" (birthday) and "2/2" (character).
- [ ] Under 13 is refused and stays locked for that browser for a day.
- [ ] Signed out, the landing page and a Common room log no error for `/api/me` in the console.
- [ ] A taken @handle is refused with suggestions; Home opens after.
- [ ] Guest pass (`/g/<code>`, from Chanom Friends → Invite → Guest pass): pick a look, walk in;
      sign up later and keep the look. The invite page's button reads "Join Connecta to come in"
      and opens "Join Connecta ✨"; a friend link reads "Join Connecta to add them".
- [ ] Guest door (pass or Common room): Walk in stays off until "How old are you?" is answered;
      "Under 13" shows "Come back when you're 13" and that browser can't walk in as a guest for a
      day (a private window can).
- [ ] Change the name; change the @handle (a second change is refused for 30 days).
- [ ] Settings → Account shows linked sign-ins and birthday.
- [ ] Delete the account: asks for new room owners, waits 7 days, signing in offers to keep it.

## Rooms and members

- [ ] Make a room (name + map); it opens at `/r/<id>`.
- [ ] Room settings as owner: everything; as mod: only invites and safety.
- [ ] Member invite joins; guest pass lets in for 24 h; Invites lists and cancels links.
- [ ] Ask to join: let in, or decline (then 7 days before asking again).
- [ ] Make and remove a mod; kick; time out (can't post); ban (can't rejoin or use a pass); unban.
- [ ] A 6th mod is refused: "A room can have up to 5 mods".
- [ ] Hand the room over; leave; delete (type its name). With 5 mods already, handing over to a
      member leaves you a member; to one of the mods, you stay a mod.
- [ ] Thumbnail (owner, Settings → Overview): upload a photo → it shows cropped on Home, Discover,
      the room's page and an invite link (also signed out). Use the map's picture puts it back. A
      mod doesn't see the picker; a non-picture is turned down.
- [ ] Home: pin, mark as read, search, filters, rows after the first 6 cards.

## Discover

- [ ] Lists Common rooms, then Open and Ask-to-join rooms with search, tags and language; private
      rooms never show.
- [ ] Signed out, the landing page's **Try a room as a guest** opens Discover (header: Discover
      and Sign up only, no errors). Listed rooms say "Sign up to join" and open "Join Connecta".
- [ ] Cards show friends inside ("Fei is here").
- [ ] Listed room cards show how many are inside now (not 0); a room with your friends inside comes
      first, then the busiest.

## Friends and presence

- [ ] Add by exact @handle; wrong handle, yourself, already friends each say so. `/f/<handle>`
      sends a request on a tap.
- [ ] Accept, ignore (they see only "Pending"), cancel. "Who can send me friend requests" is respected.
- [ ] Remove (silent); block (their room messages fold away); unblock.
- [ ] A friend online shows green on Friends, Messages and the DM header; 10 quiet minutes →
      Away; closing their tabs → "Last seen just now".
- [ ] A friend walks into: your room → Walk in card, "Friends out right now", live `1/15` with
      their face; an Open room → named with Join; a private room you're not in → "🔒 A private
      room" with Ask to join.
- [ ] Ask to join → their DM card → Send invite → your invite card → Join works. With "Members
      can invite" off, a member's Send invite gives a guest pass.
- [ ] Invite to a room from Friends puts the card in your DM. In 3D, Join asks "Leave …?" first.
- [ ] Appear offline hides you at once (and from "inside now").

## Chat, pictures and DMs

- [ ] Room chat arrives live on the room page and in 3D. Reply, edit ("edited"), delete with
      Undo; owner or mod deletes others'.
- [ ] Reactions; @mention picker; @room only for owner and mods; mentions tinted.
- [ ] Typing dots, "New messages", Jump to latest, loading older messages; unread and "@ you" on
      Home clear when read. Slow mode and time outs stop posting.
- [ ] 1–4 pictures (pasted too): "Getting it ready…" for you, then everyone sees them, shrunk.
      Over 10 MB refused; a broken file is left out with a toast. Outsiders can't open the link.
- [ ] DMs from Friends → 💬; the chat joins Messages only after a message. Same chat on the page,
      the popover and in 3D. Unread badge clears.
- [ ] Unfriended: read-only with Add friend. Blocked: "You blocked …" with Unblock.

## 🔔 Inbox

- [ ] Friend requests and accepts land live. Join requests group ("2 people want to join …");
      being let in says "You're in!".
- [ ] @mentions and @room by each room's setting (Nothing gives none; Every message is one
      counting item). All / Unread, Mark all read.
- [ ] Inside 3D, inbox items and DMs show as toasts. A muted DM: 🔕, greyed, no toasts.

## The 3D room

- [ ] Two people walk in: each sees the other move smoothly (keys, click, joystick), sit and
      stand; a taken seat can't be taken. Counts on the Room card, Home and the room page match.
- [ ] Walking in, your character sparkles for a moment; the second person sparkles on the first's
      screen when they arrive, but the first doesn't sparkle again on the second's screen.
- [ ] Leave (Room card, or Back → Leave room) takes you out at once; closing the tab after ~20 s.
- [ ] The same room in a second tab: "in another tab" with **Walk in here**. Another room in a
      second tab: "You walked into another room" with **Walk back in**. Other app tabs are fine.
- [ ] Kicked or banned while inside: told why; walking in again is refused after a ban.
- [ ] Made mod while inside: "Mod" shows at once. Room deleted: everyone out.
- [ ] Map switched in Room settings: everyone moves to the new door, no reload; the room card names
      the new map. Time of day changed in Room settings shows for people walking in.
- [ ] Room settings opened from Home (without walking in) starts from the room's saved map and
      time of day. Map & look has no size picker.
- [ ] Held seats (Room settings → People at once 3, the fewest it allows): one member walks in;
      a second member gets the "full" card with Try again, and Home, the room's page and "…" →
      About show a plain **Full** (no Notify me). A mod still sees Walk in and gets in; a second mod
      doesn't; the owner always does. Walk in comes back once someone leaves. A full Open room's
      Join says "Join (full right now)".
- [ ] Bubbles over heads and in everyone's Bubbles tab, typing dots. On the Fireside rug bubbles
      reach only the rug.
- [ ] 10 quiet minutes (or "Go away now") → 💤; never while focusing. Away during a break shows
      💤 and ☕ on your label, "💤 Away · ☕ on a break" in the list.
- [ ] Talk to everyone (owner): "📢" by their name; off when they go away.
- [ ] A new look in Settings shows to everyone at once (max once per 5 s).
- [ ] People list "…": Add friend, Block, Report; Send a message only for friends. As owner or
      mod: Time out, Make mod, Kick, Ban; kick on a guest ends the pass. Guests see Find and Report.
- [ ] Everyone leaves and comes back: fresh (no seats, no dots).
- [ ] Set the computer's clock a few minutes off, then walk in: the focus countdown, Watch
      together's timeline, Slave's turn bar and an invite card's timer are still right.

## Voice and screen share

- [ ] Mic on: near people hear you, louder closer, from your side; not past ~9 m. Talking ring,
      🎙️, "deafened" badge.
- [ ] Blocked mic permission: Mic turns back off with a note.
- [ ] Fireside rug: only people on it hear each other; Talk to everyone reaches in.
- [ ] Deafen: hear nobody, mic off; undeafen restores it. Going away turns the mic off.
- [ ] Mute for me (survives a reload). Mute for everyone (mods; survives rejoining; a mod can't
      mute the owner or a mod). Time out turns the mic off.
- [ ] A guest can't talk until Room settings → Guests can use voice; then at once.
- [ ] Desk share (desktop Chrome/Edge, "Share tab audio"): the table watches with sound and its own
      volume; others don't get it; one per table; standing up ends it.
- [ ] TV share: people on the rug watch; walking off ends it. No sound → "🔇 no sound" and a tip.
- [ ] Phone: the share panel fits; no share button.

## Cats, study buddies and the Buddy Machine

- [ ] Both people see Mochi and Tofu doing the same things. Pet one (E): hearts, it follows ~20 s.
- [ ] Walk through cats and buddies.
- [ ] Buddy Machine (E, by the door): Summon a cat (capsule, then the cat, Bubbles log line, 2 s
      cooldown); summon a study buddy (sits at a free desk; sit in its seat and it moves).
- [ ] 4 cats → Full. Goodbye from the other person works for both. Guests can do both.
- [ ] A study buddy cheers when your focus round ends next to it; says hi in a quiet room.
- [ ] Everyone leaves and returns: summoned ones gone, residents back.
- [ ] Cats look as before (merged for speed): outlines, blinking, napping eyes, swaying tail,
      trotting paws, Shop pets' bows, collars and ruffs (also in the Shop's preview).

## Focus

- [ ] Study session → ▶ 25/5: countdown, "📖 Fei · just started · Calculus" (then "1m", "2m"…)
      over your head and in the list;
      chimes at the end of focus and break.
- [ ] Today tab: your minutes (1+ minute rounds), live; others' too. Under a minute adds nothing.
- [ ] Leave mid-round: it counts. Reload mid-round: still focusing. Walk into another room: the
      first round ends and counts.
- [ ] Friends see "Focusing · Calculus", never Away; "Show what I'm doing" off hides the activity.
- [ ] A guest has the timer; their minutes aren't kept.
- [ ] To-do: add, tick, delete, Clear done; same list after reload, in another room and another
      browser; full at 50; a guest sees "Sign up to keep…"; with the API stopped, changes roll back.
      A change shows at once in your other open tab.
- [ ] Focus page: Today, 7 days and chart match; "Calculus" and " calculus " count together.
      The hero goes back to the room you last walked into, on any device (Discover if none).
- [ ] Rankings: Friends lists only those who focused, plus "N haven't focused"; Everyone shows
      the top 10 and your row; blocked people never appear.
- [ ] "Show me on Everyone" off removes you at once (same switch in Settings). Under 18 starts off.

## Activities

- [ ] **Watch together:** both on the TV rug; a YouTube link plays in sync with YouTube's title.
      Pause, seek, skip and Up next from either (an ended video skips once). Guests too.
- [ ] A private or non-YouTube link is refused with a toast and the Put something on card opens
      again to try another; a 21st in Up next is refused.
- [ ] Off the rug closes the panel; back on rejoins in sync. 30 s with nobody: the TV turns off.
- [ ] A TV share pauses the video and it carries on after.
- [ ] Someone else's TV share shows "… screen is on its way" until the picture arrives, then
      their real screen (never a placeholder slide).
- [ ] Owner or mod: **Turn off the TV** from the panel and Activities; others don't have it.
- [ ] **Photo mode:** 📸 by your name for others; Snap (and 3 s timer), Share to Room chat, Save,
      Copy; guests have no Share.
- [ ] **Chess** (Library): sit → lobby with you as host; 📣 Call everyone sends a card with Go
      there; the second player sits; Start counts down 3 s.
- [ ] Only the player to move can move; checks, draw offers, resign, checkmate end it right on
      both screens; Play again swaps colours.
- [ ] Leave, 30 s away, or leaving the room loses; a reload within 30 s plays on. End stops with
      no result. A watcher on the rug sees a read-only board.
- [ ] "Hide game invites while I'm focusing" hides cards while focusing, on every device.
- [ ] **Slave** (3+ at the card table): each sees only their own hand; 3♣ leads; Play lights only
      for legal plays; Pass; timed turns; 👑 / 🧹 on labels.
- [ ] Play again with the same group: the swap (time out gives back the lowest). Someone new: a
      fresh deal. Leaving mid-game: others play on. A reload keeps your hand. Watchers see no hands.
- [ ] **Whiteboard:** walking up opens it; strokes appear live for both and on the wall; undo only
      your own (even after a reload); Clear asks first; latecomers see the board; walking away
      stops drawing; guests draw, only members Share; timed-out people can't; empty after the
      room empties or the map changes; finger drawing on a phone doesn't scroll.
- [ ] **Pick a Side:** E on the floor opens the lobby; host switches mode (the deck follows).
      Room decks: members write one (3+ questions), edit only their own, owner and mods delete
      any, guests play them.
- [ ] The deck picker has two tabs, Built in and This room (no AI tab), in rooms and Common rooms.
- [ ] Walking into zones moves live counts; answers lock at time; a quiz's answer is never seen
      early; results; Play again draws unplayed questions; Room-wide games off ends it.
- [ ] **Draw & Guess** (3 people, art table): write, draw, describe; nobody sees other chains
      early; half a drawing still goes at time up; Copycat shows 8 s then hides.
- [ ] Two missed turns → out (still sees the album). Reload keeps your turn. The album is the
      same for everyone; host's Pause, Next chain, Finish; reactions; save a chain; members share.
- [ ] Phone width: every lobby, board, hand, deck editor and the album fit.

## Moderation and Common rooms

- [ ] Common rooms: Walk in → "Library Common Room #1"; mic off, Bubbles only, no videos, 3 s
      slow mode. A friend lands in your copy. Signed out, Walk in asks for a name and look first.
- [ ] In a Common room: Room card → Invite copies the Common room's link (it opens Discover's Walk
      in). Someone's "…": Add friend sends a real request, Block really blocks, Report reaches the
      admin site; Send a message only shows for friends.
- [ ] Word filter: room chat and edits masked; Filter words off leaves them; DMs always masked,
      Thai too ("ไอ้เหี้ยนี่" → "ไอ้*****นี่", but "โหดเหี้ยม" stays); bubbles masked, live switch;
      names, handles and room text with a blocked word refused. A room deck and Draw & Guess
      writing are masked too (Filter words off leaves them).
- [ ] Without `OPENAI_API_KEY` pictures still send; with it, flagged ones are dropped.
- [ ] Report a message (not your own), a person (3D "…" or DM), a room (Room card, Discover; not
      your own, not Common). The 11th report within an hour says the team has your reports.
- [ ] 3 accounts reporting one member in 10 min → muted 15 min (never the owner; one account
      three times doesn't count). 5 in a Common copy in 30 min → out of Common rooms for an hour.
- [ ] The muted person is told why: "Some people here reported you…" for reports, "A mod timed you
      out…" for a mod's Time out (in 3D and in Room chat). A muted guest who walks out and back in
      is still muted.
- [ ] A mod's kick, ban, unban, time out and Make mod appear in the admin Audit log under "Room
      mods" (not under "Team").
- [ ] The team closes a room (admin → Rooms) while people are inside: they see "<room> is
      closed", not "isn't there any more". Suspending someone drops their open tabs at once.
- [ ] `pnpm --filter @connecta/api team fei` (and `off`). A team account in a Common room has the
      chip, Time out (follows into other copies) and Remove (1 h). Reports never act on the team.

## Coins, quests and the Shop

- [ ] A new account has 0 coins and three quests (focus, together, play) in the Shop and 🎯.
- [ ] A guest's 🎯 has no count and offers "Sign up to earn coins" (it asks before leaving).
- [ ] Each kind moves live (a stopped focus round counts minutes, not the session; DMs don't count
      as saying things); done → toast "+N 🪙" and coins go up once.
- [ ] New quests after your midnight. Anonymous guests earn nothing; a guest pass earns.
- [ ] Shop: 10 items, tabs, try on, Buy (or how many coins to go), Wear it; others see the new
      look at once; Settings → My character shows bought items; guests see only free items.
- [ ] Each item looks right walking and sitting.
- [ ] Pets: buy and name one; Bring out from the Buddy Machine ("Name · Your cat"); others have
      no Goodbye on it; one out at a time, 4 per room; it goes home ~20 s after you leave; a pet
      bought while inside is there without rejoining.

## Plus

- [ ] Free: 15 at once, 30 members, 10 rooms, 10 MB pictures. Plus (Test tools or checkout): 30
      at once (the slider stops there), 100 members, 30 rooms, 50 MB, sharper shares, ✨ name live.
      The Plus page and the landing page say 15 and 30.
- [ ] Only the owner's plan changes a room. Coming soon on premium maps, skins and pets, AI decks.
- [ ] Stand-in checkout (monthly and yearly, card and PromptPay) → "Welcome to Plus ✨"; billing
      shows the plan, date and receipt. Cancel and turn renewal back on. Paying again while
      renewing is refused; a yearly after cancelling extends the date.
- [ ] Billing → Receipt opens in a new tab and prints or saves as a PDF (phone and desktop). A
      refunded payment says so. Someone else's receipt link says it can't be found.
- [ ] With Stripe test keys and `stripe listen`: Stripe's page, 4242… turns Plus on; PromptPay test
      QR. On a card plan, Change card opens Stripe's billing page in a new tab.
- [ ] Gift Plus to a friend (Friends "…", DM "…", Plus page): you land in the DM with a 🎁 card;
      they get a 🔔 item, Plus, and no price. Gifting someone with Plus extends it. Not for non-friends.
- [ ] Test tools → Cancelled: 🔔, email, Home banner with Keep Plus. Ended · grace (owner of a room
      set to 30): ✨ gone, the room keeps 30 for the grace, then the banner says it goes back to 15. Plus / Free put you back.

## Admin site

- [ ] Off the team, `/admin` is "page not found" and the menu has no Admin site.
- [ ] Users: search, filters, details. Actions need a reason. Suspend Ter while signed in: their
      tab goes to sign-in, signing in shows until when and why; email in Mailpit. Lift, Ban, Warn,
      Reset name. Team accounts have no actions.
- [ ] Reports: two people reporting one person → one case with both. Sexual content or an
      automatic step → urgent, on top. Warn (with or without a reason), Delete + warn (message gone
      at once), Delist, Close (everyone out, chat refused), Dismiss. Done lists decisions.
- [ ] Rooms: Delist / Relist, Close / Reopen, each emails the owner.
- [ ] Common rooms: copies and counts (30 a copy); change seats (30 at most) → the next walk-in uses them; Post notice
      shows the banner for 10 minutes, to latecomers too.
- [ ] Moderation: add and remove a word (live); Word filter off; Report steps off; picture check
      says whether the key is set.
- [ ] Overview: numbers follow live (30 s); urgent cases under Needs you; health strip turns red
      when the game server or LiveKit stops.
- [ ] Money: a stand-in payment shows; Refund… with a reason marks it, emails, keeps Plus; gifts
      have no Refund.
- [ ] Audit log: every action with who, what, why; Team and Auto filters; Older.
