# Every secret is generated here and stored in SSM Parameter Store (/chanom/...). The host reads
# them at deploy time; nothing secret is in git. They also live in the (git-ignored) state file.
resource "random_password" "db" {
  length  = 32
  special = false # goes into a URL
}

resource "random_password" "admin" {
  length  = 24
  special = false
}

resource "random_password" "grafana" {
  length  = 24
  special = false
}

resource "random_password" "livekit_secret" {
  length  = 48
  special = false
}

resource "random_id" "livekit_key" {
  byte_length = 8
}

locals {
  database_url = "postgres://study:${random_password.db.result}@${aws_db_instance.main.address}:5432/study?sslmode=require"
  # Everything the production compose file needs, minus the image tag (set per deploy).
  # No empty values: SSM rejects them (LIVEKIT_ARGS stays unset in production).
  app_env = {
    DOMAIN             = var.domain
    REGISTRY           = "${local.registry}/chanom" # image = $REGISTRY/web:$TAG, like chanom/web locally
    DATABASE_URL       = local.database_url
    ADMIN_PASSWORD     = random_password.admin.result
    GF_ADMIN_PASSWORD  = random_password.grafana.result
    LIVEKIT_API_KEY    = "chanom${random_id.livekit_key.hex}"
    LIVEKIT_API_SECRET = random_password.livekit_secret.result
  }
}

resource "aws_ssm_parameter" "env" {
  for_each = nonsensitive(toset(keys(local.app_env)))
  name     = "/chanom/env/${each.key}"
  type     = "SecureString"
  value    = local.app_env[each.key]
}

resource "aws_ssm_parameter" "discord_webhook" {
  count = var.discord_webhook_url == "" ? 0 : 1
  name  = "/chanom/discord_webhook_url"
  type  = "SecureString"
  value = var.discord_webhook_url
}
