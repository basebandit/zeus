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

variable "identity_center_username" {
  description = "Identity Store UserName of the user to grant access."
  type        = string
}

variable "permission_set_name" {
  description = "Permission set to assign across the accounts."
  type        = string
  default     = "AdministratorAccess"
}

variable "account_ids" {
  description = "Map of name => account ID to grant the permission set on."
  type        = map(string)
}
