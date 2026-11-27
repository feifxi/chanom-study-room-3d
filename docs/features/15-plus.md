# 15. Connecta Plus and payments

PBIs: [PLUS-1 to PLUS-5](../releases.md#15-connecta-plus-and-payments) · How the code works: [Release 3](../guide/06-release-3.md#connecta-plus-and-payments-plus-1-to-plus-5)

One subscription. **Never sell power, no ads in rooms, never charge to join.** Paid perks either
cost us money to run or are purely cosmetic.

## Price and perks

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
- The numbers live in one place, `ROOM_PLANS` in `packages/shared/src/rooms.ts`.

## Paying

Stripe's hosted page; we never see card details.

- **Card** renews by itself. **PromptPay** can't be charged without you, so it renews by reminder
  (🔔 and email 3 days before).
- **Cancel** any time; Plus runs to the end of the period.
- **Settings → Plus & billing:** Change card (Stripe's billing page, card plans only), receipts
  (`/receipt/<id>`, print or save as PDF).
- **Refunds:** no button; the team refunds real mistakes from the admin site (money back, Plus
  unchanged). Gifts can't be refunded.
- **Failed card renewals:** Stripe retries for about two weeks; Plus stays on meanwhile.

## Gift Plus

Friends only, 1, 3 or 12 months, starts at once (no "open your gift" step). The friend gets a DM
card and a 🔔 item, never the price. A friend paying by card has their next charge moved back
(Stripe's `trial_end`).

## When Plus ends

**Nothing is deleted and nobody is sent out.** Personal perks end on the date. Rooms keep their
space and Big map for **7 days of grace**, then go back to 25 and Cosy; people inside stay, new
people wait at the door.

## In the code

- Plus: `apps/api/src/plus/` (`hasPlus`, and `roomPlus` with the grace; `PlusEndingService` sweeps
  every 10 minutes for reminders and endings). Dev switch: `POST /api/plus/dev` (404 in
  production), also in Test tools.
- Paying: `apps/api/src/billing/` (`StripeGateway`, webhooks, gifts). **Without
  `STRIPE_SECRET_KEY`, `/checkout` is a local stand-in** that marks the checkout paid through the
  API, so the rest of the flow is the real one.
- Web: `apps/web/src/features/plus/`, `app/checkout/`.

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
