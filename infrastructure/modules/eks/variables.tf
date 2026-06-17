variable "cluster_name" {
  type        = string
  description = "Fully-qualified EKS cluster name (e.g. dev-basebandit-lab-cluster). Used directly as the cluster name and as the prefix for its IAM roles."
}

variable "cluster_version" {
  type        = string
  description = "Kubernetes version for the EKS control plane and node group."
  default     = "1.32"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for the control plane ENIs and the node group (private subnets)."
}

variable "endpoint_public_access" {
  type        = bool
  description = "Expose the Kubernetes API endpoint publicly. Fine for dev; tighten for prod."
  default     = true
}

variable "endpoint_private_access" {
  type        = bool
  description = "Expose the Kubernetes API endpoint inside the VPC. Required true for private nodes to reach the control plane."
  default     = true
}

variable "public_access_cidrs" {
  type        = list(string)
  description = "CIDRs allowed to reach the public API endpoint (e.g. your home/office /32). No default — must be set explicitly; do not use 0.0.0.0/0."
  validation {
    condition     = !contains(var.public_access_cidrs, "0.0.0.0/0")
    error_message = "Refusing 0.0.0.0/0 on the EKS public endpoint. Provide specific CIDRs."
  }
}

variable "node_instance_types" {
  type        = list(string)
  description = "EC2 instance types for the general node group."
  default     = ["t3.small"]
}

variable "node_scaling" {
  type = object({
    min     = number
    desired = number
    max     = number
  })
  description = "Autoscaling bounds for the general node group."
  default = {
    min     = 2
    desired = 3
    max     = 6
  }
}

variable "node_capacity_type" {
  type        = string
  description = "ON_DEMAND or SPOT for the general node group."
  default     = "ON_DEMAND"
}

variable "pod_identity_addon_version" {
  type        = string
  description = "Version of the eks-pod-identity-agent addon."
  default     = "v1.3.8-eksbuild.2"
}

variable "access_entries" {
  description = <<-EOT
    EKS access entries keyed by a stable name. Each maps an IAM principal (e.g. an
    Identity Center permission-set role) to an EKS-managed access policy, optionally
    scoped to namespaces. Add a team by adding an entry; add a person by assigning
    them the permission set in Identity Center (no change here).
  EOT
  type = map(object({
    principal_arn = string
    policy_arn    = string
    access_scope = optional(object({
      type       = string
      namespaces = optional(list(string))
    }), { type = "cluster" })
  }))
  default = {}
}
