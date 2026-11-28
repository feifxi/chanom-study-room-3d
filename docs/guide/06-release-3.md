# 6. Release 3 in the code: open to everyone

The code behind every [R3 PBI](../releases.md): guests and rooms others can find, the word filter,
reports and the team's admin site, Common rooms for strangers, coins and the Shop, and Plus. It
builds on [Release 1](04-release-1.md) and [Release 2](05-release-2.md).
---

## Guests (ACC-8 to ACC-10)

Spec: [1. Accounts and guests](../features/01-accounts.md) · All its PBIs: [release plan](../releases.md#1-accounts-and-guests)

**How it works**

1. A guest pass page (`/g/<code>`, [`InvitePage`](../../apps/web/src/features/rooms/InvitePage.tsx))
   signs the browser in anonymously (Better Auth's `anonymous` plugin), then `PUT /api/me/guest`
   with a name, a look and the age answer ([`GuestAge.tsx`](../../apps/web/src/features/account/GuestAge.tsx)).
   Under 13 writes the same `AgeLock` as sign-up.
2. Accepting the pass (`POST /api/invites/:code/accept`) writes a `GuestVisit` (the room, until
   when); the ticket then says `role: 'guest'`, and the game server keeps guests listening only
   unless the room allows guest voice.
3. Signing up from inside keeps the look and name: the anonymous account becomes a full one.
4. A nightly job deletes guest accounts 30 days after their last session ([`accounts-cleanup.ts`](../../apps/api/src/accounts/accounts-cleanup.ts)).

**Files:** API [`accounts/me.controller.ts`](../../apps/api/src/accounts/me.controller.ts) (`PUT guest`),
[`accounts.service.ts`](../../apps/api/src/accounts/accounts.service.ts) (`setGuest`, `ageGate`),
[`rooms/rooms.service.ts`](../../apps/api/src/rooms/rooms.service.ts) (passes, `GuestVisit`);
database `GuestVisit`; web [`app/g/[code]`](../../apps/web/src/app/g/[code]/page.tsx),
[`features/rooms/InvitePage.tsx`](../../apps/web/src/features/rooms/InvitePage.tsx),
[`features/account/GuestAge.tsx`](../../apps/web/src/features/account/GuestAge.tsx),
[`lib/guest.ts`](../../apps/web/src/lib/guest.ts).

---

## Rooms others can find (ROOM-9 to ROOM-12)

Spec: [2. Rooms and membership](../features/02-rooms.md) · All its PBIs: [release plan](../releases.md#2-rooms-and-membership)

**How it works**

1. **Guest passes** are `Invite` rows of the guest kind, made from the Invite dialog when the room
   has "Allow guests" on.
2. **Ask to join and Open:** the room's `visibility` (`private`, `request` or `open`). Asking writes a `JoinRequest`
   (`POST /api/rooms/:id/requests`) and an inbox item for mods; Open's **Join & walk in** is
   `POST /api/rooms/:id/join`. A listed room you're not in shows a preview first
   ([`JoinRoomDialog`](../../apps/web/src/features/place/JoinRoomDialog.tsx)).
3. **Discover** (`GET /api/rooms/listed`): search, tags, language, ordered by friends inside, then
   people inside now (from presence), then members. Live counts come over the gateway
   (`watch:inside`).
4. **Thumbnails** (`PUT /api/rooms/:id/thumbnail`): uploaded like a chat picture, cropped to 16:9,
   made WebP and checked ([`thumbnail.service.ts`](../../apps/api/src/rooms/thumbnail.service.ts)).

**Files:** API [`rooms/`](../../apps/api/src/rooms); database `JoinRequest`, `Invite`; web
[`app/(browse)/discover/page.tsx`](<../../apps/web/src/app/(browse)/discover/page.tsx>),
[`components/app/OpenRoomCard.tsx`](../../apps/web/src/components/app/OpenRoomCard.tsx),
[`features/rooms/RoomPreview.tsx`](../../apps/web/src/features/rooms/RoomPreview.tsx),
[`features/place/JoinRoomDialog.tsx`](../../apps/web/src/features/place/JoinRoomDialog.tsx),
[`RoomSettingsDialog.tsx`](../../apps/web/src/features/place/RoomSettingsDialog.tsx) (Overview, Invites tabs).

---

## More maps (MAP-4)

Spec: [6. Maps](../features/06-maps.md) · All its PBIs: [release plan](../releases.md#6-maps)

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

## Moderation and reports (MOD-1 to MOD-5)

Spec: [12. Moderation and reports](../features/12-moderation.md) · All its PBIs: [release plan](../releases.md#12-moderation-and-reports)

**How it works**

1. **Word filter:** `maskWords` ([`moderate.ts`](../../packages/shared/src/moderate.ts)) masks chat
   in the API and bubbles on the game server. Names and room text with a blocked word are refused
   (the Zod schemas call it). The room's `filterWords` setting turns masking off for its chat.
2. **Reports** (`POST /api/reports`): a person, a message or a room, with context (nearby messages,
   the bubbles the reporter saw). Kept for the team only, never shown to room mods.
3. **Picture check:** OpenAI's free moderation endpoint, called by the pictures worker
   ([`picture-check.ts`](../../apps/api/src/chat/picture-check.ts)); off until `OPENAI_API_KEY` is set.
4. **Slow mode:** Common rooms' 3-second bubble limit is enforced on the game server
   ([`common.ts`](../../packages/shared/src/common.ts)). A room's own Slow mode switch is saved but
   not enforced yet ([open issues](../open-issues.md)).

**Automatic report steps (MOD-5)**

1. Each report also counts in a **Redis sorted set** per person and place, over a time window
   ([`reports.service.ts`](../../apps/api/src/reports/reports.service.ts)). Only accounts that are
   there count, once each.
2. **3 in 10 minutes in a room:** a 15-minute timeout on the membership (or the guest's visit),
   marked `timedOutBy: 'reports'`, sent as a `timeout` room event. **5 in 30 minutes in Common
   rooms:** out of every Common room for an hour.
3. Each step writes an audit entry with no `by` (automatic) and flags the case urgent for the team.
4. **The muted person is told why:** the game server answers a blocked bubble with
   `quiet { until, by }`, and room chat answers 403 `timed_out` with the reason.

**Files**

- Shared: [`moderate.ts`](../../packages/shared/src/moderate.ts), [`reports.ts`](../../packages/shared/src/reports.ts) (thresholds)
- API: [`reports/`](../../apps/api/src/reports), word filter calls in [`chat/chat.service.ts`](../../apps/api/src/chat/chat.service.ts),
  [`chat/picture-check.ts`](../../apps/api/src/chat/picture-check.ts)
- Database: `Report`
- Game: the `timeout` case in `apply()` of [`room.ts`](../../apps/game/src/room.ts)
- Web: [`features/moderation/ReportDialog.tsx`](../../apps/web/src/features/moderation/ReportDialog.tsx),
  [`features/place/ReportRoomDialog.tsx`](../../apps/web/src/features/place/ReportRoomDialog.tsx),
  the `onQuiet` toast in [`RoomView.tsx`](../../apps/web/src/features/room/RoomView.tsx)

---

## Common rooms (COM-1 to COM-4)

Spec: [13. Common rooms](../features/13-common-rooms.md) · All its PBIs: [release plan](../releases.md#13-common-rooms)

**How it works**

1. **No database rows.** A Common room is a type (`library`, `cafe`, `rooftop`,
   [`packages/shared/src/common.ts`](../../packages/shared/src/common.ts)); each copy is just a game
   server room (`common-library-2`).
2. **Walking in** (`/common/library`) calls `POST /api/common/:type/ticket`. The API picks the copy
   ([`common.service.ts`](../../apps/api/src/common/common.service.ts)): your friends' copy, else
   the busiest still taking strangers (25 of 30 seats), else a new one. Who's in each copy comes from
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

## Team accounts and the admin site (ADM-1 to ADM-9)

Spec: [16. Team accounts and the admin site](../features/16-admin.md) · All its PBIs: [release plan](../releases.md#16-team-accounts-and-the-admin-site)

**How it works**

1. **Team** is a flag on the user, set only by a script:
   `pnpm --filter @connecta/api team <handle>` ([`scripts/team.ts`](../../apps/api/scripts/team.ts)).
2. **`/admin`** checks the flag on the server and answers 404 to everyone else
   ([`app/admin/layout.tsx`](../../apps/web/src/app/admin/layout.tsx)); every `/api/admin/*` route
   checks it again ([`admin/team.ts`](../../apps/api/src/admin/team.ts)).
3. **Reports queue** groups reports into cases (one per person, message or room), urgent first
   ([`reports-admin.service.ts`](../../apps/api/src/admin/reports-admin.service.ts)).
4. **Account actions** (`POST /api/admin/users/:id/actions`): warn, suspend, ban, lift, reset name.
   Each one emails the reason ([`mail/account-mail.ts`](../../apps/api/src/mail/account-mail.ts)),
   writes an `AccountAction` and an audit entry, and a suspension signs the person out everywhere
   (sessions deleted, `LiveService.signOut`, a `kick` room event).
5. **Audit log** (`GET /api/admin/audit`) reads `AuditEntry`.

**Files**

- API: [`admin/`](../../apps/api/src/admin) (`admin.controller`, `accounts-admin.service`,
  `reports-admin.service`, `audit-admin.service`), [`audit/audit.service.ts`](../../apps/api/src/audit/audit.service.ts)
- Database: `AccountAction`, `AuditEntry`
- Web: [`app/admin/`](../../apps/web/src/app/admin) (`users`, `reports`, `audit`),
  [`features/admin/`](../../apps/web/src/features/admin) (`AdminFrame`, `useAdmin`, `auditLabels`),
  [`features/account/AccountListener.tsx`](../../apps/web/src/features/account/AccountListener.tsx)
  (a suspended tab goes to sign-in)

**More pages**

- **Rooms** (`POST /api/admin/rooms/:id/actions`): delist, close, and undo
  ([`rooms-admin.service.ts`](../../apps/api/src/admin/rooms-admin.service.ts)). Closing sends a
  `deleted` room event with `closed: true`, so people inside are told why.
- **Moderation page:** the layers' switches and the word list
  ([`platform-admin.service.ts`](../../apps/api/src/admin/platform-admin.service.ts)), applied
  everywhere by [platform settings](03-techniques.md#platform-settings).
- **Overview:** live counts and a health strip ([`overview-admin.service.ts`](../../apps/api/src/admin/overview-admin.service.ts)).
- **Common rooms page:** each copy and how full, the seats setting, a notice banner sent to every
  Common room as a `notice` room event ([`platform-admin.service.ts`](../../apps/api/src/admin/platform-admin.service.ts)).
- **Money:** revenue against Stripe's fees, payments, and refunds
  (`POST /api/admin/money/payments/:id/refund`) ([`money-admin.service.ts`](../../apps/api/src/admin/money-admin.service.ts)).

Web: [`app/admin/page.tsx`](../../apps/web/src/app/admin/page.tsx) (Overview),
[`rooms`](../../apps/web/src/app/admin/rooms/page.tsx), [`moderation`](../../apps/web/src/app/admin/moderation/page.tsx),
[`common`](../../apps/web/src/app/admin/common/page.tsx), [`money`](../../apps/web/src/app/admin/money/page.tsx).
