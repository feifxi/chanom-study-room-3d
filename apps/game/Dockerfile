# Game server image. Build from the repo root:
#   docker build -f apps/game/Dockerfile -t chanom/game .
# tsup bundles the server and every dependency into dist/, so the runtime needs no node_modules.
FROM node:24-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @study/game...
RUN pnpm --filter @study/game build

FROM node:24-bookworm-slim AS run
ENV NODE_ENV=production PORT=2567 MIGRATIONS_DIR=/app/drizzle
WORKDIR /app
COPY --from=build /repo/apps/game/dist ./dist
COPY --from=build /repo/packages/db/drizzle ./drizzle
RUN echo '{"type":"module"}' > package.json
USER node
EXPOSE 2567
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s CMD node -e "fetch('http://127.0.0.1:2567/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/index.js"]
