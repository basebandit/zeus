variable "env" {
  type        = string
  description = "Environment name (dev, staging, prod). Used to name and tag resources."
}

variable "region" {
  type        = string
  description = "AWS region (used to build VPC endpoint service names)."
}

variable "cluster_full_name" {
  type        = string
  description = "Fully-qualified EKS cluster name (e.g. dev-basebandit-lab-cluster). Used for the kubernetes.io/cluster subnet tag."
}

variable "azs" {
  type        = list(string)
  description = "Two availability zones to spread the private subnets across."
  validation {
    condition     = length(var.azs) == 2
    error_message = "Exactly two availability zones are required."
  }
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC."
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "Two CIDR blocks for the private (node) subnets, one per AZ."
  default     = ["10.0.0.0/19", "10.0.32.0/19"]
  validation {
    condition     = length(var.private_subnet_cidrs) == 2
    error_message = "Exactly two private subnet CIDRs are required."
  }
}

variable "interface_endpoint_services" {
  type        = list(string)
  description = <<-EOT
    Short service names for AWS PrivateLink interface endpoints, enough for
    private EKS nodes to function without a NAT gateway:
      ecr.api, ecr.dkr  -> pull images
      ec2               -> VPC CNI manages ENIs
      sts               -> AssumeRole / Pod Identity
      eks-auth          -> EKS Pod Identity token
    S3 is added separately as a (free) gateway endpoint for ECR layer storage.
  EOT
  default     = ["ecr.api", "ecr.dkr", "ec2", "sts", "eks-auth"]
}
