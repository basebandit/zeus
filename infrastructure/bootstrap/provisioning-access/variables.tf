variable "aws_region" {
  description = "AWS region used for bootstrapping IAM resources."
  type        = string
  default     = "eu-west-1"
}

variable "aws_profile" {
  description = "AWS CLI profile for the management account SSO admin user."
  type        = string
  default     = "bootstrap_admin"
}

variable "management_account_id" {
  description = "AWS account ID of the Organizations management account."
  type        = string
}

variable "accounts" {
  description = "Map of account names to AWS account IDs."
  type        = map(string)
}

variable "github_owner" {
  description = "GitHub organization or username."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository name allowed to assume the GitHub Actions role."
  type        = string
}

variable "github_branches" {
  description = "GitHub branches allowed to assume the GitHub Actions role."
  type        = list(string)
  default     = ["main"]
}
