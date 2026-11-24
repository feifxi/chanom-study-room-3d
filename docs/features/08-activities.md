# 8. Activities

**One flow for every activity.** Joining, starting, inviting, leaving and ending work the same
everywhere; each game only designs what happens while it's played. Build this before any game:
[Watch together](09-watch-and-photo.md), [Party games](10-party-games.md) and
[Table games](11-table-games.md) all sit on it.

## Spots

Every activity lives at a **spot** from the map's kit ([Maps](06-maps.md#the-standard-kit)). One activity per spot;
different spots run at once. The Activities list names what you do, with the place under it.

| Activity       | Spot        | Join by           | Kind    | Room-wide |
| -------------- | ----------- | ----------------- | ------- | --------- |
| Watch together | Big screen  | step onto the rug | drop-in | no        |
| Card games     | Card table  | sit on a stool    | rounds  | no        |
| Chess          | Chess table | sit               | rounds  | no        |
| Draw & Guess   | Art corner  | sit at the table  | rounds  | no        |
| Pick a Side    | Open floor  | step onto the rug | rounds  | yes       |

The **whiteboard** is a free zone, not an activity: always on, walk up and draw. The lantern
circle is decor.

## The flow

```
 Free ──sit / E──▶ Gathering ──host: Start──▶ Playing ──ends──▶ Results
  ▲                  │  ▲                         │                │
  └── everyone left ─┘  └──── Play again ─────────┴────────────────┘
```

1. **Free.** Walk there or use **Go there** (runs you along the path). Sit at a table or press E
   at a standing spot to start.
2. **Gathering.** You're the **host**. **Being in the area is being in**: no Join button.
3. **Playing.** The host presses **Start** once there are enough players (3 s countdown).
4. **Results.** The host can **Play again**; otherwise back to the lobby after ~8 s.

- **Host:** whoever started; if they leave, the next to arrive. Picks the game, calls everyone,
  starts, can **End** a round early.
- **Leaving:** Leave on the lobby card, results card or top strip, or walk off. **Out of the area
  for 30 s** (or a dropped connection) also counts. A reload keeps your place within the 30 s.
- **Leaving mid-round is a loss**; the last player left wins. Turn-based games put you out after 2
  missed turns.
- People who arrive mid-round play the next one. No spectator mode, no bots.

## 📣 Call everyone

Only the host sends it, by pressing **Call everyone**. Everyone gets the same small card ("Jod is
starting Slave · 2 joined · **Go there**"), gone after ~20 s or when the game starts. No sound, no
spam limits (mods handle abuse). Setting: **Hide game invites while I'm focusing** (on the account).

## Room-wide games

Room settings → **Room-wide games** (On/Off). Off: nobody can start Pick a Side. Tables, the TV
and the board still work.

## On screen

- What you see up close goes in 2D; what others see from afar shows in 3D.
- **A big panel is a theater:** it fills the screen above the dock, dims the room and hides the
  other panels; the dock stays. It opens with the chat closed; Chat opens it beside the panel.
- Games played by moving around (Pick a Side) keep the room visible.
- **Table games live only in their panels**; watchers step onto the rug for a small view
  ([Table games](11-table-games.md)).
- Spot tags float over each spot (idle ones only near you; live ones from anywhere).

## In the code

- `apps/game/src/activity.ts`: per-spot state (`spots`: phase, host, players, results…) in the room
  state; games plug in as a `RoundGame` (`start`, `out`, `standing`, `stop`, `tick`). Messages
  `activity:start|game|begin|end|call|leave`, `activity:out`.
- Shared types: `packages/shared/src/activities.ts`. Web: `apps/web/src/features/activities/`.
- Results feed quests only ([Coins](14-coins-and-shop.md)); no game history is stored.

## Not doing

Spectator mode, bots, game history and stats, scheduled events.
