variable "region" {
  type    = string
  default = "ap-southeast-7"
}

variable "domain" {
  description = "Public hostname; game., rtc. and grafana. are created under it"
  type        = string
  default     = "studyroom.chanombude.me"
}

variable "delegation_set_id" {
  description = "From infra/bootstrap (keeps the Route 53 name servers stable)"
  type        = string
}

variable "alert_email" {
  description = "Gets AWS Budget and CloudWatch alarm emails (confirm the SNS subscription email after each apply)"
  type        = string
}

variable "instance_type" {
  type    = string
  default = "t4g.medium"
  validation {
    condition     = startswith(var.instance_type, "t4g.") || startswith(var.instance_type, "m7g.") || startswith(var.instance_type, "c7g.")
    error_message = "Use an arm64 (Graviton) instance: the images are built for arm64."
  }
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "restore_snapshot_id" {
  description = "Start the database from this RDS snapshot (e.g. the final snapshot of the last playtest); null for an empty database"
  type        = string
  default     = null
}

variable "monthly_budget_usd" {
  type    = number
  default = 20
}

variable "discord_webhook_url" {
  description = "Alertmanager posts alerts here; leave empty to skip"
  type        = string
  default     = ""
  sensitive   = true
}
