# Created ONCE and kept forever (costs nothing). A reusable delegation set fixes the four
# Route 53 name servers, so the NS records entered at Namecheap stay valid while the app stack
# (and its hosted zone) is destroyed and recreated for every playtest.
#
#   cd infra/terraform/bootstrap && terraform init && terraform apply
#   -> put the four name servers into Namecheap as NS records for host "studyroom"
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}

provider "aws" {
  region = "ap-southeast-7"
  default_tags {
    tags = { Project = "chanom-study-room", Stack = "bootstrap", ManagedBy = "terraform" }
  }
}

resource "aws_route53_delegation_set" "studyroom" {
  reference_name = "chanom-studyroom"

  lifecycle {
    prevent_destroy = true
  }
}

output "delegation_set_id" {
  description = "Pass to the app stack as delegation_set_id"
  value       = aws_route53_delegation_set.studyroom.id
}

output "name_servers" {
  description = "Add each as an NS record for host 'studyroom' in Namecheap (Advanced DNS)"
  value       = aws_route53_delegation_set.studyroom.name_servers
}
