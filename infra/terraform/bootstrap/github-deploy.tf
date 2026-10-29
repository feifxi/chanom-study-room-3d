# Continuous deployment from GitHub Actions without stored AWS keys: the workflow exchanges its
# OIDC token for short-lived credentials of this role. Lives in bootstrap so it survives the app
# stack's destroy/apply cycles. Only jobs in the repo's "playtest" environment can assume it.
variable "github_repo" {
  description = "owner/name of the GitHub repository allowed to deploy"
  type        = string
  default     = "feifxi/chanom-study-room-3d"
}

# GitHub now signs tokens with an "immutable" subject that also carries the owner and repo IDs
# (repo:owner@ownerId/name@repoId:...), so a deleted-and-recreated repo with the same name can't
# deploy. Look them up with: curl -s https://api.github.com/repos/<owner>/<name>/actions/oidc/customization/sub
variable "github_repo_ids" {
  description = "The repository's owner ID and repo ID, as in its OIDC subject"
  type        = object({ owner = number, repo = number })
  default     = { owner = 137422903, repo = 1438191155 }
}

data "aws_caller_identity" "current" {}

locals {
  region  = "ap-southeast-7"
  account = data.aws_caller_identity.current.account_id
  repo    = split("/", var.github_repo)
  # Both subject formats, exact match, playtest environment only
  github_subjects = [
    "repo:${var.github_repo}:environment:playtest",
    "repo:${local.repo[0]}@${var.github_repo_ids.owner}/${local.repo[1]}@${var.github_repo_ids.repo}:environment:playtest",
  ]
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "github_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.github_subjects
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name                 = "chanom-github-deploy"
  assume_role_policy   = data.aws_iam_policy_document.github_trust.json
  max_session_duration = 3600
}

# Exactly what infra/scripts/deploy.sh does: push images, sync the config bundle, run the deploy
# command on the playtest host, and read the (non-secret) deploy config.
data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid = "EcrPush"
    actions = [
      "ecr:BatchCheckLayerAvailability", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload", "ecr:PutImage", "ecr:BatchGetImage", "ecr:DescribeImages",
    ]
    resources = ["arn:aws:ecr:${local.region}:${local.account}:repository/chanom/*"]
  }
  statement {
    sid       = "BundleList"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::chanom-deploy-*"]
  }
  statement {
    sid       = "BundleWrite"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::chanom-deploy-*/bundle/*"]
  }
  statement {
    sid       = "DeployConfig"
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:${local.region}:${local.account}:parameter/chanom/deploy/config"]
  }
  statement {
    sid       = "RunDeployDocument"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ssm:${local.region}::document/AWS-RunShellScript"]
  }
  statement {
    sid       = "RunOnPlaytestHostOnly"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ec2:${local.region}:${local.account}:instance/*"]
    condition {
      test     = "StringEquals"
      variable = "ssm:resourceTag/Project"
      values   = ["chanom-study-room"]
    }
  }
  statement {
    sid       = "FollowCommands"
    actions   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations", "ssm:DescribeInstanceInformation"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "deploy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}

output "github_deploy_role_arn" {
  description = "Set as the GitHub Actions variable AWS_DEPLOY_ROLE_ARN"
  value       = aws_iam_role.github_deploy.arn
}
