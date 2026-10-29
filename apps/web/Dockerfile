# Web (Next.js standalone) image. The game server URL is baked in at build time:
#   docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_GAME_URL=https://game.example.com -t chanom/web .
FROM node:24-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

FROM base AS build
ARG NEXT_PUBLIC_GAME_URL
ENV NEXT_PUBLIC_GAME_URL=$NEXT_PUBLIC_GAME_URL
COPY . .
RUN pnpm install --frozen-lockfile --filter @study/web...
RUN pnpm --filter @study/web build

FROM node:24-bookworm-slim AS run
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
