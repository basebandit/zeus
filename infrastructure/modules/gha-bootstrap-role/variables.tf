variable "role_name" {
  type        = string
  description = "Name of the bootstrap role"
  default     = "gha-terraform-bootstrap"
}

variable "oidc_provider_arn" {
  type        = string
  description = "ARN of the GitHub OIDC provider in this account"
}

variable "github_org" {
  type        = string
  description = "GitHub org or user that owns the repos"
}

variable "allowed_repos" {
  type = list(object({
    repo     = string
    subjects = list(string)
  }))
  description = "Repos allowed to assume this role and which subject claims are permitted"
}

variable "executor_role_arns" {
  type        = list(string)
  description = "ARNs of cross-account executor roles this bootstrap role may assume"
}

variable "state_bucket_arn" {
  type        = string
  description = "ARN of the S3 bucket holding Terraform state. Null when executor roles manage state access directly."
  default     = null
}

variable "state_lock_table_arn" {
  type        = string
  description = "ARN of the DynamoDB table for state locking. Null when using S3 native locking (Terraform >= 1.10)."
  default     = null
}

variable "state_kms_key_arn" {
  type        = string
  description = "ARN of the KMS key encrypting Terraform state. Null when using SSE-S3 (AES256)."
  default     = null
}
