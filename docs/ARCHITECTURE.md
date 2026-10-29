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

- **The game server is the authority.** It validates movement (a refilling speed budget, bounds),
  seats, timers and runs the NPCs. Clients predict their own movement and send it at 15 Hz with a
  sequence number; the server echoes the last one it applied (`moveSeq`) and the client reconciles
  against its prediction for that move (`features/room/reconcile.ts`). Everyone else is rendered
  from 20 Hz state patches.
- **Rendering is kept cheap.** Static furniture is merged into a few meshes (`StaticBatch`), the
  shadow map is drawn only when the light changes, characters use blob shadows, frames are capped
  at 60 fps and the pixel ratio at 1.5×; battery saver (`quality.ts`) drops to 30 fps, 1× and no
  shadows, and turns on by itself on slow devices.
- **Music is client-only**: static MP3s in `apps/web/public/music`, played per person.
- **Postgres is optional.** Without `DATABASE_URL` rooms still work; stats, visits and feedback are
  off (and `/admin` says so).
- **The web app talks to the game server directly** (CORS with credentials for `/admin`).

## On AWS (`ap-southeast-7`, up during playtests)

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
ECR (images: built on the Mac by infra:deploy, or by GitHub Actions via OIDC)
S3 (config bundle) · SSM (deploys, shell, secrets) · CloudWatch alarms + Budgets → SNS email
Terraform state stays local. Planned: an external uptime check on /health
```

See [ROADMAP.md](ROADMAP.md#online-the-aws-playtest-stack) for the steps.

## Code layout

```
apps/web/            Next.js 16 client
  src/app/           routes; lobby, room and admin render client-side only
  src/features/      room (3D scene, HUD, LocalPlayerDriver, session reducer), npc, chat, focus,
                     music, voice, feedback, admin, stats, todo, avatar, lobby
  public/music/      lo-fi tracks (Pixabay)
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
infra/terraform/     AWS: bootstrap (delegation set, once) and app (the playtest stack)
infra/compose/       production compose stack, Caddyfile, LiveKit config
infra/observability/ Prometheus, Alertmanager, Loki, Alloy, Grafana config; SRE guide
infra/scripts/       infra:up / infra:deploy / infra:down
.github/workflows/   ci-cd.yml: check, e2e, then deploy on main
compose.yaml         local dev dependencies (Postgres, LiveKit) and the monitoring stack
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
