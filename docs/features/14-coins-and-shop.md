# 14. Coins, quests and the Shop

PBIs: [COIN-1 to COIN-3](../releases.md#14-coins-quests-and-the-shop) · How the code works: [Release 3](../guide/06-release-3.md#coins-quests-and-the-shop-coin-1-to-coin-3)

Earn-only coins from three daily quests, spent on cosmetics that really show on your character.
**Coins are never sold.** Guests earn nothing; their 🎯 in a room invites them to sign up.

## Daily quests

- **~60 coins a day from 3 quests**, one per group, picked at random per person per day at your
  own midnight:
  - 📖 Focus: focus 1 hour, finish 2 focus sessions
  - 💬 Together: 30 min in a room with others, say 5 things
  - 🎲 Play: pet a cat 3 times, use the Buddy Machine, play any activity once
- **Each quest counts one event the server already sees** (never "with a friend"). Each pays once
  a day. No streaks, no weekly bonus.

## The Shop

Only things that **show on your character in every room**, built in code. Try it on, Buy (final),
Wear it. The free base set stays free.

- **Accessories** (one slot): Bunny Ears 200, Bear Ears 200, Star Clips 220, Flower Crown 280,
  Halo 300, Witch Hat 380.
- **Outfits** (in your outfit colour): Hoodie 500, Overalls 550, Raincoat 650, Yukata 800.
- **Pets** (cats in a coat, named when bought): Midnight 1,000, Tux 1,200, Siamese 1,200,
  Snowball 1,000.
  - A pet doesn't follow you: you bring it out of the Buddy Machine, it lives like the room's
    other cats, only you send it home, and it leaves with you.
  - One of yours out at a time; up to 4 pets in a room.

## In the code

- Quests: rules and the daily pick in `packages/shared/src/quests.ts`; the game server queues
  `quest-events`; `apps/api/src/quests/` counts and pays once in one transaction. Progress older
  than a week is cleaned up nightly; paid coins stay in the ledger.
- Shop: `apps/api/src/shop/`, items in `packages/shared/src/shop.ts`. **The game server takes looks
  and pets only from the API**, so nobody can wear what they didn't buy.
- Web: `apps/web/src/features/shop/`, `features/quests/`.

## Not doing

Buying coins, frames, streaks.
