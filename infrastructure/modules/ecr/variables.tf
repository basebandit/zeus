variable "repository_names" {
  type        = list(string)
  description = "ECR repository names to create (e.g. orders, payments, inventory)."
}

variable "pull_account_ids" {
  type        = list(string)
  description = "AWS account IDs allowed to pull from these repositories (cross-account workload accounts)."
  default     = []
}

variable "reader_principal_arns" {
  type        = list(string)
  description = "IAM principal ARNs allowed to assume the ECR reader role (e.g. the per-cluster ArgoCD Image Updater roles)."
  default     = []
}

variable "reader_role_name" {
  type        = string
  description = "Name of the cross-account ECR reader role that image-updaters assume to list tags and fetch auth tokens."
  default     = "zeus-ecr-reader"
}

variable "image_tag_mutability" {
  type    = string
  default = "IMMUTABLE"
}

variable "scan_on_push" {
  type    = bool
  default = true
}

variable "keep_last_images" {
  type        = number
  description = "Lifecycle policy: number of images to retain per repository."
  default     = 20
}
