# Infrastructure

Everything that runs the app. Code lives in `apps/` and `packages/`; local dev dependencies are in
[`compose.yaml`](../compose.yaml) at the repo root.

| Folder           | What                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `terraform/`     | AWS resources (below)                                                                                 |
| `compose/`       | The production Docker Compose stack, Caddyfile, LiveKit config ([README](compose/README.md))          |
| `observability/` | Prometheus, Alertmanager, Loki, Alloy, Grafana; SLOs and runbooks ([README](observability/README.md)) |
| `scripts/`       | `pnpm infra:up` / `infra:deploy` / `infra:down`                                                       |

## AWS overview

Region `ap-southeast-7`, domain `studyroom.chanombude.me` (delegated from Namecheap to Route 53).
The stack only exists during a playtest: `up` → play → `down`.

| Terraform root | Lifetime          | What                                                                                   |
| -------------- | ----------------- | -------------------------------------------------------------------------------------- |
| `bootstrap`    | once, kept (free) | Route 53 reusable delegation set (stable name servers) and the GitHub OIDC deploy role |
| `app`          | per playtest      | VPC, EC2 host, RDS, ECR, S3 config bundle, Route 53 zone, SSM secrets, alarms, budget  |

State is local and git-ignored (it contains the generated passwords). AWS credentials come from
the `default` profile.

Cost while up (on-demand, ap-southeast-7): about **$1.8 a day**, mostly EC2 `t4g.medium` and RDS
`db.t4g.micro`. After `down` it is about $0: only the final RDS snapshot remains (cents a month).

## One-time setup

1. Create the delegation set:
   ```bash
   cd infra/terraform/bootstrap && terraform init && terraform apply
   terraform output name_servers
   ```
2. At Namecheap → `chanombude.me` → **Advanced DNS**, add four **NS Record** rows with Host
   `studyroom` and each name server as the value. The main domain stays at Namecheap. Check with
   `dig +norecurse NS studyroom.chanombude.me @dns1.registrar-servers.com`.
3. `cp infra/terraform/app/terraform.tfvars.example infra/terraform/app/terraform.tfvars` and fill
   in the delegation set ID and your email (optionally a Discord webhook).

## A playtest

```bash
pnpm infra:up      # terraform apply (asks first), then deploy; ~10-15 min the first time (RDS)
pnpm infra:deploy  # code changes only: build and push images, sync configs, restart over SSM
pnpm infra:down    # saves feedback to infra/backups/*.csv, then terraform destroy
```

After `up`:

- App `https://studyroom.chanombude.me`, admin `/admin`, Grafana `https://grafana.studyroom.chanombude.me`
  (user `admin`).
- Passwords: `terraform -chdir=infra/terraform/app output -json passwords`.
- HTTPS certificates appear a minute or two after DNS resolves.
- Confirm the SNS email from AWS to get alarm emails.
- Shell on the host (no SSH):
  `aws ssm start-session --target $(terraform -chdir=infra/terraform/app output -raw instance_id)`.
- A deploy restarts the game server, so everyone rejoins a fresh room.

`down` prints the final RDS snapshot name. Put it in `terraform.tfvars` as `restore_snapshot_id` to
start the next playtest with the old stats and feedback.

## Continuous deployment

Every push to `main` runs `check` and `e2e`, then the **deploy** job runs `infra/scripts/deploy.sh`
on an arm64 GitHub runner. When the stack is down the job does nothing, so CI stays green.

- No AWS keys in GitHub: the job trades its OIDC token for the `chanom-github-deploy` role
  (bootstrap), which can only push to `chanom/*` in ECR, write the config bundle, read
  `/chanom/deploy/config` and run commands on this project's instance.
- Only jobs in the `playtest` environment can assume the role.
- Redeploy on demand: Actions → CI/CD → **Run workflow**.

Setup: apply bootstrap, then add the repository **variable** `AWS_DEPLOY_ROLE_ARN`
(`terraform -chdir=infra/terraform/bootstrap output -raw github_deploy_role_arn`; an ARN isn't a
secret), then run `pnpm infra:up` once so the stack writes `/chanom/deploy/config`.

**The role trusts the repo's numeric IDs.** GitHub signs tokens as
`repo:owner@ownerId/name@repoId:environment:playtest`, so a recreated repo (even with the same
name) can't deploy until bootstrap knows its new ID. Get it with
`curl -s https://api.github.com/repos/<owner>/<name>/actions/oidc/customization/sub`, put it in
`github_repo_ids` in `terraform/bootstrap/github-deploy.tf`, and apply bootstrap (1 change). The
same mismatch is the cause of `Not authorized to perform sts:AssumeRoleWithWebIdentity`.

## Checks

```bash
terraform fmt -recursive -check infra
terraform -chdir=infra/terraform/app validate
terraform -chdir=infra/terraform/app plan        # read-only
```

## Security notes

- Only 80/443 (Caddy) and LiveKit's 7881/tcp + 7882/udp are open. No SSH: shell and deploys go
  through SSM. IMDSv2 only. RDS is private and reachable only from the host.
- Secrets are generated by Terraform and stored as SSM SecureStrings; the host writes them into a
  `0600` env file at deploy time. They are also in the local state file, so keep it private.
- EBS, RDS storage and snapshots are encrypted. ECR scans images on push.
