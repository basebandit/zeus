variable "env" {
  type        = string
  description = "Environment name (dev, staging, prod)."
}

variable "cluster_name" {
  type        = string
  description = "Fully-qualified EKS cluster name. Used to name IAM roles and as the SecretsManager path segment (/infra/argo/<cluster_name>/...)."
}

variable "aws_region" {
  type        = string
  description = "Region of this account's SecretsManager (where External Secrets reads ArgoCD config from)."
}

# -- ArgoCD config in SecretsManager -----------------------------------------
variable "secrets_path_prefix" {
  type        = string
  description = "SecretsManager path prefix holding ArgoCD config (admin password, server key, repo creds). Defaults to /infra/argo/<cluster_name>."
  default     = null
}

# -- ECR (image updater) -----------------------------------------------------
variable "ecr_account_id" {
  type        = string
  description = "AWS account ID that owns the ECR repositories ArgoCD Image Updater watches."
}

variable "ecr_region" {
  type        = string
  description = "Region of the ECR repositories."
}

variable "ecr_pull_role_arn" {
  type        = string
  description = "Optional cross-account role to assume for ECR read/auth when ECR lives in another account. Null for same-account ECR."
  default     = null
}

# -- Helm values files (rendered/owned by the caller) ------------------------
variable "argocd_values_file" {
  type        = string
  description = "Path to the argo-cd Helm values file."
}

variable "argocd_apps_values_file" {
  type        = string
  description = "Path to the argocd-apps Helm values file (projects + ApplicationSet)."
}

variable "image_updater_values_file" {
  type        = string
  description = "Path to the argocd-image-updater Helm values file."
}

# -- Chart versions ----------------------------------------------------------
variable "argocd_chart_version" {
  type    = string
  default = "8.2.2"
}

variable "argocd_apps_chart_version" {
  type    = string
  default = "2.0.2"
}

variable "image_updater_chart_version" {
  type    = string
  default = "0.12.3"
}

variable "helm_timeout" {
  type        = number
  description = "Timeout in seconds for Helm releases."
  default     = 600
}
