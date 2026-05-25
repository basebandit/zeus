variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "eu-central-1"
}

variable "dev_account_id" {
  description = "AWS account ID of the dev member account. Get this from: cd management && terraform output dev_account_id"
  type        = string
}

# --- ArgoCD -----------------------------------------------------------------
variable "argocd_repo_url" {
  description = "Git URL ArgoCD pulls manifests from."
  type        = string
  default     = "git@github.com:basebandit/zeus.git"
}

# --- Workload: EKS ----------------------------------------------------------
variable "cluster_public_access_cidrs" {
  description = "CIDRs allowed to reach the EKS public API endpoint (e.g. your home/office IP /32). Set in terraform.tfvars; must not be 0.0.0.0/0."
  type        = list(string)
}

variable "cluster_admin_role_arn" {
  description = "IAM principal (Identity Center admin permission-set role) granted EKS cluster-admin. Set in terraform.tfvars."
  type        = string
}

variable "developer_role_arn" {
  description = "IAM principal (Identity Center developer permission-set role) granted namespace-scoped read-only. Null until the team grows."
  type        = string
  default     = null
}

variable "app_namespaces" {
  description = "Namespaces developers get read-only (view) access to."
  type        = list(string)
  default     = ["orders", "payments"]
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster."
  type        = string
  default     = "1.32"
}

variable "node_instance_types" {
  description = "EC2 instance types for the general node group."
  type        = list(string)
  default     = ["t3.small"]
}

variable "node_scaling" {
  description = "Autoscaling bounds for the general node group (dev is kept small)."
  type = object({
    min     = number
    desired = number
    max     = number
  })
  default = {
    min     = 2
    desired = 2
    max     = 4
  }
}

# --- Workload: cross-account ECR (registry lives in the shared account) ------
variable "shared_account_id" {
  description = "AWS account ID of the shared account (Terraform state + ECR). Get from: cd management && terraform output shared_services_account_id"
  type        = string
}

variable "ecr_account_id" {
  description = "AWS account ID that owns the ECR repositories ArgoCD Image Updater watches. Defaults to the shared account."
  type        = string
  default     = null
}

variable "ecr_region" {
  description = "Region of the ECR repositories."
  type        = string
  default     = "eu-central-1"
}

variable "ecr_pull_role_arn" {
  description = "Cross-account role in the ECR-owning account that the image-updater assumes for ECR read/auth. Null for same-account ECR."
  type        = string
  default     = null
}
