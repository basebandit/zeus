variable "aws_region" {
  description = "AWS region for the provider."
  type        = string
  default     = "eu-central-1"
}

variable "aws_profile" {
  description = "AWS CLI/SSO profile for the management account."
  type        = string
  default     = "bootstrap_admin"
}

variable "management_account_id" {
  description = "Expected management account ID. Guards against applying with wrong credentials."
  type        = string
  default     = "060309844053"
}

# Must be the local part of an inbox you control e.g. <account_email_prefix>@gmail.com
variable "account_email_prefix" {
  type = string
}

variable "organization_monthly_budget_usd" {
  description = "Monthly AWS cost budget threshold for the organization."
  type        = number
}

variable "budget_alert_email" {
  description = "Email address that receives organization budget alerts."
  type        = string
}
