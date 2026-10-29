# AWS-side safety nets. Service-level alerts (SLOs) come from Prometheus/Alertmanager → Discord.
resource "aws_sns_topic" "alerts" {
  name = "chanom-alerts"
}

# AWS emails a confirmation link after each apply; click it to start receiving alarms
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

locals {
  alarms = {
    host-status = { namespace = "AWS/EC2", metric = "StatusCheckFailed", stat = "Maximum", threshold = 0, op = "GreaterThanThreshold", periods = 2,
    dims = { InstanceId = aws_instance.host.id }, desc = "The host failed an EC2 status check" }
    host-cpu = { namespace = "AWS/EC2", metric = "CPUUtilization", stat = "Average", threshold = 80, op = "GreaterThanThreshold", periods = 3,
    dims = { InstanceId = aws_instance.host.id }, desc = "Host CPU above 80% for 15 minutes" }
    db-cpu = { namespace = "AWS/RDS", metric = "CPUUtilization", stat = "Average", threshold = 80, op = "GreaterThanThreshold", periods = 3,
    dims = { DBInstanceIdentifier = aws_db_instance.main.identifier }, desc = "Database CPU above 80% for 15 minutes" }
    db-storage = { namespace = "AWS/RDS", metric = "FreeStorageSpace", stat = "Minimum", threshold = 2147483648, op = "LessThanThreshold", periods = 1,
    dims = { DBInstanceIdentifier = aws_db_instance.main.identifier }, desc = "Database has less than 2 GB free" }
    db-connections = { namespace = "AWS/RDS", metric = "DatabaseConnections", stat = "Maximum", threshold = 60, op = "GreaterThanThreshold", periods = 2,
    dims = { DBInstanceIdentifier = aws_db_instance.main.identifier }, desc = "Unusually many database connections" }
  }
}

resource "aws_cloudwatch_metric_alarm" "this" {
  for_each            = local.alarms
  alarm_name          = "chanom-${each.key}"
  alarm_description   = each.value.desc
  namespace           = each.value.namespace
  metric_name         = each.value.metric
  statistic           = each.value.stat
  period              = 300
  evaluation_periods  = each.value.periods
  threshold           = each.value.threshold
  comparison_operator = each.value.op
  dimensions          = each.value.dims
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

# Real spend, credits excluded, so the alert means something while credits pay the bill
resource "aws_budgets_budget" "monthly" {
  name         = "chanom-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_types {
    include_credit = false
    include_refund = false
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}
