# Observability and SRE practice

Metrics, logs, SLOs and alerts for the study room, runnable on a laptop. The same configuration is
meant to move to the AWS host later.

> `/admin` in the app is **product analytics** (feedback, ratings, visitors).
> This stack is about **service health**: is it fast and reliable enough, and why not?

## Run it

```bash
pnpm obs:up     # Prometheus, Alertmanager, Loki, Alloy, Grafana (docker compose profile "observability")
pnpm dev        # the app; the game server writes JSON logs to apps/game/logs/game.log
pnpm obs:down   # stop the stack (data is kept in docker volumes)
```

| Tool         | URL                    | What for                                                  |
| ------------ | ---------------------- | --------------------------------------------------------- |
| Grafana      | http://localhost:3001  | Dashboard "Chanom Study Room · Service overview", Explore |
| Prometheus   | http://localhost:9090  | PromQL, targets, rules, alerts                            |
| Alertmanager | http://localhost:9093  | Firing alerts, grouping, silences, inhibition             |
| Alloy        | http://localhost:12345 | The log pipeline, component by component                  |

Generate traffic, because SLOs need some:

```bash
pnpm --filter @study/game load 8 10   # ~8 API requests/s for 10 minutes
pnpm --filter @study/game bots 6      # six wandering WebSocket players
```

## What is collected

**Metrics** (`GET :2567/metrics`, scraped every 15 s)

| Metric                                                      | Meaning                                                         |
| ----------------------------------------------------------- | --------------------------------------------------------------- |
| `study_http_requests_total{route,method,code}`              | API requests (route is the pattern, e.g. `/stats/:visitorId`)   |
| `study_http_request_duration_seconds{route,method}`         | API latency histogram (has a 0.3 s bucket for the latency SLO)  |
| `study_joins_total`                                         | Players who joined a room                                       |
| `study_disconnects_total{kind}`                             | `left`, `dropped`, `reconnected`, `timed_out` (never came back) |
| `study_players`, `study_rooms`                              | People online, rooms open                                       |
| `study_npc_tick_seconds`                                    | Time for one 10 Hz NPC simulation step                          |
| `study_feedback_total{rating}`, `study_chat_messages_total` | Product signals, handy for correlation                          |
| `study_game_*`                                              | Node.js runtime: event loop lag, heap, GC, CPU, memory          |

**Logs** (Loki, via Alloy)

- `{service="game"}`: the game server's pino JSON. `level` is a label; `room` is structured metadata.
- `{service="postgres"}`, `{service="livekit"}`, …: every container in this compose project.

Useful LogQL:

```logql
{service="game", level="error"}
{service="game"} | json | route="/feedback"
sum by (level) (count_over_time({service="game"}[5m]))
{service="game"} | json | seconds > 0.3          # slow requests, with their route
```

## SLOs

| SLO               | SLI (good events / all events)                      | Objective | Error budget (30 days) |
| ----------------- | --------------------------------------------------- | --------- | ---------------------- |
| API availability  | API requests that are not 5xx                       | 99.5%     | 0.5% of requests       |
| API latency       | API requests answered within 300 ms                 | 99%       | 1% of requests         |
| Session stability | Room sessions that don't end with a lost connection | 99%       | 1% of sessions         |

"API" means everything except `/metrics` and `/health`. Colyseus matchmaking is served outside
express, so it isn't in the HTTP metrics; whether joins work shows up in session stability instead.

The rules are generated: edit the table in `prometheus/gen_slo_rules.py`, then

```bash
python3 ops/prometheus/gen_slo_rules.py && curl -X POST localhost:9090/-/reload
```

Each SLO gets recording rules `slo:<name>:error_ratio_rate{5m,30m,1h,2h,6h,1d,3d}` and two
**multi-window, multi-burn-rate** alerts (Google SRE Workbook, "Alerting on SLOs"):

| Alert       | Severity | Fires when the error ratio is above…                       | Means                                                     |
| ----------- | -------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| `*FastBurn` | page     | 14.4× budget over 1h **and** 5m, or 6× over 6h **and** 30m | 2% / 5% of the month's budget gone in that hour / 6 hours |
| `*SlowBurn` | ticket   | 3× over 1d **and** 2h, or 1× over 3d **and** 6h            | On track to run out before the month ends                 |

The short window makes alerts stop quickly once the problem is fixed. Alertmanager **inhibits**
the ticket while the page for the same SLO is firing.

Plus two plain alerts: `GameServerDown` (scrape failing for 1 minute) and `EventLoopLagHigh`
(p99 lag above 100 ms for 5 minutes).

> Locally there are only hours of data, so "budget left" on the dashboard uses the 3-day window.
> With real traffic you would compute it over 30 days.

## Drills

Break things on purpose, then practise noticing, diagnosing and recovering. Write down what you
saw at each step; that's the raw material for a postmortem.

1. **Errors.** `CHAOS_ERROR_RATE=0.3 pnpm dev` and `pnpm --filter @study/game load 8 5`.
   Watch the availability stats turn red, the burn rate climb, `ApiAvailabilityFastBurn` fire in
   Prometheus, then reach Alertmanager (with `SlowBurn` inhibited). Find the failing requests in Loki.
   Restart without `CHAOS_*` and watch the alert resolve on its own (the 5-minute window).
2. **Slowness.** `CHAOS_LATENCY_MS=400 pnpm dev` plus load. The latency SLO burns while
   availability stays green, a reminder that "up" is not the same as "good".
3. **Server down.** Stop `pnpm dev`. `GameServerDown` fires after a minute. Is the lobby's
   "Can't reach the server" message a good user experience?
4. **Lost sessions.** Start `bots 6`, then kill them hard (`kill -9` the process). You'll see
   `dropped`, then `timed_out` 20 seconds later, and the session-stability SLO burns. Compare with
   stopping them nicely (Ctrl+C).
5. **Silence.** While an alert fires, add a 1-hour silence in Alertmanager for planned maintenance.
6. **Write a dashboard panel.** For example, joins per room, or the 5xx share per route. Export
   the JSON into `grafana/dashboards/` (or add it to `gen_dashboard.py`) so it survives a restart.
7. **Write a postmortem** for drill 1 using the template below.

## Runbooks

### API availability

- **Symptom:** a share of API requests return 5xx.
- **Check:** "Errors (5xx share)" and "Requests / s by route": one route or all of them? In Loki:
  `{service="game", level="error"} | json` shows the route and status.
- **Common causes:** the database is down (`/stats`, `/leaderboard`, `/feedback` fail; look at
  `{service="postgres"}`), a bad deploy, chaos left on (look for "CHAOS is on" in the logs).
- **Mitigate:** roll back, restart Postgres, or turn chaos off. Rooms keep working without the
  database.

### API latency

- **Symptom:** p95/p99 above 300 ms.
- **Check:** is it every route (event loop lag, CPU) or only database routes (slow queries)?
  `{service="game"} | json | seconds > 0.3` lists the slow ones.
- **Mitigate:** fewer bots or less load, look for a busy loop in the "Event loop lag" panel, add a
  database index.

### Session stability

- **Symptom:** many `timed_out` disconnects compared with joins.
- **Check:** do `dropped` and `timed_out` both spike (a network problem, or the server
  restarting), or only `dropped` with matching `reconnected` (blips that healed: fine)?
- **Mitigate:** if the server restarted, find out why in the logs. If people's networks are flaky,
  consider a longer reconnection window (`RECONNECT_SECONDS` in `StudyRoom.ts`).

### Game server down

- **Check:** `up{job="game"}` in Prometheus; is the process running? Is port 2567 taken? The last
  lines in `{service="game"}`.
- **Mitigate:** restart it. On AWS: `docker compose ps` / `logs` on the host via SSM.

### Event loop lag

- **Symptom:** players see others rubber-banding; NPCs stutter.
- **Check:** the "NPC tick time" and "CPU" panels. Many rooms or NPCs? A synchronous loop in a
  handler?
- **Mitigate:** reduce the load; profile with `node --cpu-prof`.

## Postmortem template

```markdown
# <date> <one-line summary>

**Impact:** who noticed what, for how long, how much error budget it used
**Timeline:** detection → diagnosis → mitigation → resolution (with times)
**Root cause:** the technical reason, and why it could happen
**What went well / what was hard:** alerts, dashboards, runbooks
**Action items:** owner and due date for each; prefer fixes that prevent a whole class of problem
```

## Moving to AWS

The same pieces run on the EC2 host next to the app containers. Differences:

- Grafana gets real authentication; nothing listens on public ports except through Caddy.
- Alloy collects the app containers' stdout (pino JSON in production) via the Docker socket
  instead of the dev log file.
- Prometheus scrapes `game:2567` on the compose network instead of `host.docker.internal`.
- Alertmanager gets a real receiver (email or a chat webhook), plus CloudWatch alarms and an
  external uptime check so you still hear about it if the whole host is down.
