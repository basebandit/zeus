variable "environment" {
  description = "Deployment environment"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging or prod"
  }
  default = "staging"
}

variable "aws_region" {
  description = "Region where main resources should be created."
  type        = string
  default     = "eu-central-1"
}

variable "cluster_name" {
  description = "The name of the EKS cluster"
  type        = string
  default     = "basebandit-lab"
}

variable "cluster_version" {
  description = "The version of the EKS Cluster"
  type        = string
  default     = "1.32"
}

variable "vpc_cidr_ipv4_private_z1" {
  description = "The IP range to use for the vpc private  subnet one"
  type        = string
  default     = "10.0.0.0/19"
}

variable "vpc_cidr_ipv4_private_z2" {
  description = "The IP range to use for the vpc private  subnet two"
  type        = string
  default     = "10.0.32.0/19"
}

variable "vpc_cidr_ipv4_public_z1" {
  description = "The IP range to use for the vpc public  subnet one"
  type        = string
  default     = "10.0.64.0/19"
}

variable "vpc_cidr_ipv4_public_z2" {
  description = "The IP range to use for the vpc public  subnet two"
  type        = string
  default     = "10.0.96.0/19"
}