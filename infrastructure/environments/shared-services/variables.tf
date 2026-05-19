variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "eu-central-1"
}

variable "shared_services_account_id" {
  description = "AWS account ID of the shared-services member account. Get from: cd management && terraform output shared_services_account_id"
  type        = string
}

variable "dev_account_id" {
  description = "AWS account ID of the dev member account. Get from: cd management && terraform output dev_account_id"
  type        = string
}

variable "staging_account_id" {
  description = "AWS account ID of the staging member account. Get from: cd management && terraform output staging_account_id"
  type        = string
}

variable "prod_account_id" {
  description = "AWS account ID of the prod member account. Get from: cd management && terraform output prod_account_id"
  type        = string
}

variable "audit_account_id" {
  description = "AWS account ID of the audit member account. Get from: cd management && terraform output audit_account_id"
  type        = string
}

variable "github_org" {
  description = "GitHub organization name that owns the infrastructure repo."
  type        = string
  default     = "basebandit"
}

variable "github_repo" {
  description = "GitHub repository name that runs Terraform via GHA."
  type        = string
  default     = "infrastructure"
}
