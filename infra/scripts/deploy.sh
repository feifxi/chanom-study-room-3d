#!/usr/bin/env bash
# Deploy the current code to the running playtest stack: build and push the images, sync the
# configs, restart the containers over SSM, then check the site is healthy. No Terraform changes.
#   pnpm infra:deploy                  from this machine
#   deploy.sh --skip-if-down           from CI: exit 0 (nothing to do) when the stack isn't up
# Everything it needs comes from the /chanom/deploy/config SSM parameter that the app stack writes,
# so it works the same here and in GitHub Actions (no Terraform state needed).
set -euo pipefail
cd "$(dirname "$0")/../.."
export AWS_DEFAULT_REGION=ap-southeast-7

SKIP_IF_DOWN=""
[ "${1:-}" = "--skip-if-down" ] && SKIP_IF_DOWN=1

if ! CONFIG=$(aws ssm get-parameter --name /chanom/deploy/config --query Parameter.Value --output text 2>/dev/null); then
  if [ -n "$SKIP_IF_DOWN" ]; then
    echo "The playtest stack isn't up (no /chanom/deploy/config); nothing to deploy."
    exit 0
  fi
  echo "The stack isn't up. Run pnpm infra:up first."
  exit 1
fi
cfg() { python3 -c "import json,sys; print(json.loads(sys.argv[1])[sys.argv[2]])" "$CONFIG" "$1"; }
REGISTRY_HOST=$(cfg registry)
BUCKET=$(cfg bucket)
INSTANCE=$(cfg instance_id)
DOMAIN=$(cfg domain)

# Immutable tag per build: the commit (CI passes TAG), plus a timestamp for uncommitted local changes
if [ -z "${TAG:-}" ]; then
  TAG=$(git rev-parse --short HEAD)
  git diff --quiet HEAD || TAG="$TAG-dirty-$(date +%Y%m%d%H%M%S)"
fi

echo "==> Building and pushing images ($TAG)"
aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY_HOST" >/dev/null

# Safe to re-run: an image already in ECR is skipped (tags are immutable), and pushes are retried,
# because a large upload can drop on a flaky connection
build_and_push() { # <name> [docker build args...]
  local name=$1 image="$REGISTRY_HOST/chanom/$1:$TAG"
  shift
  if aws ecr describe-images --repository-name "chanom/$name" --image-ids "imageTag=$TAG" >/dev/null 2>&1; then
    echo "    chanom/$name:$TAG is already in ECR, skipping"
    return
  fi
  # No provenance/SBOM attestations: one manifest per image keeps ECR's image count and lifecycle simple
  docker build --platform linux/arm64 --provenance=false --sbom=false -f "apps/$name/Dockerfile" -t "$image" "$@" .
  for attempt in 1 2 3; do
    echo "    pushing chanom/$name:$TAG (attempt $attempt)"
    if docker push --quiet "$image"; then return; fi
    sleep 5
  done
  echo "Push of chanom/$name failed 3 times; check the connection and deploy again"
  exit 1
}
build_and_push api
build_and_push game
build_and_push web --build-arg "NEXT_PUBLIC_GAME_URL=https://game.$DOMAIN"

echo "==> Uploading configs"
# The bundle mirrors the repo layout, so relative paths in the compose file work the same on the host
aws s3 sync infra/compose "s3://$BUCKET/bundle/infra/compose" --delete --only-show-errors \
  --exclude ".env.prod" --exclude "README.md"
aws s3 sync infra/observability "s3://$BUCKET/bundle/infra/observability" --delete --only-show-errors \
  --exclude "alertmanager/secrets/*" --exclude "*.py" --exclude "README.md"

echo "==> Waiting for the host to be ready"
ready=""
for _ in $(seq 1 60); do
  STATUS=$(aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$INSTANCE" \
    --query 'InstanceInformationList[0].PingStatus' --output text 2>/dev/null || true)
  if [ "$STATUS" = "Online" ]; then
    CMD=$(aws ssm send-command --instance-ids "$INSTANCE" --document-name AWS-RunShellScript \
      --parameters 'commands=["test -f /opt/chanom/ready"]' --query Command.CommandId --output text)
    sleep 4
    if [ "$(aws ssm get-command-invocation --command-id "$CMD" --instance-id "$INSTANCE" --query Status --output text 2>/dev/null)" = "Success" ]; then
      ready=1
      break
    fi
  fi
  sleep 10
done
[ -n "$ready" ] || { echo "The host didn't become ready in 10 minutes; check it with: aws ssm start-session --target $INSTANCE"; exit 1; }

echo "==> Deploying"
CMD=$(aws ssm send-command --instance-ids "$INSTANCE" --document-name AWS-RunShellScript \
  --parameters "commands=[\"/opt/chanom/deploy.sh $TAG\"]" --timeout-seconds 900 --query Command.CommandId --output text)
aws ssm wait command-executed --command-id "$CMD" --instance-id "$INSTANCE" || true
RESULT=$(aws ssm get-command-invocation --command-id "$CMD" --instance-id "$INSTANCE" --query Status --output text)
aws ssm get-command-invocation --command-id "$CMD" --instance-id "$INSTANCE" \
  --query '{status: Status, output: StandardOutputContent, errors: StandardErrorContent}' --output yaml | tail -20
[ "$RESULT" = "Success" ] || { echo "The deploy command on the host failed ($RESULT)"; exit 1; }

echo "==> Checking the site"
healthy=""
for _ in $(seq 1 30); do
  if curl -fsS -m 5 "https://game.$DOMAIN/health" >/dev/null 2>&1 && curl -fsS -m 5 "https://$DOMAIN/api/health" >/dev/null 2>&1 &&
    curl -fsS -m 5 -o /dev/null "https://$DOMAIN/"; then
    healthy=1
    break
  fi
  sleep 5
done
[ -n "$healthy" ] || { echo "https://$DOMAIN, its API or its game server isn't healthy 2.5 minutes after the deploy"; exit 1; }

echo
echo "==> Deployed $TAG. App: https://$DOMAIN · Admin: https://$DOMAIN/admin · Grafana: https://grafana.$DOMAIN"
