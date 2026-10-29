terraform {
  required_version = ">= 1.10"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
  # Local state on purpose: one person runs it and `destroy` leaves nothing to track.
  # It contains generated secrets, so it is git-ignored. Don't lose it while the stack is up.
}

provider "aws" {
  region = var.region
  default_tags {
    tags = { Project = "chanom-study-room", Stack = "app", ManagedBy = "terraform" }
  }
}
