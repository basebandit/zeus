variable "env" {
  type        = string
  description = "Environment name (dev, staging, prod)."
}

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
  description = "Expose the Kubernetes API endpoint inside the VPC."
  default     = false
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
