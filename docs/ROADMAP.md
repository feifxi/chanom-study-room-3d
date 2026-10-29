# Roadmap

Where the project is, what comes next, and what's waiting in the backlog.
Last updated: 2026-10-29.

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
| 10  | Observability (local)  | Prometheus, Loki + Alloy, Alertmanager, Grafana; three SLOs with multi-window burn-rate alerts; chaos switches; drills and runbooks in [ops/README.md](../ops/README.md)                                           |

## Next: put it online and let friends play

The goal is a link you can send to your friends, with feedback flowing into `/admin` and the
service watched by Grafana. Work in this order; each step ends with something you can check.

### 11.1 Before starting (decisions and access needed from you)

- [ ] The domain name (registered at Namecheap).
- [ ] DNS: **move the nameservers to Route 53** (recommended, so Terraform manages records; about
      $0.50/month) or keep DNS at Namecheap and add A records by hand.
- [ ] AWS access for Terraform on this machine (an IAM user or SSO profile), region `ap-southeast-7`.
- [ ] A monthly budget to alert on (e.g. $80).
- [ ] Where alerts should go: email, Discord or a LINE relay.

### 11.2 Containers

- [ ] Dockerfiles: `apps/web` (Next standalone) and `apps/game` (tsup bundle), both for arm64.
- [ ] `docker-compose.prod.yml`: Caddy (TLS + reverse proxy), web, game, LiveKit (with TURN on
      443 for strict networks), and the observability stack.
- [ ] Caddyfile: `<domain>` → web, `game.<domain>` → game (WebSocket), `rtc.<domain>` → LiveKit,
      `grafana.<domain>` → Grafana (behind auth).
- [ ] Check: the whole production stack runs locally with `docker compose -f docker-compose.prod.yml up`.

### 11.3 Terraform (`infra/`)

- [ ] Remote state in S3 (with native state locking).
- [ ] Network: VPC, public subnet (EC2), two private subnets (RDS), security groups (80/443,
      LiveKit TCP 7881 + UDP; RDS only from EC2).
- [ ] EC2 `t4g.medium` + Elastic IP, IAM role (SSM, ECR pull, CloudWatch agent), no SSH (SSM only).
- [ ] RDS PostgreSQL 17 `db.t4g.micro`, private, 7-day automated backups.
- [ ] ECR repositories for `web` and `game`.
- [ ] Route 53 hosted zone and records.
- [ ] SSM Parameter Store for secrets: `ADMIN_PASSWORD`, `LIVEKIT_API_KEY/SECRET`, `DATABASE_URL`.
- [ ] CloudWatch alarms (instance status, CPU, disk, RDS storage/CPU) → SNS email; AWS Budgets alert.
- [ ] Check: `terraform plan` is clean; `terraform apply` builds the stack; tearing it down works too.

### 11.4 Deploys

- [ ] GitHub Actions: on `main`, run `pnpm check` + e2e, build arm64 images, push to ECR using
      **OIDC** (no stored AWS keys), then deploy with SSM Run Command
      (`docker compose pull && docker compose up -d`). Migrations already run when the game boots.
- [ ] Check: a commit to `main` reaches production in minutes; a bad deploy can be rolled back to
      the previous image tag.

### 11.5 Observability in production

- [ ] Grafana with real auth at `grafana.<domain>`; Prometheus scrapes `game:2567` on the compose
      network; Alloy reads container logs (pino JSON on stdout).
- [ ] Alertmanager receiver (email or chat webhook) for `page` and `ticket` alerts.
- [ ] External uptime check (free UptimeRobot or Better Stack) on `/health`, so you hear about it
      even when the whole host is down.
- [ ] Synthetic join probe: a small job that joins a room every minute, so matchmaking gets its own
      SLI (it isn't in the HTTP metrics today).

### 11.6 Launch checklist

- [ ] Long random `ADMIN_PASSWORD` (`openssl rand -base64 24`), real LiveKit keys, `WEB_ORIGIN`
      set to the domain, `TRUST_PROXY=1` behind Caddy.
- [ ] Voice and screen share tested on mobile data and a strict Wi-Fi (TURN works).
- [ ] Load check: 20 bots in one room plus the HTTP load script; SLOs stay green.
- [ ] Fresh database (no test visits or feedback).
- [ ] A one-line privacy note near the feedback card (anonymous, what is stored).

## Then: playtest with friends (1–2 weeks)

- Share the link; keep the group small at first.
- Once a week: read `/admin` (scores, comments, tags, visits) and the Grafana SLO panels; write
  down what to fix or build next.
- Practise SRE for real: any page-worthy incident gets a short postmortem
  ([template](../ops/README.md#postmortem-template)).

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
