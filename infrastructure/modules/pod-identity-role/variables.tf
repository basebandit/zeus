variable "role_name" {
  type        = string
  description = "Name of the IAM role."
}

variable "cluster_name" {
  type        = string
  description = "EKS cluster name to associate the role with."
}

variable "namespace" {
  type        = string
  description = "Kubernetes namespace of the service account."
}

variable "service_account" {
  type        = string
  description = "Kubernetes service account name that assumes this role via Pod Identity."
}

variable "managed_policy_arns" {
  type        = list(string)
  description = "AWS managed policy ARNs to attach."
  default     = []
}

variable "inline_policy_json" {
  type        = string
  description = "Optional inline policy JSON for scoped permissions."
  default     = null
}
