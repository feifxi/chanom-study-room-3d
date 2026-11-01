# Infrastructure

Everything that runs the app lives here; the app code is in `apps/` and `packages/`.

| Folder           | What                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `terraform/`     | AWS resources (below)                                                                                        |
| `compose/`       | The production Docker Compose stack, Caddyfile, LiveKit config ([README](compose/README.md))                 |
| `observability/` | Prometheus, Alertmanager, Loki, Alloy, Grafana config, SLOs and runbooks ([README](observability/README.md)) |
| `scripts/`       | `pnpm infra:up` / `infra:deploy` / `infra:down`                                                              |

Local development dependencies are in [`compose.yaml`](../compose.yaml) at the repo root.

## Terraform

Two roots:

| Root                        | Lifetime                           | What                                                                                   |
| --------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| `infra/terraform/bootstrap` | once, forever (free)               | Route 53 reusable delegation set (stable name servers) and the GitHub OIDC deploy role |
| `infra/terraform/app`       | per playtest: `up` → play → `down` | VPC, EC2 host, RDS, ECR, S3 bundle, Route 53 zone, SSM secrets, alarms, budget         |

State is local and git-ignored (it contains the generated passwords). Region `ap-southeast-7`,
AWS credentials from the `default` profile. Costs and reasoning: [docs/ROADMAP.md](../docs/ROADMAP.md).

## One-time setup

1. Create the delegation set and note its name servers:
   ```bash
   cd infra/terraform/bootstrap && terraform init && terraform apply
   terraform output name_servers
   ```
2. At **Namecheap** → Domain List → `chanombude.me` → **Advanced DNS** → add four **NS Record**
   rows: Host `studyroom`, Value = each name server, TTL automatic. Nothing else changes: the main
   domain and its email forwarding stay at Namecheap.
   Check the delegation by asking Namecheap's own name server (a plain `dig NS studyroom.chanombude.me`
   stays empty until `infra:up` creates the zone; AWS answers REFUSED before that):
   ```bash
   dig +norecurse NS studyroom.chanombude.me @dns1.registrar-servers.com   # lists the four awsdns servers
   ```
3. `cp infra/terraform/app/terraform.tfvars.example infra/terraform/app/terraform.tfvars` and fill in the delegation
   set id and your email (optionally the Discord webhook).

## A playtest

```bash
pnpm infra:up     # terraform apply (shows the plan, asks), then the same steps as infra:deploy
                  # ~10-15 min the first time: RDS takes a while to create
pnpm infra:deploy # code changes only: build + push images, sync configs, restart over SSM (no Terraform)
pnpm infra:down   # saves feedback to infra/backups/*.csv, then terraform destroy (RDS keeps a final snapshot)
```

After `up`:

- App `https://studyroom.chanombude.me`, admin `/admin`, Grafana `https://grafana.studyroom.chanombude.me`.
- Passwords: `terraform -chdir=infra/terraform/app output -json passwords`.
- HTTPS certificates appear a minute or two after DNS resolves (Caddy keeps retrying).
- Click the confirmation link in the SNS email from AWS to get alarm emails.
- Shell on the host (no SSH): `aws ssm start-session --target $(terraform -chdir=infra/terraform/app output -raw instance_id)`.
- Redeploy after a code change: `pnpm infra:deploy` (a few minutes). Rooms live in the game server's memory, so everyone is disconnected for about a minute and rejoins a fresh room; that's accepted for a playtest.

To start the next playtest from the last one's data, put the snapshot name that `down` printed into
`terraform.tfvars` as `restore_snapshot_id`. Delete old snapshots in the RDS console when you no
longer need them.

## Continuous deployment

Every push to `main` runs CI (`check`, `e2e`) and then the **deploy** job, which runs the same
`infra/scripts/deploy.sh` as `pnpm infra:deploy` on a native arm64 GitHub runner. When the stack is
down it finishes without doing anything, so CI stays green between playtests.

- No AWS keys in GitHub: the job exchanges its OIDC token for the `chanom-github-deploy` role
  (in `bootstrap`), which can only push to `chanom/*` in ECR, write the config bundle, read
  `/chanom/deploy/config` and run commands on instances tagged `Project=chanom-study-room`.
- Only jobs in the repository's `playtest` environment can assume the role. Add required
  reviewers to that environment (Settings → Environments) if you want to approve each deploy.
- Redeploy on demand: Actions → CI/CD → **Run workflow** on `main`.

One-time setup:

1. `cd infra/terraform/bootstrap && terraform apply` (adds the OIDC provider and the role), then
   `terraform output github_deploy_role_arn`.
2. GitHub → Settings → Secrets and variables → Actions → **Variables** → New repository variable
   `AWS_DEPLOY_ROLE_ARN` = that ARN. (A variable, not a secret: the ARN isn't sensitive.)
3. `pnpm infra:up` once more so the app stack writes `/chanom/deploy/config`.

If the deploy job fails with `Not authorized to perform sts:AssumeRoleWithWebIdentity`, compare the
token's subject with the role's trust policy. GitHub signs newer repos with an immutable subject
(`repo:owner@ownerId/name@repoId:environment:playtest`); the role accepts both formats, with the IDs
in `github_repo_ids` (bootstrap). Check yours with
`curl -s https://api.github.com/repos/feifxi/chanom-study-room-3d/actions/oidc/customization/sub`.

### Moving to a new GitHub repo

GitHub signs this account's OIDC tokens with the repo's numeric ID, so a recreated repo (even with
the same name) can't assume the deploy role until bootstrap knows the new ID. Nothing is lost by
deleting the old repo except its Actions history: the code is local and no secrets live in GitHub.

1. Locally: `git status` is clean and `git branch` shows `main` and `agent-hq`.
2. Delete the old repo (Settings → Delete this repository). Create the new one **empty** (no README,
   .gitignore or license) and **public**: the arm64 deploy runner (`ubuntu-24.04-arm`) and Actions
   minutes are free only for public repos.
3. If the name changed: `git remote set-url origin https://github.com/<owner>/<name>.git`. Then
   `git push -u origin main agent-hq` (the deploy job skips until step 5).
4. Get the new IDs: `curl -s https://api.github.com/repos/<owner>/<name>/actions/oidc/customization/sub`
   → `repo:<owner>@<ownerId>/<name>@<repoId>`. Put them in `github_repo_ids` (and `github_repo` if
   the name changed) in `terraform/bootstrap/github-deploy.tf`, commit, then
   `terraform -chdir=infra/terraform/bootstrap apply` (expect 1 change: the role's trust policy).
5. Repo → Settings → Secrets and variables → Actions → **Variables**: `AWS_DEPLOY_ROLE_ARN` =
   `terraform -chdir=infra/terraform/bootstrap output -raw github_deploy_role_arn` (unchanged).
6. Actions → CI/CD → **Run workflow** on `main`; the deploy step should end with `==> Deployed …`.
   Optional: Settings → Environments → `playtest` with yourself as a required reviewer.

## Checks

```bash
terraform fmt -recursive -check infra
terraform -chdir=infra/terraform/app validate
terraform -chdir=infra/terraform/app plan        # read-only: lists what would be created
```

## Security notes

- Only 80/443 (Caddy) and LiveKit's 7881/tcp + 7882/udp are open. No SSH: shell and deploys go
  through SSM. IMDSv2 only. RDS is private and only reachable from the host's security group.
- Secrets are generated by Terraform and stored as SSM SecureStrings; the host writes them into a
  `0600` env file at deploy time. They are also in the local state file, so keep it private.
- EBS, RDS storage and snapshots are encrypted. ECR scans images on push.
