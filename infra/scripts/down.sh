#!/usr/bin/env bash
# Tear the playtest stack down. Saves the feedback as CSV first; RDS also keeps a final snapshot.
#   pnpm infra:down
set -euo pipefail
cd "$(dirname "$0")/../.."
TF="terraform -chdir=infra/terraform/app"
export AWS_DEFAULT_REGION=ap-southeast-7

DOMAIN=$($TF output -json urls | python3 -c "import json,sys; print(json.load(sys.stdin)['app'].removeprefix('https://'))")
ADMIN=$($TF output -json passwords | python3 -c "import json,sys; print(json.load(sys.stdin)['admin'])")
SNAPSHOT=$($TF output -raw final_snapshot_on_destroy)

echo "==> Saving feedback"
mkdir -p infra/backups
JAR=$(mktemp)
OUT="infra/backups/feedback-$(date +%Y%m%d-%H%M).csv"
if curl -fsS -c "$JAR" -H 'Content-Type: application/json' -d "{\"password\":\"$ADMIN\"}" "https://game.$DOMAIN/admin/login" >/dev/null &&
  curl -fsS -b "$JAR" "https://game.$DOMAIN/admin/feedback.csv" -o "$OUT"; then
  echo "    $OUT ($(($(wc -l <"$OUT") - 1)) responses)"
else
  echo "    Could not download it (the final RDS snapshot still has everything)."
fi
rm -f "$JAR"

$TF destroy

echo
echo "==> Gone. To bring this data back next time, set in infra/terraform/app/terraform.tfvars:"
echo "    restore_snapshot_id = \"$SNAPSHOT\""
