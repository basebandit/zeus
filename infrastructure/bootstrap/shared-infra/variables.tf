variable "aws_region" {
  description = "AWS region for the provider."
  type        = string
  default     = "eu-west-1"
}

variable "aws_profile" {
  description = "AWS CLI/SSO profile for the management account."
  type        = string
}

variable "shared_services_account_id" {
  description = "Account ID where the state and logs buckets are created."
  type        = string
}

variable "state_bucket_name" {
  description = "Name of the Terraform state bucket."
  type        = string
}

variable "cloudtrail_logs_bucket_name" {
  description = "Name of the CloudTrail logs bucket."
  type        = string
}
