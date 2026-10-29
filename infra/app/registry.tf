locals {
  registry = split("/", aws_ecr_repository.app["web"].repository_url)[0]
}

resource "aws_ecr_repository" "app" {
  for_each             = toset(["web", "game"])
  name                 = "chanom/${each.key}"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = true # destroy removes the images too
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  for_each   = aws_ecr_repository.app
  repository = each.value.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 5 images"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 5 }
      action       = { type = "expire" }
    }]
  })
}

# The compose file and configs (deploy/ and ops/) that the host syncs at deploy time
resource "aws_s3_bucket" "bundle" {
  bucket_prefix = "chanom-deploy-"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "bundle" {
  bucket                  = aws_s3_bucket.bundle.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
