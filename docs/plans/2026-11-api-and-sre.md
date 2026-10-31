# Plan: API server (Hono) + SRE practices

Status: **approved 2026-10-31, not started.** Work through the phases in order; each phase is its
own commit, and the user reviews and pushes between phases. Tick items off here as they land.
Chosen by the user: API framework **Hono** (not Nest/Express/Fastify; Nest only if the backend team
grows past ~5 people). SRE items chosen: synthetic join, load test, error budget + postmortems,
graceful drain. Skipped for now: external uptime check, two game servers + Redis, Kubernetes.

## Context

- The game server (Colyseus + express) also serves the REST API: `/stats`, `/leaderboard`,
  `/feedback`, `/admin/*`. Every deploy restarts it and disconnects every room, and a slow admin
  query shares the event loop with movement.
- More (mostly CRUD) features are coming, and the user wants to practise SRE on this project:
  synthetic join probe, load test, error budget + postmortems, graceful drain. API framework: Hono.
- Findings that shape the plan:
  - `/admin/overview` reads live data from the game process (`matchMaker`, `presence`), so the API
    needs a small internal endpoint on the game server.
  - Every deploy tags all images with the git sha, so the game container is recreated on every
    deploy even when its code didn't change. Per-service, content-based tags fix that.
  - The host's deploy script is baked into EC2 user-data (changing it = terraform). Move the host
    logic into the synced bundle so it's versioned in the repo.
  - Colyseus 0.18 has `server.onBeforeShutdown()` and `Room.onBeforeShutdown()`.
  - Prometheus keeps 15 days and the stack is destroyed after each playtest, so the error budget
    window is "one playtest" (7 days), not 30 days.

## Phase 1 — API server `apps/api` (Hono) ~1.5–2 days

- Hono + `@hono/node-server` + `@hono/zod-validator`, pino logger, prom-client; port 2568
  (3001 is local Grafana). `basePath('/api')`.
- Feature folders with thin routes, framework-free services, repos on `@study/db`:
  `features/{stats,leaderboard,feedback,admin}/{routes,service}.ts`. Move admin auth (signed cookie,
  lockout) from `apps/game/src/admin/` with its tests (`app.request()` instead of supertest-style).
- Export `type AppType` so the web app uses the typed client `hc<AppType>('/api')`.
- Same metric names (`study_http_requests_total`, `study_http_request_duration_seconds`) plus a
  `service` label from the scrape job, so the existing SLO rules and dashboard keep working.
- Live data for `/admin/overview`: game server adds `GET /internal/live` (rooms, online, peak, NPCs);
  the API calls `http://game:2567/internal/live` with a 1 s timeout and shows "live data unavailable"
  if the game is down. Caddy returns 404 for `/internal/*` publicly.
- Migrations move to the API (owner of the schema); game `depends_on: api (healthy)`.
- Game server keeps `/rooms`, `/health`, `/metrics`, LiveKit tokens, focus/visit writes.
- Web: `lib/config.ts` gets `API_URL = '/api'` (same origin: no CORS, simpler admin cookie). Dev:
  Next `rewrites()` proxies `/api/*` → `localhost:2568` (check the Next 16 docs in node_modules first).
- Infra: `apps/api/Dockerfile` (tsup bundle like game), compose service `api` with healthcheck,
  Caddy `handle /api/* → api:2568` on the main domain, Prometheus job `api`, ECR repo `chanom/api`
  (terraform: **user runs apply**, +1 resource), `deploy.sh` builds/pushes api, turbo/README/docs.

## Phase 2 — Deploys that only restart what changed ~0.5 day

- Content-based image tags per service: hash of the files that go into the image
  (`git ls-tree HEAD apps/<x> packages/shared packages/db pnpm-lock.yaml | git hash-object --stdin`).
  Unchanged service → same tag → already in ECR (existing skip) → compose doesn't recreate it.
  `.env.prod` gets `GAME_TAG`, `WEB_TAG`, `API_TAG`.
- Host logic moves to `infra/scripts/host-deploy.sh` in the bundle; the SSM command becomes
  "sync bundle, run host-deploy.sh". The user-data script stays as a fallback (no terraform change).
- Order on the host: api → web → game last (only a game change triggers the drain).

## Phase 3 — Graceful drain for the game server ~1–1.5 days

- Server: on SIGTERM (Colyseus `onBeforeShutdown`), every room broadcasts
  `server:restarting {inSeconds: 15}`, locks itself, and after 15 s disconnects clients with close code 4010. Compose `stop_grace_period: 40s`. Log + metric `study_drains_total`.
- Client: banner "🔧 Updating the room — back in a moment"; on close code 4010 don't show the error
  state; poll `/health` until the new server answers, then `joinOrCreate` again with the same profile;
  re-send a running Pomodoro (phase, ends-at) so the status above your head survives (check how the
  personal timer is stored first). Chat history from before the restart is lost (accepted).
- Tests: game unit test for the drain sequence (fake clock); e2e: trigger a drain via a dev-only
  endpoint and assert the banner, then auto-rejoin.
- Honest limit: one game process means ~20 s of "updating" per game deploy; zero downtime would need
  the two-server + Redis setup (out of scope).

## Phase 4 — Synthetic join probe + join SLO ~1 day

- New small service `apps/probe` (Colyseus SDK): every 60 s join → wait for the first state →
  leave; records `probe_joins_total{result}`, `probe_join_duration_seconds` (histogram), serves
  `/metrics` on :9464; compose service + Prometheus job.
- Game server: join option `probe: true` → no Player in state, no chat join/leave lines, not counted
  in `study_joins_total`, visits, presence or `/admin` stats.
- New SLO in `gen_slo_rules.py`: "Join success — 99% of probe joins succeed within 3 s", burn-rate
  alerts like the others; Grafana panel. Chaos switch `CHAOS_JOIN_DELAY_MS` to drill the alert.
- Limit noted in the docs: the probe runs on the same host (it can't see a dead host — that's what an
  external uptime check is for, item 1, skipped for now).

## Phase 5 — Load test + capacity ~1 day + a run by the user

- Extend `apps/game/scripts/bots.ts` into a load tool: ramp profile (10 → 20 → 40 → 80 bots across
  rooms), realistic behaviour (walk, sit, chat, pomodoro), client-side report (join time, move ack
  RTT from `moveSeq`, patches/s).
- Server metrics for capacity: event loop lag/utilisation (prom-client defaults, check they're on),
  per-room patch/tick time, bytes sent; a "Capacity" Grafana dashboard.
- Run it locally against the prod compose stack (`DOMAIN=localhost`) and write
  `docs/CAPACITY.md` (method, results table, first bottleneck, "one t4g.medium holds ≈ N people").
  Running against AWS: a documented command **the user runs** when nobody is playing.

## Phase 6 — Error budget policy + postmortems ~0.5 day

- `docs/SLO-POLICY.md`: the four SLOs, the budget window = the playtest (7 days, within the 15-day
  retention), budget in requests/joins, what each alert severity means, the policy (>50% burned →
  reliability work first; 100% → no feature deploys until it recovers), review after each playtest.
- Recording rules + Grafana "Error budget" panel: budget remaining per SLO over the playtest window.
- `docs/postmortems/` with the template (moved from the observability README) and two real ones:
  playtest 1 rubber-banding + device heat; the CD OIDC subject failure.

## Order and checks

Phases 1 → 2 → 3 → 4 → 5 → 6 (each its own commit; the user reviews/pushes between phases).
Every phase: `pnpm check`, e2e with `CI=1`, game smoke; Phase 1–3 also a local run of the prod
compose stack (`DOMAIN=localhost`) to check Caddy routes, deploy order and the drain.

User-run steps: `terraform apply` for the `chanom/api` ECR repo (Phase 1), the AWS load-test run
(Phase 5), pushes.

Out of scope: external uptime check (item 1), two game servers + Redis (item 6), Kubernetes.
