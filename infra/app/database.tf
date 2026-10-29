resource "aws_db_subnet_group" "main" {
  name       = "chanom"
  subnet_ids = aws_subnet.private[*].id
}

# A new name per stack, so every `terraform destroy` leaves its own final snapshot
resource "random_id" "final_snapshot" {
  byte_length = 3
}

resource "aws_db_instance" "main" {
  identifier          = "chanom"
  engine              = "postgres"
  engine_version      = "17"
  instance_class      = var.db_instance_class
  allocated_storage   = 20
  storage_type        = "gp3"
  storage_encrypted   = true
  snapshot_identifier = var.restore_snapshot_id # null = new, empty database

  db_name  = var.restore_snapshot_id == null ? "study" : null
  username = var.restore_snapshot_id == null ? "study" : null
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period    = 1
  auto_minor_version_upgrade = true
  apply_immediately          = true
  deletion_protection        = false

  # Feedback and stats survive `terraform destroy`
  skip_final_snapshot       = false
  final_snapshot_identifier = "chanom-final-${random_id.final_snapshot.hex}"
  copy_tags_to_snapshot     = true
}
