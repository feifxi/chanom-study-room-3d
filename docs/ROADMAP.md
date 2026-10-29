# Roadmap

Where the project is, what comes next, and what's waiting in the backlog.
Last updated: 2026-10-30 (playtest 1 done and its fixes shipped to `main`; CI/CD setup in progress).

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
| 11  | AWS playtest           | Terraform stack (EC2 + RDS + Route 53), Caddy HTTPS, `infra:up/deploy/down`, CI/CD to the stack; playtest 1 with friends                                                                                           |
| 12  | Playtest 1 fixes       | Lighter rendering + battery saver, movement reconciliation (no rubber-banding), personal lo-fi player                                                                                                              |

## Online: the AWS playtest stack

Live at https://studyroom.chanombude.me since 2026-10-29 (playtest 1). Items still open are
unchecked below.

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

- [x] Dockerfiles for `web` (Next standalone + music, ~467 MB) and `game` (everything bundled by tsup, no
      `node_modules`, ~370 MB), arm64.
- [x] `infra/compose/compose.prod.yaml`: Caddy, web, game, LiveKit 1.13, Prometheus, Alertmanager,
      Loki, Alloy, Grafana (login required). Public ports: 80/443 and LiveKit 7881/tcp + 7882/udp.
- [x] Caddyfile: `$DOMAIN` → web, `game.` → game (`/metrics` not public), `rtc.` → LiveKit,
      `grafana.` → Grafana.
- [x] Checked locally with `DOMAIN=localhost`: all routes, joining over WSS, voice, metrics, logs.
- [ ] Not done: TURN. Voice needs UDP 7882 or TCP 7881; test on mobile data before the playtest.

### 11.3 Terraform ✅ applied (2026-10-29, see [infra/README.md](../infra/README.md))

- [x] `infra/terraform/bootstrap`: the reusable delegation set (plan: 1 resource).
- [x] `infra/terraform/app` (plan: 50 resources): VPC with a public and two private subnets, security
      groups, EC2 `t4g.medium` (AL2023 arm64, IMDSv2, SSM, no SSH) + Elastic IP, RDS PostgreSQL 17
      `db.t4g.micro` (encrypted, private, final snapshot on destroy, `restore_snapshot_id`), ECR
      (immutable tags, scan on push, keep 5), S3 config bundle, Route 53 zone + records, SSM
      SecureString secrets (all generated), CloudWatch alarms + SNS email, AWS Budget ($20,
      credits excluded).
- [x] `pnpm infra:up` / `pnpm infra:down` scripts.
- [x] First real run: bootstrap apply → NS records at Namecheap → `infra:up` → playtest checks
      (HTTPS, RDS, every route).
- [ ] After the playtest: `infra:down` → confirm nothing billable is left.

### 11.4 Deploys (2026-10-29)

- [x] `pnpm infra:deploy` for code-only changes (no Terraform); `infra:up` applies and then deploys.
- [x] CD written (`.github/workflows/ci-cd.yml`): after `check` and `e2e` pass on `main`, GitHub Actions deploys on a native arm64 runner
      using OIDC (no stored AWS keys), skips when the stack is down, and fails if the site isn't
      healthy afterwards. Setup in [infra/README.md](../infra/README.md#continuous-deployment).
- [ ] CD one-time setup: bootstrap apply (OIDC role), `AWS_DEPLOY_ROLE_ARN` variable in GitHub,
      `infra:up` once more (writes `/chanom/deploy/config`), first green deploy run.
- [ ] Rollback is "deploy the previous commit" (Actions → CI/CD → Run workflow, or `TAG=<old> pnpm infra:deploy`
      when that image is still in ECR).

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

## During playtests

- Share the link; keep the group small at first.
- Once a week: read `/admin` (scores, comments, tags, visits) and the Grafana SLO panels; write
  down what to fix or build next.
- Practise SRE for real: any page-worthy incident gets a short postmortem
  ([template](../infra/observability/README.md#postmortem-template)).

## Playtest 1 results (2026-10-29)

Played with a group of friends on the AWS stack; every feature worked.

- **What they loved:** talking and hanging out together. "Like Discord, but you can walk around."
  The 3D cosy room makes meeting up cuter and more fun than a voice channel. They already use
  Discord daily, so this is the comparison that matters.
- **What they want next:** more things to do together (activities), beyond studying.
- **Problems:**
  1. Performance: it sometimes lags, and some devices got hot with high CPU use.
  2. On a bad connection, walking gets pulled back to where you were (rubber-banding).
- **Asked for:** lo-fi music in the room.

Fixed after the playtest (2026-10-29):

- Performance: static furniture merged (651 → ~156 draw calls a frame), shadow map drawn once
  instead of every frame, characters use blob shadows, 60 fps cap, 1.5× max pixel ratio, and a
  🍃 battery saver (30 fps, 1×, no shadows) that turns on by itself on struggling devices.
- Rubber-banding: moves carry a sequence number and the client reconciles against the server's
  acknowledged move instead of snapping on drift; the server's speed limit is a refilling budget,
  so late bursts aren't dropped. Simulated 500–700 ms lag: 5 pull-backs (up to 1.5 m) before, 0 after.
- Music: a personal lo-fi player (4 royalty-free Pixabay tracks by Alex Morgan, ‹ › to switch), quieter while
  people talk.

Takeaway: the product is a cosy hangout space as much as a study room. With both problems fixed,
**activities are the next big theme**; mobile support is built (see the backlog item for what is left).

## Backlog (decide after the feedback)

Product

- **Activities to do together** (top request from playtest 1): ideas to explore include mini-games
  at a table, a shared whiteboard, watch-together on the room screen, a quiz, emotes and dances.

- Music, later: a shared "room radio" (everyone hears the same track in sync, via the server);
  more tracks would move to S3 + CloudFront instead of the web image.
- **Mobile support** (built 2026-10-30, both orientations; not yet tried on real phones):
  - [x] A joystick to walk and an action button instead of E. (Tap-to-walk was built and then
        removed to keep things simple; the joystick covers it.)
  - [x] Small-screen HUD: header and top-right compacted, the rail along the top with the Pomodoro
        in it, chat as a sheet (closed at first), icon-only dock, zoom by pinch.
  - [x] Phones start in battery saver; screen share is hidden where the browser can't share.
  - [x] e2e on a phone profile: joystick, sit and stand with the action button, no zoom buttons.
  - [ ] Try on a real iPhone and Android: heat, iOS Safari mic permission and the "Hear room"
        audio unlock, notch safe areas, TURN on mobile data (see 11.2).
  - [ ] A badge on the chat button for new messages while the sheet is closed.
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
