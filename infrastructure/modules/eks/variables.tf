variable "name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.32"
}

variable "vpc_id" {
  description = "ID of the VPC where the cluster will be deployed"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the EKS cluster"
  type        = list(string)
}

variable "endpoint_public_access" {
  description = "Enable public API server endpoint access"
  type        = bool
  default     = false
}

variable "endpoint_private_access" {
  description = "Enable private API server endpoint access"
  type        = bool
  default     = true
}

variable "enable_cluster_creator_admin_permissions" {
  description = "Adds the current caller identity as an administrator"
  type        = bool
  default     = true
}

variable "authentication_mode" {
  description = "Authentication mode (API, API_AND_CONFIG_MAP, CONFIG_MAP)"
  type        = string
  default     = "API"
}

variable "cloudwatch_log_group_retention_in_days" {
  description = "Number of days to retain log events"
  type        = number
  default     = 30
}

variable "eks_managed_node_groups" {
  description = "Map of EKS managed node group definitions"
  type        = any
  default     = {}
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Additional tags for all resources"
  type        = map(string)
  default     = {}
}
