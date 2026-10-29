data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

data "aws_iam_policy_document" "assume_ec2" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "host" {
  name_prefix        = "chanom-host-"
  assume_role_policy = data.aws_iam_policy_document.assume_ec2.json
}

# Shell and commands through SSM (no SSH), and pulling images from ECR
resource "aws_iam_role_policy_attachment" "host" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
  ])
  role       = aws_iam_role.host.name
  policy_arn = each.value
}

data "aws_iam_policy_document" "host" {
  statement {
    sid       = "ReadDeployBundle"
    actions   = ["s3:GetObject", "s3:ListBucket"]
    resources = [aws_s3_bucket.bundle.arn, "${aws_s3_bucket.bundle.arn}/*"]
  }
  statement {
    sid       = "ReadSecrets"
    actions   = ["ssm:GetParametersByPath", "ssm:GetParameter"]
    resources = ["arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/chanom/*"]
  }
}

resource "aws_iam_role_policy" "host" {
  name   = "chanom-host"
  role   = aws_iam_role.host.id
  policy = data.aws_iam_policy_document.host.json
}

resource "aws_iam_instance_profile" "host" {
  name_prefix = "chanom-host-"
  role        = aws_iam_role.host.name
}

data "aws_caller_identity" "current" {}

resource "aws_instance" "host" {
  ami                    = nonsensitive(data.aws_ssm_parameter.al2023_arm64.value)
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.host.id]
  iam_instance_profile   = aws_iam_instance_profile.host.name

  user_data = templatefile("${path.module}/user-data.sh.tftpl", {
    region   = var.region
    bucket   = aws_s3_bucket.bundle.bucket
    registry = local.registry
  })
  user_data_replace_on_change = true

  root_block_device {
    volume_type = "gp3"
    volume_size = 30
    encrypted   = true
  }

  metadata_options {
    http_tokens                 = "required" # IMDSv2 only
    http_put_response_hop_limit = 2          # containers can reach it too
  }

  tags = { Name = "chanom-host" }

  lifecycle {
    ignore_changes = [ami] # a newer AMI shouldn't replace a running playtest host
  }
}

resource "aws_eip" "host" {
  domain   = "vpc"
  instance = aws_instance.host.id
  tags     = { Name = "chanom-host" }
}
