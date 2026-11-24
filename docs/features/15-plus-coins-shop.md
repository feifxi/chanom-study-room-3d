# 15. Plus, coins and the Shop

One subscription, **Connecta Plus**, and earn-only coins for cosmetics. Never sell power, no ads
in rooms, never charge to join. Paid perks either cost us money to run or are purely cosmetic.

## Connecta Plus

**฿89 a month or ฿890 a year** (two months free). Outside Thailand $2.99 / $29.

|                              | Free     | Plus                       |
| ---------------------------- | -------- | -------------------------- |
| Your rooms: people at once   | 25       | 50 Cosy, 100 Big           |
| Your rooms: members          | 150      | 1,000                      |
| Big maps                     | no       | yes                        |
| Screen share                 | 720p     | 1080p                      |
| Rooms you can make / be in   | 10 / 100 | 30 / 200                   |
| Uploads                      | 10 MB    | 50 MB                      |
| Name tag                     | plain    | animated ✨                |
| Premium maps, skins and pets | no       | Coming soon                |
| AI decks (Pick a Side)       | no       | Coming soon (3 / 30 a day) |

- **A room follows its owner's plan** (people at once, members, Big maps, share quality). Your own
  plan sets how many rooms you make and join, your uploads and your name tag. Friends chip in by
  **gifting Plus**.
- The numbers live in one place, `ROOM_PLANS` in `packages/shared/src/rooms.ts`, to tune after the
  playtest.

**Paying** (Stripe's hosted page; we never see card details):

- **Card** renews by itself. **PromptPay** can't be charged without you, so it renews by reminder
  (🔔 and email 3 days before).
- **Cancel** any time; Plus runs to the end of the period.
- **Refunds:** no button; the team refunds real mistakes from the admin site (money back, Plus
  unchanged). Gifts can't be refunded.
- **Failed card renewals:** Stripe retries for about two weeks; Plus stays on meanwhile.

**Gift Plus:** friends only, 1, 3 or 12 months, starts at once (no "open your gift" step). The
friend gets a DM card and a 🔔 item, never sees the price. A friend paying by card has their next
charge moved back (Stripe's `trial_end`).

**When Plus ends, nothing is deleted and nobody is sent out.** Personal perks end on the date.
Rooms keep their space and Big map for **7 days of grace**, then go back to 25 and Cosy; people
inside stay, new people wait at the door.

## Coins and daily quests

- **Coins are earned, never bought.** ~60 a day from **3 quests**, one per group, picked at random
  per person per day at your own midnight:
  - 📖 Focus: focus 1 hour, finish 2 focus sessions
  - 💬 Together: 30 min in a room with others, say 5 things
  - 🎲 Play: pet a cat 3 times, use the Buddy Machine, play any activity once
- **Each quest counts one event the server already sees** (never "with a friend"). Each pays once a
  day. No streaks, no weekly bonus. Every account earns, a guest pass too; anonymous guests don't.

## The Shop

Only things that **really show on your character in every room**, built in code.

- **Accessories** (one slot): Bunny Ears 200, Bear Ears 200, Star Clips 220, Flower Crown 280,
  Halo 300, Witch Hat 380.
- **Outfits** (in your outfit colour): Hoodie 500, Overalls 550, Raincoat 650, Yukata 800.
- **Pets** (cats in a coat, named when bought): Midnight 1,000, Tux 1,200, Siamese 1,200, Snowball
  1,000. A pet doesn't follow you: you bring it out of the Buddy Machine, it lives like the room's
  other cats, only you send it home, and it leaves with you. One of yours out at a time; up to 4
  pets in a room.
- Try it on, Buy (final), Wear it. The free base set stays free.

## In the code

- Plus: `apps/api/src/plus/` (`hasPlus`, and `roomPlus` with the 7-day grace;
  `PlusEndingService` sweeps every 10 minutes for the reminders and the end). Dev switch:
  `POST /api/plus/dev` (404 in production), also in Test tools.
- Paying: `apps/api/src/billing/` (`StripeGateway`, webhooks, gifts). **Without
  `STRIPE_SECRET_KEY`, `/checkout` is a local stand-in** that marks the checkout paid through the
  API, so the rest of the flow is the real one.
- Settings → Plus & billing: **Change card** opens Stripe's billing page in a new tab (card plans
  paid through Stripe only). **Receipt** opens `/receipt/<id>`, which prints or saves as a PDF
  through the browser.
- Quests: rules and the daily pick in `packages/shared/src/quests.ts`; the game server queues
  `quest-events`; `apps/api/src/quests/` counts and pays once in one transaction.
- Shop: `apps/api/src/shop/`, items in `packages/shared/src/shop.ts`. **The game server takes looks
  and pets only from the API**, so nobody can wear what they didn't buy.
- Web: `apps/web/src/features/plus/`, `features/shop/`, `features/quests/`, `app/checkout/`

## Setting up Stripe (the owner)

1. A Stripe account in **test mode**; turn on Cards and PromptPay.
2. `STRIPE_SECRET_KEY=sk_test_…` in `apps/api/.env`.
3. `stripe listen --forward-to localhost:4000/api/billing/stripe-webhook`; put the `whsec_…` in
   `STRIPE_WEBHOOK_SECRET`; restart the API.
4. Pay with `4242 4242 4242 4242` or PromptPay's test QR.

## Not built yet

- Premium maps, Plus skins and pets, AI decks (Coming soon on the Plus page), a profile banner.
- Price check with real numbers after the playtest: Stripe takes ~3.65% + ฿10 a card payment
  (1.65% PromptPay); a free user costs ~฿1–2 a month, a Plus owner ~฿15–25; break-even around 3%
  paying (~3,000 monthly users).
