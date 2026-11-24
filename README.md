<div align="center">

# Connecta

**Cosy 3D rooms where friend groups and communities hang out, study and play together.**
Walk around as a chibi, sit down at a table, talk with proximity voice, and play together:
chess, card games, Draw & Guess, Pick a Side, watch together.

_Discord is a communication tool; this is a place._

<img src="apps/web/public/screenshot.png" alt="Friends hanging out in the Cosy Library" width="900">

</div>

## Status

Every feature is built except the map editor; nothing is deployed yet.

- [The docs](docs/README.md): roadmap, feature specs, decisions, guides

## Stack

Next.js 16 · React Three Fiber · Tailwind v4 · NestJS 12 · Prisma 7 · PostgreSQL · Redis ·
Colyseus · LiveKit · TypeScript · pnpm + Turborepo

## Getting started

Needs Node 24, pnpm 9 and Docker.

```bash
pnpm install
docker compose up -d
cp apps/api/.env.example apps/api/.env
cp apps/game/.env.example apps/game/.env
pnpm --filter @connecta/shared build && pnpm --filter @connecta/api generate
pnpm db:migrate && pnpm db:seed
pnpm dev          # web http://localhost:3000 · API http://localhost:4000/api/docs
```

Sign in with an email code; it lands in the local inbox at http://localhost:8025. The seed people
sign in as `<handle>@connecta.test`, for example `fei@connecta.test`.

Developers and coding agents: start at [`AGENTS.md`](AGENTS.md) for commands, layout and the
working agreements.
