# 6. Release 3 in the code: open to everyone

The code behind every [R3 PBI](../releases.md): Common rooms for strangers, automatic moderation,
coins and the Shop, Plus and payments, and the admin site's money pages. It builds on
[Release 1](04-release-1.md) and [Release 2](05-release-2.md).

---

## Bigger and more maps (MAP-4, MAP-5)

Spec: [6. Maps](../features/06-maps.md) · All its PBIs: [release plan](../releases.md#6-maps)

- **Sizes:** a room's `size` (`cosy` or `big`) picks how the map is laid out; Big needs the owner's
  Plus, checked by the API when the setting changes and by the grace rules when Plus ends.
- **More templates:** each map is a data file in [`packages/shared/src/maps/`](../../packages/shared/src/maps)
  (`cafe.ts`, `rooftop.ts`) plus a look in [`features/room3d/`](../../apps/web/src/features/room3d)
  (`Cafe.tsx`, `Rooftop.tsx`), joined in [`features/map/active.ts`](../../apps/web/src/features/map/active.ts).
  Every map must have the standard kit ([spec](../features/06-maps.md#the-standard-kit)).

---

## Room decks for Pick a Side (PG-4)

Spec: [10. Party games](../features/10-party-games.md) · All its PBIs: [release plan](../releases.md#10-party-games)

**How it works:** decks are rows in the API (`RoomDeck`), written by members
(`POST /api/rooms/:id/decks`) and masked by the word filter. To play one, the host's page asks for
a **deck pass** (`POST /api/decks/:id/pass`): the deck signed for this room with `GAME_SECRET`. The
page hands it to the game server (`side:deck`), which checks the signature
([`ticket.ts`](../../apps/game/src/ticket.ts) `readDeckPass`) and trusts it like a join ticket. So
the game server never reads the database.

**Files:** API [`decks/`](../../apps/api/src/decks); game the `side:deck` handler in
[`room.ts`](../../apps/game/src/room.ts); web [`pickASide/useRoomDecks.ts`](../../apps/web/src/features/activities/pickASide/useRoomDecks.ts),
[`DeckPicker.tsx`](../../apps/web/src/features/activities/pickASide/DeckPicker.tsx).

---

## Automatic report steps (MOD-5)

Spec: [12. Moderation and reports](../features/12-moderation.md) · All its PBIs: [release plan](../releases.md#12-moderation-and-reports)

**How it works**

1. Each report also counts in a **Redis sorted set** per person and place, over a time window
   ([`reports.service.ts`](../../apps/api/src/reports/reports.service.ts)). Only accounts that are
   there count, once each.
2. **3 in 10 minutes in a room:** a 15-minute timeout on the membership (or the guest's visit),
   marked `timedOutBy: 'reports'`, sent as a `timeout` room event. **5 in 30 minutes in Common
   rooms:** out of every Common room for an hour.
3. Each step writes an audit entry with no `by` (automatic) and flags the case urgent for the team.
4. **The muted person is told why:** the game server answers a blocked bubble with
   `quiet { until, by }`, and room chat answers 403 `timed_out` with the reason.

**Files:** API [`reports/`](../../apps/api/src/reports); shared thresholds in
[`reports.ts`](../../packages/shared/src/reports.ts); game the `timeout` case in `apply()` of
[`room.ts`](../../apps/game/src/room.ts); web the `onQuiet` toast in [`RoomView.tsx`](../../apps/web/src/features/room/RoomView.tsx).

---

## Common rooms (COM-1 to COM-4)

Spec: [13. Common rooms](../features/13-common-rooms.md) · All its PBIs: [release plan](../releases.md#13-common-rooms)

**How it works**

1. **No database rows.** A Common room is a type (`library`, `cafe`, `rooftop`,
   [`packages/shared/src/common.ts`](../../packages/shared/src/common.ts)); each copy is just a game
   server room (`common-library-2`).
2. **Walking in** (`/common/library`) calls `POST /api/common/:type/ticket`. The API picks the copy
   ([`common.service.ts`](../../apps/api/src/common/common.service.ts)): your friends' copy, else
   the busiest still taking strangers (20 of 25 seats), else a new one. Who's in each copy comes from
   presence; a fresh ticket holds its seat in Redis for 30 s so two people never get the same last
   seat.
3. **The ticket says `common: true`**, and the game server turns on the safe rules: text only, the
   3-second bubble limit, the word filter always on, no TV.
4. **Signed-out visitors** pick a name and look at the door ([`CommonGuestGate.tsx`](../../apps/web/src/features/common/CommonGuestGate.tsx))
   and become guests.
5. **The team inside** has its own actions: `PUT /api/common/people/:userId/timeout` (follows them
   into any copy, kept in Redis) and `POST …/remove` (out for an hour).

**Files:** shared [`common.ts`](../../packages/shared/src/common.ts); API [`common/`](../../apps/api/src/common);
game the `common` flag in [`room.ts`](../../apps/game/src/room.ts); web
[`features/common/`](../../apps/web/src/features/common) (`CommonWalkIn`, `CommonGuestGate`,
`useCommon`, `CommonNoticeBanner`), [`app/(room)/common/[type]/page.tsx`](<../../apps/web/src/app/(room)/common/[type]/page.tsx>).

---

## Coins, quests and the Shop (COIN-1 to COIN-3)

Spec: [14. Coins, quests and the Shop](../features/14-coins-and-shop.md) · All its PBIs: [release plan](../releases.md#14-coins-quests-and-the-shop)

**How it works**

1. **Quests are picked per person per day** from three groups, by a stable hash of you and the
   day in your time zone, so they're the same on every device ([`packages/shared/src/quests.ts`](../../packages/shared/src/quests.ts)).
2. **Counting:** the game server reports steps it sees (`quest-events` queue: focus minutes, petting
   a cat, playing an activity, time with others, bubbles); Room chat messages are counted by the API. The
   worker ([`quests.processor.ts`](../../apps/api/src/quests/quests.processor.ts)) adds progress and,
   when a quest completes, pays coins **once** in the same transaction (a `CoinEntry` in the ledger).
   Guests never count.
3. **The Shop** (`POST /api/shop/items/:id/buy`) spends coins and adds an `OwnedItem`. Items are a
   fixed list in code ([`shop.ts`](../../packages/shared/src/shop.ts)), built from the same shapes as
   the free look ([`avatar/character.ts`](../../apps/web/src/features/avatar/character.ts)).
4. **You can only wear what you own:** saving a look checks it (`ShopService.checkLook`), and the
   game server takes looks only from the API.
5. **Pets** are owned Shop cats: the ticket lists your pets, `pet:summon` brings one out of the
   Buddy Machine, and it leaves with you.

**Files:** shared [`quests.ts`](../../packages/shared/src/quests.ts), [`shop.ts`](../../packages/shared/src/shop.ts);
API [`quests/`](../../apps/api/src/quests), [`shop/`](../../apps/api/src/shop) (`pets.ts`); database
`QuestProgress`, `CoinEntry`, `OwnedItem`; game `quest()` in [`room.ts`](../../apps/game/src/room.ts);
web [`features/quests/useQuests.ts`](../../apps/web/src/features/quests/useQuests.ts),
[`components/app/QuestList.tsx`](../../apps/web/src/components/app/QuestList.tsx),
[`features/shop/useWardrobe.ts`](../../apps/web/src/features/shop/useWardrobe.ts),
[`app/(app)/(home)/home/shop/page.tsx`](<../../apps/web/src/app/(app)/(home)/home/shop/page.tsx>),
[`features/npc/PetPreview.tsx`](../../apps/web/src/features/npc/PetPreview.tsx).

---

## Connecta Plus and payments (PLUS-1 to PLUS-5)

Spec: [15. Connecta Plus and payments](../features/15-plus.md) · All its PBIs: [release plan](../releases.md#15-connecta-plus-and-payments)

**How it works**

1. **Plus is one date on the user:** `users.plus_until`. Everything asks `hasPlus(user)` or, for a
   room, `roomPlus(owner)` with the 7-day grace ([`plus/plus.ts`](../../apps/api/src/plus/plus.ts)).
   The limits come from `ROOM_PLANS`.
2. **Paying** (`POST /api/billing/checkout`): the API creates a Stripe Checkout and the browser goes
   to Stripe's page. Stripe's **webhook** (`POST /api/billing/stripe-webhook`, signature checked
   over the raw body) says it was paid; the API records a `Payment` and moves `plus_until` on.
   Without `STRIPE_SECRET_KEY`, a **local stand-in** checkout marks it paid through the API
   (`POST /api/billing/checkout/:id/dev-pay`), so the rest is the real flow.
3. **Card vs PromptPay:** a card renews in Stripe by itself; PromptPay can't be charged without
   you, so the API reminds you 3 days before (🔔 and email) and you pay again.
4. **Gift Plus** (`POST /api/billing/gift`): paid once; adds months to the friend and posts a gift
   card in your DM. A friend paying by card gets their next charge moved back (Stripe `trial_end`).
5. **When Plus ends,** a sweep every 10 minutes ([`plus-ending.service.ts`](../../apps/api/src/plus/plus-ending.service.ts))
   sends reminders, ends personal perks, and after the grace sets rooms back to Free limits. Nobody
   is sent out; the game server just stops letting extra people in.
6. **Everywhere at once:** a Plus change sends a `plus` room event (the name tag) and a live event
   (your tabs refresh, [`PlusListener.tsx`](../../apps/web/src/features/plus/PlusListener.tsx)).

**Files:** shared [`plus.ts`](../../packages/shared/src/plus.ts), `ROOM_PLANS` in
[`rooms.ts`](../../packages/shared/src/rooms.ts); API [`plus/`](../../apps/api/src/plus),
[`billing/`](../../apps/api/src/billing) (`billing.service`, `stripe.gateway`), [`mail/plus-mail.ts`](../../apps/api/src/mail/plus-mail.ts);
database `PlusSubscription`, `Checkout`, `Payment`; web [`lib/plus.ts`](../../apps/web/src/lib/plus.ts),
[`app/(app)/(home)/home/plus/page.tsx`](<../../apps/web/src/app/(app)/(home)/home/plus/page.tsx>),
[`app/checkout/page.tsx`](../../apps/web/src/app/checkout/page.tsx),
[`app/receipt/[id]/page.tsx`](../../apps/web/src/app/receipt/[id]/page.tsx),
[`components/app/PlusBillingTab.tsx`](../../apps/web/src/components/app/PlusBillingTab.tsx),
[`GiftPlusDialog.tsx`](../../apps/web/src/components/app/GiftPlusDialog.tsx),
[`features/place/PlusEndingBanner.tsx`](../../apps/web/src/features/place/PlusEndingBanner.tsx).
Stripe setup for testing: [spec](../features/15-plus.md#setting-up-stripe-the-owner).

---

## The admin site's Common rooms and Money (ADM-8, ADM-9)

Spec: [16. Team accounts and the admin site](../features/16-admin.md) · All its PBIs: [release plan](../releases.md#16-team-accounts-and-the-admin-site)

- **Common rooms page:** each copy and how full, the seats setting, a notice banner sent to every
  Common room as a `notice` room event ([`platform-admin.service.ts`](../../apps/api/src/admin/platform-admin.service.ts)).
- **Money:** revenue against Stripe's fees, payments, and refunds
  (`POST /api/admin/money/payments/:id/refund`) ([`money-admin.service.ts`](../../apps/api/src/admin/money-admin.service.ts)).

Web: [`app/admin/common`](../../apps/web/src/app/admin/common/page.tsx), [`app/admin/money`](../../apps/web/src/app/admin/money/page.tsx).
