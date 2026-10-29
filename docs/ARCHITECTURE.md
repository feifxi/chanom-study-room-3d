# Architecture

## Runtime today (local)

```
Browser ──HTTP──▶ web  (Next.js, :3000)  lobby /, room /room, analytics /admin
   │
   ├──WebSocket + HTTP──▶ game (Colyseus + express, :2567)
   │                        rooms, NPC simulation, /rooms, /stats, /leaderboard,
   │                        /feedback, /admin/*, /metrics, /health
   │                              │
   │                              └──▶ Postgres (:5433)  visitors, focus_sessions, visits, feedback
   │
   └──WebRTC──▶ LiveKit (:7880 signalling, 7881/tcp, 7882/udp media)
                  voice and screen share; tokens are issued by the game server

Observability (pnpm obs:up, localhost only)
  Prometheus :9090 ──scrapes──▶ game /metrics      Alertmanager :9093 ◀── alerts
  Alloy :12345 ──ships──▶ Loki    (apps/game/logs/game.log + every compose container)
  Grafana :3001 ── Prometheus, Loki, Alertmanager datasources; "Service overview" dashboard
```

- **The game server is the authority.** It validates movement (speed limit, bounds), seats, timers
  and runs the NPCs. Clients predict their own movement at 15 Hz and render everyone else from
  20 Hz state patches.
- **Postgres is optional.** Without `DATABASE_URL` rooms still work; stats, visits and feedback are
  off (and `/admin` says so).
- **The web app talks to the game server directly** (CORS with credentials for `/admin`).

## Target on AWS (`ap-southeast-7`)

```
Namecheap (registrar) ─ nameservers ─▶ Route 53
   <domain>, game.<domain>, rtc.<domain>, grafana.<domain> ─▶ Elastic IP
┌──────────────────────── VPC ────────────────────────┐
│ public subnet                                       │
│   EC2 t4g.medium · Docker Compose                   │
│     Caddy (TLS) → web, game, LiveKit, Grafana       │
│     Prometheus · Alertmanager · Loki · Alloy        │
│ private subnets (2 AZs)                             │
│   RDS PostgreSQL 17 · db.t4g.micro · backups        │
└─────────────────────────────────────────────────────┘
ECR (images, built by GitHub Actions via OIDC) · S3 (Terraform state)
SSM (deploys, shell, secrets) · CloudWatch alarms + Budgets → SNS email
External uptime check on /health
```

See [ROADMAP.md](ROADMAP.md#next-put-it-online-and-let-friends-play) for the steps.

## Code layout

```
apps/web/            Next.js 16 client
  src/app/           routes; lobby, room and admin render client-side only
  src/features/      room (3D scene, HUD, LocalPlayerDriver, session reducer), npc, chat, focus,
                     voice, feedback, admin, stats, todo, avatar, lobby
  e2e/               Playwright tests
apps/game/           Colyseus server
  src/rooms/         StudyRoom (handlers, join/leave) and pure rules
  src/npc/           NpcDirector (API), cat, buddy, motion
  src/admin/         admin auth (signed cookie) and the feedback/admin routes
  src/metrics.ts     Prometheus metrics, HTTP RED middleware, chaos switches
  src/log.ts         pino logger
  scripts/           smoke (WebSocket e2e), bots, load, stats-check
packages/shared/     protocol types, layout, navigation (A*), collisions, NPC and feedback types
packages/db/         Drizzle schema, migrations, stats and admin queries
ops/                 Prometheus, Alertmanager, Loki, Alloy, Grafana config; SRE guide
docs/                this file, the roadmap, the decision log
```

## Ports (local)

| Port        | Service                   |
| ----------- | ------------------------- |
| 3000        | web (Next.js dev)         |
| 2567        | game server               |
| 5433        | Postgres                  |
| 7880–7882   | LiveKit                   |
| 3001        | Grafana                   |
| 9090 / 9093 | Prometheus / Alertmanager |
| 12345       | Alloy UI                  |

## Environment variables

See [`.env.example`](../.env.example). Runtime variables only reach `pnpm dev` if they are listed
under `passThroughEnv` in `turbo.json` (Turborepo 2 drops undeclared ones).

| Variable                                       | Used by | Purpose                                                   |
| ---------------------------------------------- | ------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_GAME_URL`                         | web     | Where the game server is                                  |
| `PORT`, `WEB_ORIGIN`                           | game    | Listen port; the web origin allowed by CORS               |
| `DATABASE_URL`                                 | game    | Postgres (optional)                                       |
| `ADMIN_PASSWORD`                               | game    | Turns on `/admin` (dev default `chanom-dev`)              |
| `LIVEKIT_PUBLIC_URL`, `LIVEKIT_API_KEY/SECRET` | game    | Voice tokens                                              |
| `TRUST_PROXY`                                  | game    | Real client IPs behind Caddy (rate limits)                |
| `LOG_LEVEL`, `LOG_FILE`                        | game    | pino level; JSON log file for Alloy (dev)                 |
| `CHAOS_ERROR_RATE`, `CHAOS_LATENCY_MS`         | game    | Inject API failures / latency for drills (off by default) |
