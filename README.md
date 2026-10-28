# Demo Chanom Study Room

A 3D online study room: walk around a cosy library as an anime chibi character, sit at a desk, and study alongside other people in real time.

> The earlier **Agent HQ** prototype (Three.js + Vite AI-agent office) lives on the `agent-hq` branch.

## Stack

| Part | Tech |
|---|---|
| Web | Next.js 16 (App Router), React Three Fiber + drei, Tailwind CSS v4 |
| Real-time | Colyseus 0.18 (rooms, delta state sync), `@colyseus/sdk` |
| Shared | `@study/shared`: room layout, avatar looks, protocol types, constants |
| Coming next | LiveKit (voice + screen share), Drizzle + PostgreSQL (study stats), Terraform on AWS `ap-southeast-7` |

```
apps/
  web/     Next.js client: lobby (/) and the 3D room (/room?id=…)
  game/    Colyseus server: StudyRoom, lobby endpoint, smoke test and bots
packages/
  shared/  Code used by both apps
```

## Run it locally

Requirements: Node 22+, pnpm (`corepack enable pnpm`), Docker (for later phases).

```bash
pnpm install
pnpm dev                 # web on http://localhost:3000, game server on :2567
```

Useful extras:

```bash
pnpm --filter @study/game smoke   # end-to-end checks against a running game server
pnpm --filter @study/game bots 5  # five wandering test students
docker compose up -d              # Postgres (:5433) and LiveKit (:7880) for later phases
```

## How rooms work

- Joining is anonymous: pick a nickname and an outfit (kept in localStorage) and walk in. There are no accounts in this demo.
- Every room is public. `joinOrCreate` puts you in the first room with space; when a room reaches 20 people it locks and the next visitor gets a fresh one ("Library #2", …).
- The server is authoritative: it caps movement speed, keeps everyone inside the room, and checks seats (in reach, not taken) before letting anyone sit.
- Clients predict their own movement and send it at 15 Hz; other people are smoothed between 20 Hz state patches.

## Who's talking?

Everything a person says shows above their head:

- **• • •** while they have unsent text in the chat box (synced through the room state; it clears when they send, empty the box, or go quiet for 6 s)
- a speech bubble with their message for a few seconds after they send it
- a mic indicator while they speak (coming with voice chat)

## Controls

WASD / arrow keys to walk · Shift to run · E to sit or stand · Enter to chat · drag to orbit, scroll to zoom.

## Roadmap

1. ✅ Monorepo, Colyseus rooms with auto-sharding, 3D library, real-time movement, sitting, text chat
2. ✅ Anonymous join, typing indicator and speech bubbles above heads
3. Pomodoro (personal and room-wide), focus status above heads
4. LiveKit proximity voice (with a speaking indicator above heads) and desk screen sharing
5. Study stats, streaks, leaderboard, to-do list, ambient sound, real-time day/night
6. Terraform on AWS (EC2 + RDS + S3 in `ap-southeast-7`), CI/CD, Grafana stack and CloudWatch alarms
