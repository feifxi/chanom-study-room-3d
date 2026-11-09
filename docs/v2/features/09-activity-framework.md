# 9. Activity framework

Status: decided (2026-11-09). Overview: [`docs/v2-plan.md`](../../v2-plan.md). Spots come from the
map's standard kit: [`07-maps.md`](07-maps.md). Voice and leaving a room: [`06-3d-room.md`](06-3d-room.md).

Try it: `pnpm --filter @study/demo demo:dev` → http://localhost:3100/servers/chanom/rooms/library.

- Dock → **Activities** → Card games → **Go there**, press **E** to sit, then 📣 **Call everyone** (two
  friends walk over), **Start**. In the placeholder you can "Finish the round" or have "Someone else
  leave".
- Demo tab → **Someone starts Pick a Side** (it also happens on its own ~25 s after you walk in):
  an invite card, **Go there**, and the host starts once you're in. Walk off mid-round to see the
  30 s "come back" banner.

## The idea

One flow for every activity (watch together, cards, Werewolf, Pick a Side, drawing telephone,
quizzes).
Joining, starting, inviting, leaving and ending work the same everywhere; only what happens _during_
the game differs, and each game designs that in its own feature (10–13).

## Spots

Every activity lives at a **spot** from the map's standard kit (feature 7). One activity per spot at a
time; different spots run at the same time (TV + a card game + Pick a Side).

The Activities list names each one by **what you do** ("Pick a Side", "Watch together"), with the
place under it ("At the open floor · press E to start"), so nobody has to guess what an "art corner"
is (decided 2026-11-09).

| In the list       | Spot (place)   | Joining          | Kind    | Room-wide |
| ----------------- | -------------- | ---------------- | ------- | --------- |
| Card games (12)   | Card table     | sit on a stool   | rounds  | no        |
| Werewolf (12)     | Werewolf table | sit at the table | rounds  | no        |
| Pick a Side (11)  | Open floor     | step in the ring | rounds  | yes       |
| Watch together    | Big screen     | step in the area | drop-in | no        |
| Drawing telephone | Art corner     | step in the ring | rounds  | no        |

- **Werewolf gets its own table** (user's idea, 2026-11-09), apart from the card table, so a werewolf
  night and a card game can run at once. Designed in feature 12; the demo lists it as coming.
- **The whiteboard is a free zone, not an activity** (like the Buddy Machine): it isn't in the list,
  doesn't light the Activities button and has no activity strip; walk up, press E, draw, walk away.
  It still uses the drop-in machinery underneath (who's there, cleared when everyone leaves).

- **Rounds:** people who arrive mid-round play the next one (until then they watch in 3D).
- **Drop-in:** step in any time.
- A Big map can have more of a spot (2 card tables = 2 card games).
- The demo's library got a **round card table with 4 stools** (front right) as a placeholder; each
  game's feature finishes its spot in the map editor.

## The flow

```
 Free ──sit / E──▶ Gathering ──host: Start──▶ Playing ──ends──▶ Results
  ▲                  │  ▲                         │                │
  └── everyone left ─┘  └──── Play again ─────────┴────────────────┘
```

1. **Free.** Get there by walking, or **Go there** in the Activities list or on an invite card, which
   **runs** you there along the path. The trigger stays yours: **sit** at a table (tables start when
   you sit) or press **E** at a standing spot ("Press E to start a game on the open floor").
2. **Gathering (the lobby).** You're the **host**. A ring glows on the floor around the spot: the
   **area**. **Being in the area is being in**: sit on a free stool, or step into the ring. Nobody
   presses "Join".
3. **Playing.** The host presses **Start** once there are enough players (a 3 s countdown). Each game
   then shows its own layers (below).
4. **Results.** A results card at the spot. The host can **Play again** straight away; otherwise it
   goes back to the lobby after ~8 s. When everyone has left, the spot is free again.

### Host

- Whoever started it. If the host leaves, the next player (in arrival order) becomes host.
- The host picks the game (when a spot has several), calls everyone, starts, and can **End** a
  round early (back to the lobby, no winner).

### Leaving

- **Leave** is always in the same place: on the lobby card, the results card, and the strip at the top
  while playing. Standing up from the table or walking out of the ring works too.
- **Out of the area for 30 s** (walked off, connection dropped) also counts as leaving; a banner shows
  "Come back to stay in the game · 0:24". One rule for both, which matters on phones.
- **Leaving mid-round = you're out** (a loss). When only one player is left, they win.
- Each game says what "out" means for it (Werewolf: you die; drawing telephone: your turn is skipped).
- **Turn-based games:** a turn timer; missing 2 turns in a row puts you out, so nobody stalls a game.
- **No spectator mode** and no bots: you watch by standing nearby, because every spot shows its game
  in 3D.

## Inviting: 📣 Call everyone

- Only the **host** sends it, by pressing **Call everyone** on the lobby card ("Called ✓" after). Nothing
  is sent automatically, so a quick game with whoever's already sitting there pings nobody.
- **The same invite card for every activity**, top right under the people pill:
  "🃏 Jod is starting Slave · Card games at the card table · 2 joined · **Go there**".
  - Updates live; gone when the game starts, when you close it, or after ~20 s (a thin bar shows it).
  - No sound and never takes keyboard focus. Shown to everyone, **including people focusing** (people
    in the same room usually want to join in).
  - Personal setting (Settings → Notifications): **"Hide game invites while I'm focusing"**, off by
    default. You still see what's on under Activities.
  - Two cards at most on screen, then "+1 more under Activities".
- **No spam limits.** It's your room; owners and mods can kick or time someone out.

## Room-wide games (room setting)

- Room settings → **Room-wide games** (On/Off; replaces "Quiet room"). Off: nobody can start games that
  use the whole room (Pick a Side). Tables, the TV and the board still work.
- Anyone can start a room-wide game when it's on, like Discord activities; people choose to join.

## How an activity shows on screen (each game designs its own mix)

| Layer         | What goes here                                                   | Example                                         |
| ------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| **3D world**  | anything people should see from a distance; bodies and positions | Pick a Side halves, cards on the table, the TV  |
| **Small HUD** | the room stays fully visible: question, timer, scores            | Pick a Side's question and countdown            |
| **Big panel** | needs detail or precise input; voice and the room keep going     | your hand of cards, the drawing canvas, a video |

Rule: **what you see up close goes in 2D, what others see from afar shows in 3D.** Some games need map
pieces too (a Werewolf circle, a stage); that's designed per game, and only the Connecta team builds
maps.

## The shared UI pieces

- **Activities** (dock): every spot with its live state (green dot gathering, pink playing) and **Go
  there**; the dock button gets a dot while anything is live.
- **Lobby card** (above the dock): game and spot, faces with the host's crown, empty seats as "+",
  player count, the host's game picker, 📣 Call everyone, ▶ Start (or "You're in. Mai starts the game").
- **Top strip** while playing: "🃏 Slave · 3 playing · 1 next round · End · Leave".
- **Results card**: places, Leave, Play again (host).
- **"Next round" card** for people who arrived mid-round.
- **Away banner**: the 30 s countdown.
- E hints at spots: "Press E to sit and start a game 🃏", "…to join Slave", "…sit · you'll play next round".
- Voice: normal proximity; nothing changes during activities.

## Backend notes

- An `Activity` module in the Colyseus room: per spot `{ phase, gameId, hostId, players, nextRound,
out, awaySince, startsAt }`, synced in the room state (small). The server decides who's in from
  positions and seats it already has; games plug in with `start / onLeave / finish` hooks.
- Invites are a room broadcast; the client filters (dismissed, focusing + setting).
- Results only go to quests ("play any activity once"); no game history is stored.
- Cost: nothing new beyond the room state; games with media (watch together) add their own.

## Not now

- Spectator mode, bots, game history and stats, scheduled events.
