# Production stack

Everything runs on one host with Docker Compose: Caddy (HTTPS, routing), web, api, game, LiveKit
and the observability stack. The database is RDS on AWS (see [docs/ROADMAP.md](../docs/ROADMAP.md)).

| Hostname          | Service                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| `$DOMAIN`         | web (Next.js); `/api/*` goes to the API server (Hono)                           |
| `game.$DOMAIN`    | game server (WebSocket + `/rooms`; `/metrics` and `/internal/*` are not public) |
| `rtc.$DOMAIN`     | LiveKit signalling (media on 7881/tcp, 7882/udp)                                |
| `grafana.$DOMAIN` | Grafana (login: `admin` / `GF_ADMIN_PASSWORD`)                                  |

## Images

```bash
docker build -f apps/api/Dockerfile -t chanom/api:local .
docker build -f apps/game/Dockerfile -t chanom/game:local .
docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_GAME_URL=https://game.$DOMAIN -t chanom/web:local .
```

- **api** and **game**: tsup bundles each server and all its dependencies into `dist/`, so the
  images have no `node_modules`. The API runs the migrations at boot; the game container starts
  once the API is healthy.
- **web** (~467 MB): Next.js standalone output plus `public/` (the 16 MB of music, in its own
  early layer so it stays cached). The game server URL is baked in at build time.

## Try it on this machine

`DOMAIN=localhost` makes Caddy use its own local certificates, and Chrome resolves `*.localhost`
by itself.

```bash
cp infra/compose/.env.prod.example infra/compose/.env.prod   # then set DOMAIN=localhost and the values below
#   DATABASE_URL=postgres://study:study@host.docker.internal:5433/study  (the dev Postgres)
#   LIVEKIT_ARGS=--node-ip 127.0.0.1
docker compose stop livekit                     # the dev LiveKit uses the same ports
docker compose -f infra/compose/compose.prod.yaml --env-file infra/compose/.env.prod up -d --build
open https://localhost                          # accept the local certificate once
docker compose -f infra/compose/compose.prod.yaml --env-file infra/compose/.env.prod down -v
docker compose up -d livekit
```

Verified on 2026-10-29: every route through Caddy, `/metrics` hidden, admin needs a session,
joining a room over WSS, voice through LiveKit (track published), Prometheus scraping all
targets, container logs in Loki with levels.

## Known limits

- No TURN server yet: voice needs UDP 7882 or TCP 7881 to the host. Most home and mobile
  networks are fine; very strict networks (some offices, campuses) may not be. Test on a phone
  on mobile data before inviting people.
- One host, no redundancy: fine for a playtest.
