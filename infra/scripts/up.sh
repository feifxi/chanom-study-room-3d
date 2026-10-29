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

exec bash infra/scripts/deploy.sh
