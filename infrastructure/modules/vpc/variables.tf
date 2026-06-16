variable "env" {
  type        = string
  description = "Environment name (dev, staging, prod). Used to name and tag resources."
}

variable "cluster_full_name" {
  type        = string
  description = "Fully-qualified EKS cluster name (e.g. dev-basebandit-lab-cluster). Used for the kubernetes.io/cluster subnet tag so the AWS Load Balancer Controller and EKS can discover subnets."
}

variable "azs" {
  type        = list(string)
  description = "Two availability zones to spread subnets across."
  validation {
    condition     = length(var.azs) == 2
    error_message = "Exactly two availability zones are required (zone1, zone2)."
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

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "Two CIDR blocks for the public (load balancer) subnets, one per AZ."
  default     = ["10.0.64.0/19", "10.0.96.0/19"]
  validation {
    condition     = length(var.public_subnet_cidrs) == 2
    error_message = "Exactly two public subnet CIDRs are required."
  }
}

variable "single_nat_gateway" {
  type        = bool
  description = "When true, route both private subnets through one NAT gateway (cheaper, fine for non-prod). When false, one NAT gateway per AZ for HA."
  default     = true
}
