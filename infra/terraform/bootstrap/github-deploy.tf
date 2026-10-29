# Continuous deployment from GitHub Actions without stored AWS keys: the workflow exchanges its
# OIDC token for short-lived credentials of this role. Lives in bootstrap so it survives the app
# stack's destroy/apply cycles. Only jobs in the repo's "playtest" environment can assume it.
variable "github_repo" {
  description = "owner/name of the GitHub repository allowed to deploy"
  type        = string
  default     = "feifxi/chanom-study-room-3d"
}

data "aws_caller_identity" "current" {}

locals {
  region  = "ap-southeast-7"
  account = data.aws_caller_identity.current.account_id
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
      values   = ["repo:${var.github_repo}:environment:playtest"]
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
