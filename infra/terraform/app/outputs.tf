output "urls" {
  value = {
    app     = "https://${var.domain}"
    admin   = "https://${var.domain}/admin"
    grafana = "https://grafana.${var.domain}"
  }
}

output "host_ip" {
  value = aws_eip.host.public_ip
}

output "instance_id" {
  value = aws_instance.host.id
}

output "registry" {
  value = local.registry
}

output "bundle_bucket" {
  value = aws_s3_bucket.bundle.bucket
}

output "name_servers" {
  description = "Must match the NS records at Namecheap (they come from the bootstrap delegation set)"
  value       = aws_route53_zone.main.name_servers
}

output "final_snapshot_on_destroy" {
  description = "Pass as restore_snapshot_id next time to keep the feedback and stats"
  value       = aws_db_instance.main.final_snapshot_identifier
}

output "passwords" {
  description = "terraform output -json passwords"
  sensitive   = true
  value = {
    admin   = random_password.admin.result
    grafana = random_password.grafana.result
  }
}
