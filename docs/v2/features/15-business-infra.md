# 15. Business and infra

**Status:** Plus is being built in four parts (2026-11-23): 1. Plus on the account, every limit
following the plan (done); 2. paying with Stripe in test mode (done: a local stand-in until the
owner adds Stripe's test keys); 3. Gift Plus; 4. when Plus ends. Gifts and grace are still the
demo's until their parts. **Try it:** http://localhost:3100/home/plus,
`/checkout?plan=yearly`, and `/admin/money` (View as Connecta team). V1's infra is at tag `v1.0.0`
(`infra/README.md`). The cloud is AWS; nginx replaced Caddy on 2026-11-21
([decision](../decisions.md#engineering-and-infra)).

One subscription, **Connecta Plus**, plus earn-only coins for cosmetics. Infra is V1's single app
server with only what V2 needs added, and monitoring on its own server for SRE practice.

## Connecta Plus

|                               | Free     | Plus                  |
| ----------------------------- | -------- | --------------------- |
| Rooms you own: people at once | 25       | 100 (Big maps)        |
| Rooms you own: members        | 150      | 1,000                 |
| Maps                          | basic    | + premium maps        |
| Screen share                  | 720p     | 1080p                 |
| Rooms you can make / join     | 10 / 100 | 30 / 200              |
| Skins and pets                | base set | + premium skins, pets |
| Name tag and profile banner   | plain    | animated              |
| Uploads                       | 10 MB    | 50 MB                 |
| AI quiz decks (Pick a Side)   | 3 a day  | 30 a day              |

- **A room follows its owner's plan.** Everyone inside gets the room's space and maps; only the owner
  pays. Friends chip in by **gifting Plus**.
- **If Plus ends:** nothing is deleted. After 7 days of grace the owner's rooms go back to 25 at
  once, and a premium or Big map moves live to its basic version.
- **Rules:** never sell power, no ads in rooms, never charge to join. Paid perks either cost us money
  to run (capacity, HD video, storage, AI) or are purely cosmetic. Free limits follow real cost.
- **Whose plan:** the room's owner's sets people at once, members, Big maps and screen-share
  quality (it's the room's bandwidth). Your own sets how many rooms you can make and be in, your
  upload size and your name tag.
- **Built so far:** everything in the table but premium maps, Plus skins and pets, and AI decks,
  which have nothing to unlock yet: the Plus page marks them **Coming soon**, and each arrives as
  its own part. The profile banner was left out for now (profiles have no banner yet).
- **The animated name tag:** your name shimmers (✨ and a pastel gradient) over your head in every
  room, switching live when Plus starts or ends.

### Plus: backend notes

- `users.plus_until`: Plus runs until then (null or past: Free). `hasPlus` / `planFor`
  (`apps/api/src/plus/plus.ts`) are the one check; the limits are `ROOM_PLANS` in
  `@connecta/shared/rooms`, kept in one place because they wait on the playtest.
- `GET /api/plus` and `plus` / `plusUntil` on `/api/me`. `POST /api/plus/dev { on }` gives a month
  of Plus or none for local testing (404 in production) until Stripe arrives.
- When Plus starts or ends, your tabs hear `plus` (your account and rooms refresh) and the game
  servers get `{ roomId: '*', type: 'plus' }` (your name tag); the join ticket carries `plus` too.
  A room's new limits reach its game server with the next join ticket.
- Pictures are capped by the uploader's plan when they start an upload (`too_big`, with `maxMb`);
  screen shares are captured at the room's plan height (720 or 1080).

## Coins and daily quests

**Status:** done (2026-11-23): quests and coins (part 1), the Shop's first set (part 2, approved in
the demo) and pets (part 3, built straight into the app at the owner's word). **Try it:** http://localhost:3100/home/shop
(the demo starts you with 1,240 coins).

- **Coins are earned, never bought.** Money only buys Plus. Coins buy cosmetics in the Shop
  (accessories ~200–400, outfits ~500–800, pets ~1,000–1,500: something new about once a week).
  Plus-only premium skins and pets come with Plus, never for coins; Plus earns no extra coins.
- **3 quests a day** (new at midnight, ~60 coins a day), one per group, so someone studying in a room
  with room-wide games off can still earn:
  - 📖 Focus: focus for 1 hour, finish 2 focus sessions
  - 💬 Together: 30 minutes in a room with others, say 5 things (bubbles or Room chat)
  - 🎲 Play: pet a cat 3 times, use the Buddy Machine, play any activity once
- **Quests must be simple to check:** each counts one event the server already sees (timer minutes,
  time with others in the room, messages, a pet, an activity's "round finished"). Never "with a
  friend" or "3 different people". Each pays once a day, so faking one gains almost nothing.
- Shown in the Shop and in 3D under My tools → 🎯 ("1/3"), with a toast when one's done. No weekly
  bonus and no streaks.
- **Your day:** quests start fresh at midnight in your own time zone (like the focus rankings).
  Each day's three are picked for you at random, one per group, from the seven above plus 🎲 "Play
  any activity once", and don't change during the day. New accounts start at 0 coins.
- **Who earns:** every account, in any room, a visitor on a guest pass too; anonymous guests don't.

### The Shop

- **Only things that really show on your character in every room**, built in code like the rest of
  the character (`features/avatar/character.ts`), listed with prices in `@connecta/shared/shop`:
  - Accessories (the one accessory slot): Bunny Ears 200, Bear Ears 200, Star Clips 220, Flower
    Crown 280, Halo 300, Witch Hat 380.
  - Outfits (a shape that takes your outfit colour, so each comes in every colour): Hoodie 500,
    Overalls 550, Raincoat 650 (with matching boots), Yukata 800.
- The free base set stays free: every hair and outfit colour, the sailor top, and the seven free
  accessories. Guests pick from it.
- **Try it on** shows the item on your own character; **Buy** takes the coins (final, no refunds);
  **Wear it** changes your look in every room. Cards say Owned ✓ or Wearing. What you own appears
  in Settings → My character (an Outfit row and more accessories).
- Tabs: Everything, Outfits, Accessories, Pets. "New this week" shows the newest item (Snowball
  for now; a real weekly drop waits for the admin site). On a phone the quests come after the items.
- Not now: photo frames, Plus-only items (until Plus), animals other than cats.

### Pets

- **A pet is a cat in a coat you can't summon at random**, with a little extra so it stands out:
  Midnight 1,000 (black, gold eyes, a star tag), Tux 1,200 (black and white, a bow tie), Siamese
  1,200 (cream with dark points, a bell collar), Snowball 1,000 (fluffy white, a pink bow). Other
  animals need their own models, so they wait.
- **You name it when you buy it** (its own name to start with, up to 16 characters). The Shop
  shows it up close, turning slowly.
- **It doesn't follow you around.** It's one of the room's cats: in the Buddy Machine, **Your pets**
  lists yours with **Bring out**; it rolls out in a capsule ("✨ Mai's cat Puff came to visit!") and
  then wanders, naps and follows whoever pets it like any cat. Its tag says "Puff · Mai's cat".
- **Only its owner sends it home** (others see no Goodbye on its row), and it goes home with them
  when they leave the room ("👋 Puff went home with Mai"), after the 20 s a dropped connection
  gets to come back.
- **Limits:** one of your pets out at a time; up to 4 pets in a room, on top of the 4 cats and 5
  study buddies. Bringing one out counts as using the Buddy Machine for the quest, and petting one
  counts as petting a cat. Guests own no pets.

### Coins and quests: backend notes

- The rules and the daily pick are `@connecta/shared/quests` (`questsFor(userId, day)`: a stable
  hash, so only progress is stored). The API's `src/quests` counts and pays; `GET
/api/quests/today` gives your three, their progress and your coins.
- **What counts:** the game server queues a `QuestEvent { userId, counts, amount, at }` on the
  `quest-events` queue for a bubble (`said`), a cat petted (`pets`), a summon that worked
  (`buddy`), a game played to its end, for everyone in its results (`played`), each minute you're
  in a room with someone else and not away (`roomMinutes`), and a focus round of 1+ minute
  (`focusMinutes`, plus `focusRounds` when it ran to its end). The API counts Room chat messages
  (`said`) itself; DMs don't count.
- **Paying once:** `quest_progress` (user, day, quest) holds progress; the update that first finds
  it done and unpaid sets `paid_at`, adds the coins to `users.coins` and writes a `coin_entries` row,
  all in one transaction. Your tabs hear `quest:done` (the toast) or `quests` (refresh) live.

## Prices

**Connecta Plus: ฿89 a month or ฿890 a year** (two months free, ≈ ฿74 a month). Outside Thailand: $2.99 / $29.

How we got there (redo it with real numbers after the playtest):

- **Floor, the fees:** Stripe takes about 3.65% + ฿10 per card payment and 1.65% for PromptPay
  (check current rates). The fixed ฿10 is what hurts: below about ฿69 a month, fees eat more than
  15%. From ฿89 we keep about ฿76 a month by card, ฿71 a month on yearly by card, and about ฿87 by PromptPay. VAT only
  starts above ฿1.8M a year.
- **Cost of a user:** almost all bandwidth. A free user (about 5 h of voice a month) costs about
  ฿1–2; a Plus owner (bigger rooms, 1080p sharing) about ฿15–25. Measure both in the playtest.
- **Ceiling, the market:** student subscriptions in Thailand mostly sit around ฿60–180; check
  Discord, Spotify and YouTube's current Thai prices before launch.
- **Break-even** at about 3% paying: around 3,000 monthly users. At this size the server bill and
  how many people subscribe matter more than the price.
- No student discount (nearly everyone is a student).

## Paying (Stripe)

**Two plans, any way to pay** (PromptPay packs were dropped: they looked like a different product).
How you pay is picked on the payment page:

- **Card:** renews by itself on the date.
- **PromptPay:** nobody can take money from PromptPay without you scanning, so it **renews by
  reminder**: 3 days before the date you get a new QR in the Inbox and by email (Stripe can send an
  invoice payable by PromptPay; check this for Thai accounts). Don't pay and Plus just ends, then the
  7-day grace, the same as a card that fails. Switch to a card any time to make it automatic.
- **Stripe's hosted Checkout:** we never see card details. Our page → Stripe → back to Connecta.
  Stripe sends receipts. Web only (no app store, no 30% cut).
- **Gift Plus:** a friend's "…" → Gift Plus → 1, 3 or 12 months, a note, card or PromptPay. They get
  a gift card in DMs and the Inbox. A gift adds on top of Plus they already have.
- **Cancel** any time in Settings → Plus & billing; Plus runs to the end of the paid period. Then the
  7-day grace.
- **Refunds:** no button. The team refunds real mistakes from the admin site (charged twice, a yearly
  renewal asked about within 48 hours, a bug), since a refused refund becomes a chargeback that
  costs more. Gifts can't be refunded once received.
- **Failed renewals:** Stripe retries 4 times over about two weeks and emails the person; Plus stays
  on meanwhile. After the last try Plus ends and the 7-day grace starts.

### Paying: backend notes

- **Stripe in one place:** `StripeGateway` (`apps/api/src/billing/stripe.gateway.ts`) makes the
  hosted Checkout (a card subscribes, renewing by itself; PromptPay pays once for the period) and
  checks the webhook's signature. It's off without `STRIPE_SECRET_KEY`: then `/checkout` is a test
  stand-in for Stripe's page and its Pay calls `POST /api/billing/checkout/:id/dev-pay` (404 in
  production and when Stripe is on).
- **Tables:** `checkouts` (one per Continue, paid once), `plus_subscriptions` (your plan, how you
  pay, whether it renews, Stripe's ids), `payments` (receipts; kept when an account is deleted,
  each with a unique `ref` so a notice delivered twice pays once). Paying moves `users.plus_until`
  on (from today, or on top of any Plus left).
- **Routes:** `GET /api/billing` (plan, date, renews, receipts, whether Stripe is on),
  `POST /api/billing/checkout { plan, method }` (Stripe's page, or null for the stand-in; 409
  `already_plus` while a plan renews), `POST /api/billing/cancel` and `/resume`, and
  `POST /api/billing/stripe-webhook` (no session; the signature is the proof).
- **Webhook events:** `checkout.session.completed` and `checkout.session.async_payment_succeeded`
  (PromptPay confirms a little later) pay the checkout; `invoice.paid` with `subscription_cycle`
  renews a card; `customer.subscription.updated` / `deleted` follow a cancel made at Stripe.
- **Your tabs** hear `plus` after any change, and refresh your account, billing and rooms.

### Setting up Stripe (the owner)

1. Make a Stripe account and stay in **test mode**. In Settings → Payment methods, turn on Cards
   and PromptPay (Thai accounts).
2. Copy the test secret key (`sk_test_…`) into `apps/api/.env` as `STRIPE_SECRET_KEY`.
3. Install the Stripe CLI and run `stripe listen --forward-to localhost:4000/api/billing/stripe-webhook`;
   put the `whsec_…` it prints in `STRIPE_WEBHOOK_SECRET`. Restart the API.
4. Pay with test card `4242 4242 4242 4242` (any future date, any CVC), or PromptPay's test QR.
   Production uses the live keys and a webhook endpoint made in Stripe's dashboard.

### In the demo (Stripe mocked)

Real Stripe (test mode first) comes with the backend; the demo fakes it:

- **Connecta Plus page** (`/home/plus`), laid out like Discord Nitro, Spotify and Duolingo's pages:
  a hero with your own character and Plus chips; the perks as picture cards (25 vs 100 people as
  dots, premium maps, skins and pets, 720p → 1080p, the animated name tag, 30 AI decks, 50 MB); two
  plan cards with **Yearly** marked "2 months free"; Gift Plus; "Compare Free and Plus" folded away;
  a short FAQ (friends don't need Plus, PromptPay, what happens if it ends, cancel, refunds); and the
  promises (never pay to win, no ads in rooms, joining is free, cancel any time).
- **Payment page** (`/checkout`): a stand-in for Stripe's hosted page with a "Demo" strip: card
  (test number filled in) or a PromptPay QR for every plan and gift, Pay → done → back to Connecta.
- **Settings → Plus & billing:** plan and date, Cancel Plus (with what happens next), Turn renewal
  back on, the card, receipts, gifts you sent, "charged by mistake? reply to the receipt email".
- **Gift Plus:** Friends → a friend's "…" → Gift Plus, or the Plus page. Mai's DM shows a received
  gift card; the Inbox has "Mai gifted you 1 month of Plus".
- **Plus-ending banner** on Home: when cancelled ("Keep Plus") and during grace ("Get Plus again").
- **Admin site → Money:** MRR, subscribers, Stripe fees, the server bill, gifts, failed payments; how
  people pay; every payment with **Refund…** and a reason (charged twice, renewed by mistake within
  48 h, a bug, something else).
- Demo tab → **Your Plus**: Plus / Cancelled / Ended · grace / Free.

## Architecture

**V1's design, kept:** one app server with Docker Compose behind nginx, RDS Postgres, no load
balancer, no autoscaling. V2 adds only what its features need, plus a separate monitoring server.
NEW marks what V1 didn't have.

```
 Users (browser)
   │  HTTPS / WSS                              │  UDP (voice, video, screen share)
   ▼                                           ▼
 Route 53 ──▶ App server: EC2 t4g.medium + Elastic IP (Docker Compose)
              ┌─────────────────────────────────────────────────────────┐
              │ nginx ─┬─ /            → web      (Next.js)             │
              │        ├─ /api/*       → api      (NestJS + jobs)       │
              │        ├─ /ws  NEW     → gateway  (NestJS WebSocket)    │
              │        ├─ game.*       → game     (Colyseus)            │
              │        └─ rtc.*        → livekit  (+ UDP ports)         │
              │ certbot · redis NEW · alloy · cAdvisor NEW              │
              └───┬───────────────┬──────────────────────┬──────────────┘
                  │ private       │ HTTPS out            │ private: scrape metrics, push logs
            RDS Postgres    S3 + CloudFront NEW     Monitoring server NEW: EC2 t4g.small
                            SES NEW · Stripe NEW    Prometheus · Loki · Grafana · Alertmanager
                            OpenAI NEW · OAuth NEW  no inbound from the internet
```

### Way in

| Part           | Job                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------- |
| **Route 53**   | DNS: the domain, `game.`, `rtc.`, NEW `files.` (CloudFront). `grafana.` is gone                    |
| **Elastic IP** | Fixed address for the app server                                                                   |
| **nginx**      | HTTPS, routing (WebSocket upgrades for `/ws`, `game.`, `rtc.`), hides `/metrics` and `/internal/*` |
| **certbot**    | Let's Encrypt certificates for nginx, renewed on a timer (a container)                             |

### App server: EC2 t4g.medium (arm64), Docker Compose

| Container        | Job                                                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **web**          | Next.js: Home, rooms, Discover, Shop, Plus, settings, the admin site (team accounts only)                                                                                  |
| **api**          | NestJS REST + OpenAPI client, owns the schema (Prisma migrations). NEW: sign-in (Google, Discord, email code), Stripe checkout and webhooks, signed upload links, AI decks |
| **api jobs** NEW | BullMQ workers in the api container: Plus expiry and grace, 30-day cleanup (Inbox, friend requests), email and webhook retries                                             |
| **gateway** NEW  | NestJS WebSocket: room chat, DMs, presence, typing, the Inbox's live push, Ask to join cards                                                                               |
| **game**         | Colyseus rooms: movement, seats, NPCs, activities, Common room rules                                                                                                       |
| **livekit**      | Self-hosted voice, video, screen share                                                                                                                                     |
| **redis** NEW    | Presence, rate limits, slow mode, report thresholds, Common room matchmaking, the job queue. Losable: no backups                                                           |
| **alloy**        | Ships container logs to Loki and exposes server metrics                                                                                                                    |
| **cAdvisor** NEW | Memory and CPU per container (tells us when t4g.medium is too small; t4g.large is a one-line change)                                                                       |

### Data

| Part                           | Holds                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **RDS Postgres** db.t4g.micro  | Everything lasting: accounts, rooms, maps, chat, DMs, friends, Shop, quests, focus, reports, audit log. NEW: subscriptions, gifts, the Inbox |
| **S3: deploy bundle**          | Compose and config files per deploy (V1)                                                                                                     |
| **S3 + CloudFront: files** NEW | Chat pictures, room thumbnails, banners. Uploaded straight to S3 with signed links                                                           |

### Outside services (NEW)

Stripe (payments), SES (sign-in codes, team emails; probably from Singapore), Google and Discord
OAuth, OpenAI's free moderation endpoint (text and pictures), OpenAI API (AI decks), YouTube embed
(Watch together, in the browser).

### Deploys and secrets (V1)

GitHub Actions (check → e2e → deploy on `main`), GitHub OIDC role, ECR (web, api, game, NEW gateway),
SSM Parameter Store (NEW: Stripe, OpenAI, OAuth secrets), SSM Run Command for `deploy.sh`, Terraform
(`bootstrap` and `app`, run by the owner only).

### Network and security

- VPC: public subnet for both servers, private subnets for RDS, no NAT.
- App server: 80, 443 and LiveKit's UDP open; metric ports open **only to the monitoring server**.
- Monitoring server: **nothing open to the internet**; Grafana through SSM port forwarding.
- RDS: only from the app server. IAM: the app server can read its SSM parameters and the bundle,
  NEW write to the files bucket and send with SES.

### How the browser reaches the backend

The browser only calls its own site: relative `/api` paths, so cookies work without CORS and one
build fits every environment ([decision](../decisions.md#engineering-and-infra)).

| From the browser | Local (`pnpm dev`)                                      | Production                               |
| ---------------- | ------------------------------------------------------- | ---------------------------------------- |
| Pages            | `localhost:3000`                                        | nginx → web                              |
| `/api/*`         | Next rewrite → `localhost:4000`                         | nginx → api                              |
| `/ws` (gateway)  | `localhost:4001` directly (Next can't proxy WebSockets) | nginx → gateway                          |
| Game, voice      | `localhost:2567`, `localhost:7880`                      | `game.`, `rtc.` subdomains               |
| Server rendering | `localhost:4000`, forwarding the cookie                 | `http://api:4000`, forwarding the cookie |

### Local stand-ins (Docker Compose)

| Production     | Local                                                                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| RDS Postgres   | Postgres 17 container                                                                                                                               |
| Redis, LiveKit | the same containers                                                                                                                                 |
| S3             | AWS Emulator (in memory; `pnpm db:seed` recreates the bucket); browser links go through `/api/dev-storage` ([04](04-chat-and-dms.md#backend-notes)) |
| SES            | Mailpit, an inbox at http://localhost:8025 (tests use the AWS Emulator)                                                                             |
| SSM parameters | `apps/api/.env`                                                                                                                                     |
| nginx          | the Next rewrite; the nginx config can run locally for a production-like check                                                                      |

## Monitoring on its own server (SRE practice)

Why: monitoring mustn't die with what it watches, neither side can starve the other, Grafana leaves
the public server, history survives rebuilds, and chaos drills become possible.

- **Monitoring server:** EC2 t4g.small, 20 GB disk with a weekly snapshot. Prometheus (15 days),
  Loki (14 days), Grafana, Alertmanager → Discord.
- **Metrics are pulled** over the private network, so a dead server shows as `up == 0`. **Logs are
  pushed** by Alloy.
- **Who watches the watcher:** an always-firing Watchdog alert pings a free dead man's switch
  (healthchecks.io); silence → email.
- **Outside both servers:** a Route 53 health check on the site and V1's CloudWatch alarms (server,
  database), both emailing through SNS.
- V1's SLOs and runbooks carry over; new runbook pages: "monitoring server down", "dead man's
  switch fired".

| Drill                      | Expect                                                  |
| -------------------------- | ------------------------------------------------------- |
| Stop the app server        | Target-down and the Route 53 check alert within ~2 min  |
| Stop the monitoring server | Dead man's switch emails within ~5 min; the app is fine |
| Kill the game container    | Container-down alert; it restarts by itself             |
| Fill the app disk to 90%   | Disk alert before anything breaks                       |
| Load test the API          | Latency SLO burn alert                                  |

## Cost (Bangkok, rough; check the AWS calculator)

| Part                                           | ≈ $ a day | ≈ $ a month |
| ---------------------------------------------- | --------- | ----------- |
| App server t4g.medium                          | 1.00      | 30          |
| Monitoring server t4g.small                    | 0.50      | 15          |
| RDS db.t4g.micro                               | 0.50      | 15          |
| 2 public IPv4 addresses                        | 0.25      | 7           |
| Disks (app 30 GB, monitoring 20 GB, RDS 20 GB) | 0.25      | 7           |
| S3, CloudFront, SES, Route 53, ECR, snapshots  | 0.15      | 5           |
| **Total while running**                        | **≈ 2.7** | **≈ 80**    |

- **A day ≈ $3, a week ≈ $19–20, a month ≈ $80**, plus usage: bandwidth beyond AWS's free 100 GB a
  month (≈ $0.09–0.12 per GB), Stripe fees, OpenAI decks.
- **Between playtests** `pnpm infra:down` destroys the stack (keeping the final database snapshot):
  ≈ $1–2 a month for the DNS zone, images and snapshots.

## Not now

Load balancer, autoscaling, Fargate or ECS, ElastiCache, Multi-AZ RDS, LiveKit on its own server, WAF.
Revisit when the playtest shows the app server or bandwidth is the limit.

- **The Shop:** `owned_items` (user, item) holds what you bought; `GET /api/shop/wardrobe` gives your
  coins and items, `POST /api/shop/items/:id/buy` buys (400 `not_enough_coins`, 409 when you have
  it). A buy takes the coins only if there are enough, writes a `-price` coin entry (`shop:<id>`) and
  adds the item in one transaction, so two buys at once never overspend.
- **A look only uses what you own:** sign-up, the guest pass and Settings all go through
  `ShopService.checkLook` (400 `not_owned`). **The game server takes looks only from the API**: a
  saved look goes out as a room event to every room (`{ roomId: '*', type: 'look' }`); there's no
  `look` message from the browser any more, so nobody can wear what they didn't buy.
- **Pets:** `owned_items.name` holds a pet's name (`POST /api/shop/items/:id/buy` takes `{ name }`;
  the wardrobe lists `pets`). The join ticket carries your pets, and a pet bought while you're in a
  room reaches the game servers as a `{ roomId: '*', type: 'pets' }` room event, so the game server
  only brings out pets the API vouched for (`pet:summon { item }`). A pet is an NPC with `owner` and
  `ownerName` set; it doesn't count toward the room's cats.
