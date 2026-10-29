#!/usr/bin/env bash
# Bring the playtest stack up: terraform apply, build and push the images, deploy over SSM.
#   pnpm infra:up            (Terraform shows the plan and asks before changing anything)
set -euo pipefail
cd "$(dirname "$0")/../.."
TF="terraform -chdir=infra/terraform/app"
export AWS_DEFAULT_REGION=ap-southeast-7

[ -f infra/terraform/app/terraform.tfvars ] || { echo "Create infra/terraform/app/terraform.tfvars first (see terraform.tfvars.example)"; exit 1; }

$TF init -input=false >/dev/null
$TF apply

REGISTRY_HOST=$($TF output -raw registry)
BUCKET=$($TF output -raw bundle_bucket)
INSTANCE=$($TF output -raw instance_id)
DOMAIN=$($TF output -json urls | python3 -c "import json,sys; print(json.load(sys.stdin)['app'].removeprefix('https://'))")
# Immutable tag per build: the commit, plus a timestamp when there are uncommitted changes
TAG=$(git rev-parse --short HEAD)
git diff --quiet HEAD || TAG="$TAG-dirty-$(date +%Y%m%d%H%M%S)"

echo "==> Building and pushing images ($TAG)"
aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY_HOST" >/dev/null
docker build --platform linux/arm64 -f apps/game/Dockerfile -t "$REGISTRY_HOST/chanom/game:$TAG" .
docker build --platform linux/arm64 -f apps/web/Dockerfile --build-arg "NEXT_PUBLIC_GAME_URL=https://game.$DOMAIN" \
  -t "$REGISTRY_HOST/chanom/web:$TAG" .
docker push --quiet "$REGISTRY_HOST/chanom/game:$TAG"
docker push --quiet "$REGISTRY_HOST/chanom/web:$TAG"

echo "==> Uploading configs"
# The bundle mirrors the repo layout, so relative paths in the compose file work the same on the host
aws s3 sync infra/compose "s3://$BUCKET/bundle/infra/compose" --delete --only-show-errors \
  --exclude ".env.prod" --exclude "README.md"
aws s3 sync infra/observability "s3://$BUCKET/bundle/infra/observability" --delete --only-show-errors \
  --exclude "alertmanager/secrets/*" --exclude "*.py" --exclude "README.md"

echo "==> Waiting for the host to finish its first boot"
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
aws ssm get-command-invocation --command-id "$CMD" --instance-id "$INSTANCE" \
  --query '{status: Status, output: StandardOutputContent, errors: StandardErrorContent}' --output yaml | tail -20

echo
echo "==> Done. App: https://$DOMAIN · Admin: https://$DOMAIN/admin · Grafana: https://grafana.$DOMAIN"
echo "    Passwords: terraform -chdir=infra/terraform/app output -json passwords"
echo "    Name servers the internet sees for $DOMAIN (must match: terraform -chdir=infra/terraform/app output name_servers):"
dig +short NS "$DOMAIN" | sed 's/^/      /'
echo "    First apply? Click the confirmation link in the SNS email from AWS to get alarm emails."
