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

variable "kubernetes_version" {
  description = "Kubernetes version for the EKS cluster (e.g., 1.29). If null, the provider or module default is used."
  type        = string
  default     = null
}

variable "cluster_endpoint_public_access" {
  description = "Indicates whether or not the Amazon EKS public API server endpoint is enabled."
  type        = bool
  default     = true
}

variable "cluster_endpoint_private_access" {
  description = "Indicates whether or not the Amazon EKS private API server endpoint is enabled."
  type        = bool
  default     = false
}

variable "aws_auth_roles" {
  description = "List of role mappings to add to the aws-auth ConfigMap."
  type        = list(any)
  default     = []
}

variable "aws_auth_users" {
  description = "List of user mappings to add to the aws-auth ConfigMap."
  type        = list(any)
  default     = []
}

variable "aws_auth_accounts" {
  description = "List of AWS account IDs to add to the aws-auth ConfigMap."
  type        = list(string)
  default     = []
}
