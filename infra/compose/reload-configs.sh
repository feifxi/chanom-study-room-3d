#!/usr/bin/env bash
# Run on the host after every deploy (deploy.sh sends it over SSM). `docker compose up -d` only
# recreates containers whose definition changed, and the Caddyfile / Prometheus / Alertmanager /
# Alloy configs are bind-mounted folders: a changed file alone restarts nothing, and none of them
# watch it. (Folders, not single files: see the note on caddy in compose.prod.yaml.)
# Every step is a graceful reload (no restart, no gap); an invalid new config is refused, the old
# one keeps running and this script fails, so the deploy fails loudly.
set -euo pipefail
cd "${BUNDLE_DIR:-/opt/chanom/bundle}"
dc() { docker compose -f infra/compose/compose.prod.yaml --env-file infra/compose/.env.prod "$@"; }

# Open connections (WebSockets included) stay up
dc exec -T caddy caddy reload --config /etc/caddy/Caddyfile

# The monitoring images don't all ship an HTTP client, so ask from the Prometheus container
# (busybox wget). Prometheus needs --web.enable-lifecycle for its own endpoint.
for target in localhost:9090 alertmanager:9093 alloy:12345; do
  dc exec -T prometheus wget -q -O /dev/null --post-data='' "http://$target/-/reload"
  echo "reloaded $target"
done
