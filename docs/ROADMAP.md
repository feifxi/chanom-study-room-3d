# Roadmap

Where the project is, what comes next, and what's waiting in the backlog.
Last updated: 2026-10-29 (decisions for the AWS playtest settled).

## Done

| #   | Milestone              | What it brought                                                                                                                                                                                                    |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Multiplayer library    | Monorepo, Colyseus rooms that open a new one when full (20 people), 3D library, server-validated movement, sitting, text chat                                                                                      |
| 2   | Presence               | Anonymous join (nickname + outfit in localStorage), typing dots and speech bubbles above heads                                                                                                                     |
| 3   | Focus                  | Personal pomodoro; status and minutes focused above your head                                                                                                                                                      |
| 4   | Voice and screens      | LiveKit proximity voice with a speaking indicator; screen sharing visible only to your table (Zoom-style tiles)                                                                                                    |
| 5   | Stats                  | Focus minutes, streaks, leaderboards (Postgres), to-do list, real-time day/night                                                                                                                                   |
| 6   | Room friends           | Buddy Machine to summon cats and study buddies (server-simulated, A* pathfinding); join/leave lines in chat                                                                                                        |
| 7   | Maintainability        | Unit tests (Vitest), ESLint everywhere, Prettier, CI workflow, code split into small modules                                                                                                                       |
| 8   | UI and play            | Cosy palette (cream, strawberry-milk pink, cocoa) and Nunito; Connecta-style HUD (icon rail, dock, zoom); Auto/Day/Night switch; sofa seating; simpler Buddy Machine (summon + goodbye only); Playwright e2e tests |
| 9   | Feedback and analytics | "Before you go" rating card when leaving; `/admin` analytics (feedback, visitors) behind `ADMIN_PASSWORD`                                                                                                          |
| 10  | Observability (local)  | Prometheus, Loki + Alloy, Alertmanager, Grafana; three SLOs with multi-window burn-rate alerts; chaos switches; drills and runbooks in [infra/observability/README.md](../infra/observability/README.md)           |

## Next: put it online and let friends play

The goal is a link you can send to your friends, with feedback flowing into `/admin` and the
service watched by Grafana. Work in this order; each step ends with something you can check.

### 11.1 Decisions (settled 2026-10-29)

- [x] **Domain:** `studyroom.chanombude.me` (app), with `game.`, `rtc.` and `grafana.` under it.
- [x] **DNS:** keep `chanombude.me` at Namecheap and **delegate only `studyroom.chanombude.me` to
      Route 53** (4 NS records at Namecheap, once). The main domain's Namecheap email forwarding
      keeps working, and Terraform manages everything under the subdomain. $0.50/month.
- [x] **AWS access:** the `default` profile, IAM user `terraform-admin` (account 137219822132).
      Terraform v1.14 is installed. Region `ap-southeast-7`.
- [x] **Budget:** $20/month (about $50 of credits left). The app runs only during playtests
      (2–3 days to a week), then everything is removed with `terraform destroy`. Nothing is
      kept running or stopped in between.
- [x] **Alerts:** Alertmanager → Discord webhook. AWS-side alerts (Budgets, CloudWatch) go by
      email, because SNS can't post to Discord without extra glue.
- [x] **Database: RDS PostgreSQL 17 `db.t4g.micro`** (private subnet, automated backups).
      Managed backups and metrics, production-like to practise on. `terraform destroy` takes a
      **final snapshot** first, so the feedback and stats survive between playtests (and the next
      `up` can restore it); delete old snapshots when you no longer need them.
- [x] **Lifecycle: one stack, `up` → playtest → `destroy`.** No stop/start. Images are built on
      this Mac (it's arm64, like the server) and pushed to ECR during `up`, so no GitHub
      setup is needed for a playtest.

Cost (on-demand, ap-southeast-7, checked with the AWS Pricing API):

| Item                                      | Price                                    | 1 week running |
| ----------------------------------------- | ---------------------------------------- | -------------- |
| EC2 `t4g.medium` (4 GB, app + monitoring) | $0.0382/hour                             | $6.42          |
| RDS `db.t4g.micro` PostgreSQL, Single-AZ  | $0.023/hour                              | $3.86          |
| RDS storage gp3, 20 GB                    | $0.124/GB-month                          | $0.58          |
| EBS gp3 root, 30 GB                       | $0.0864/GB-month                         | $0.60          |
| Public IPv4 (Elastic IP)                  | $0.005/hour                              | $0.84          |
| Route 53 hosted zone                      | $0.50 per month it exists (not prorated) | $0.50          |
| ECR images, CloudWatch, Budgets           | cents                                    | ~$0.10         |
| Data transfer out                         | first 100 GB/month free                  | ~$0            |
| **Total**                                 |                                          | **≈ $12.9**    |

**After `terraform destroy`: ≈ $0.** The only leftover is the final RDS snapshot (a few cents a
month at this size). A 3-day playtest costs about $6.

### 11.2 Containers ✅ (2026-10-29, see [infra/compose/README.md](../infra/compose/README.md))

- [x] Dockerfiles for `web` (Next standalone, ~435 MB) and `game` (everything bundled by tsup, no
      `node_modules`, ~370 MB), arm64.
- [x] `infra/compose/compose.prod.yaml`: Caddy, web, game, LiveKit 1.13, Prometheus, Alertmanager,
      Loki, Alloy, Grafana (login required). Public ports: 80/443 and LiveKit 7881/tcp + 7882/udp.
- [x] Caddyfile: `$DOMAIN` → web, `game.` → game (`/metrics` not public), `rtc.` → LiveKit,
      `grafana.` → Grafana.
- [x] Checked locally with `DOMAIN=localhost`: all routes, joining over WSS, voice, metrics, logs.
- [ ] Not done: TURN. Voice needs UDP 7882 or TCP 7881; test on mobile data before the playtest.

### 11.3 Terraform ✅ written and planned (2026-10-29, see [infra/README.md](../infra/README.md)), not applied yet

- [x] `infra/terraform/bootstrap`: the reusable delegation set (plan: 1 resource).
- [x] `infra/terraform/app` (plan: 50 resources): VPC with a public and two private subnets, security
      groups, EC2 `t4g.medium` (AL2023 arm64, IMDSv2, SSM, no SSH) + Elastic IP, RDS PostgreSQL 17
      `db.t4g.micro` (encrypted, private, final snapshot on destroy, `restore_snapshot_id`), ECR
      (immutable tags, scan on push, keep 5), S3 config bundle, Route 53 zone + records, SSM
      SecureString secrets (all generated), CloudWatch alarms + SNS email, AWS Budget ($20,
      credits excluded).
- [x] `pnpm infra:up` / `pnpm infra:down` scripts.
- [ ] First real run: bootstrap apply → NS records at Namecheap → `infra:up` → playtest checks →
      `infra:down` → confirm nothing billable is left.

### 11.4 Deploys (optional for playtests)

- [ ] Later, once the repo is on GitHub: on `main`, run `pnpm check` + e2e, build arm64 images, push to ECR using
      **OIDC** (no stored AWS keys), then deploy with SSM Run Command
      (`docker compose pull && docker compose up -d`). Migrations already run when the game boots.
- [ ] Check: a commit to `main` reaches production in minutes; a bad deploy can be rolled back to
      the previous image tag.

### 11.5 Observability in production

- [ ] Grafana with real auth at `grafana.<domain>`; Prometheus scrapes `game:2567` on the compose
      network; Alloy reads container logs (pino JSON on stdout).
- [x] Alertmanager → Discord (wired locally; the webhook URL comes from a secret file / SSM).
- [ ] External uptime check (free UptimeRobot or Better Stack, both post to Discord) on `/health`,
      so you hear about it even when the whole host is down.
- [ ] Synthetic join probe: a small job that joins a room every minute, so matchmaking gets its own
      SLI (it isn't in the HTTP metrics today).

### 11.6 Launch checklist

- [x] Long random `ADMIN_PASSWORD`, Grafana password and LiveKit keys (generated by Terraform),
      `WEB_ORIGIN` set to the domain, `TRUST_PROXY=1` behind Caddy.
- [ ] Voice and screen share tested on mobile data and a strict Wi-Fi (TURN works).
- [ ] Load check: 20 bots in one room plus the HTTP load script; SLOs stay green.
- [x] Fresh database (no test visits or feedback): RDS starts empty.
- [x] The feedback card says what is stored (rating, comment, nickname, visit length, browser).

## Then: playtest with friends (1–2 weeks)

- Share the link; keep the group small at first.
- Once a week: read `/admin` (scores, comments, tags, visits) and the Grafana SLO panels; write
  down what to fix or build next.
- Practise SRE for real: any page-worthy incident gets a short postmortem
  ([template](../infra/observability/README.md#postmortem-template)).

## Backlog (decide after the feedback)

Product

- Music: Spotify playlist embed (easy, full songs only for logged-in Spotify users) or
  self-hosted royalty-free lo-fi (works for everyone, can play in sync for the room).
- Mobile / touch controls and a smaller HUD for phones.
- Quick reactions (emoji over your head), sit-together invites.
- Private rooms with an invite link; later, accounts (Better Auth) if people want history across
  devices.
- More NPC kinds for the Buddy Machine (e.g. a librarian owl), if friends enjoy them.

Engineering and SRE

- postgres-exporter and LiveKit metrics in Prometheus; an SLO for voice connection success.
- Recording-rule unit tests with `promtool test rules`.
- e2e: give each test its own room so they can run in parallel.
- Rate limits and presence are in memory (one game server); move to Redis if it ever needs more
  than one instance.

## Known gaps

- Matchmaking requests aren't in the HTTP SLIs (Colyseus serves them outside express); the
  synthetic probe above fixes this.
- `visitorId` comes from the browser and is trusted as-is; fine for anonymous stats, not for
  anything sensitive.
- The local database has visits and feedback from automated test runs; production starts clean.
- Three.js logs a few deprecation warnings (`THREE.Clock`); harmless for now.
