#!/usr/bin/env bash
# Bring the playtest stack up (or change its infrastructure): terraform apply, then deploy the code.
#   pnpm infra:up            (Terraform shows the plan and asks before changing anything)
# For a code-only change, pnpm infra:deploy skips Terraform.
set -euo pipefail
cd "$(dirname "$0")/../.."
TF="terraform -chdir=infra/terraform/app"
export AWS_DEFAULT_REGION=ap-southeast-7

[ -f infra/terraform/app/terraform.tfvars ] || { echo "Create infra/terraform/app/terraform.tfvars first (see terraform.tfvars.example)"; exit 1; }

$TF init -input=false >/dev/null
$TF apply

bash infra/scripts/deploy.sh

DOMAIN=$($TF output -json urls | python3 -c "import json,sys; print(json.load(sys.stdin)['app'].removeprefix('https://'))")
echo "    Passwords: terraform -chdir=infra/terraform/app output -json passwords"
echo "    First apply? Click the confirmation link in the SNS email from AWS to get alarm emails."
echo "    Name servers the internet sees for $DOMAIN (must match: terraform -chdir=infra/terraform/app output name_servers):"
dig +short NS "$DOMAIN" | sed 's/^/      /'
