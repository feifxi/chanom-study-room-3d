# 15. Business and infra

**Status:** decided; payments are mocked in the demo. **Try it:** http://localhost:3100/home/plus,
`/checkout?plan=yearly`, and `/admin/money` (View as Connecta team). V1's infra:
[`infra/README.md`](../../../infra/README.md).

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

## Coins and daily quests

- **Coins are earned, never bought.** Money only buys Plus. Coins buy cosmetics in the Shop
  (accessories ~200–400, outfits ~500–800, pets ~1,000–1,500: something new about once a week).
  Premium skins and pets come with Plus, never for coins; Plus earns no extra coins.
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

**V1's design, kept:** one app server with Docker Compose behind Caddy, RDS Postgres, no load
balancer, no autoscaling. V2 adds only what its features need, plus a separate monitoring server.
NEW marks what V1 didn't have.

```
 Users (browser)
   │  HTTPS / WSS                              │  UDP (voice, video, screen share)
   ▼                                           ▼
 Route 53 ──▶ App server: EC2 t4g.medium + Elastic IP (Docker Compose)
              ┌─────────────────────────────────────────────────────────┐
              │ Caddy ─┬─ /            → web      (Next.js)             │
              │        ├─ /api/*       → api      (NestJS + jobs)       │
              │        ├─ /ws  NEW     → gateway  (NestJS WebSocket)    │
              │        ├─ game.*       → game     (Colyseus)            │
              │        └─ rtc.*        → livekit  (+ UDP ports)         │
              │ redis NEW · alloy · cAdvisor NEW                        │
              └───┬───────────────┬──────────────────────┬──────────────┘
                  │ private       │ HTTPS out            │ private: scrape metrics, push logs
            RDS Postgres    S3 + CloudFront NEW     Monitoring server NEW: EC2 t4g.small
                            SES NEW · Stripe NEW    Prometheus · Loki · Grafana · Alertmanager
                            OpenAI NEW · OAuth NEW  no inbound from the internet
```

### Way in

| Part           | Job                                                                             |
| -------------- | ------------------------------------------------------------------------------- |
| **Route 53**   | DNS: the domain, `game.`, `rtc.`, NEW `files.` (CloudFront). `grafana.` is gone |
| **Elastic IP** | Fixed address for the app server                                                |
| **Caddy**      | HTTPS with automatic certificates, routing, hides `/metrics` and `/internal/*`  |

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

Load balancer, autoscaling, Fargate or ECS, ElastiCache, Multi-AZ RDS, LiveKit on its own server, WAF,
Azure. Revisit when the playtest shows the app server or bandwidth is the limit.
