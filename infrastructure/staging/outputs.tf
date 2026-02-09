output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "VPC id"
}

output "vpc_arn" {
  value       = module.vpc.vpc_arn
  description = "VPC arn"
}

output "vpc_name" {
  value       = module.vpc.name
  description = "Name tag of the VPC"
}

output "vpc_cidr_block" {
  value       = module.vpc.vpc_cidr_block
  description = "VPC main cidr block"
}

output "availability_zones" {
  value       = module.vpc.azs
  description = "AZs used for subnets"
}

output "vpc_private_subnet_cidr_blocks" {
  value       = module.vpc.private_subnets_cidr_blocks
  description = "List of private subnet cidr blocks"
}

output "vpc_public_subnet_cidr_blocks" {
  value       = module.vpc.public_subnets_cidr_blocks
  description = "List of public subnet cidr blocks"
}

output "vpc_nat_gateway_static_public_ip" {
  value       = try(module.vpc.nat_public_ips[0], null)
  description = "Public IP of the NAT Gateway (null if NAT gateway is disabled)"
}

output "private_subnet_ids" {
  value       = module.vpc.private_subnets
  description = "List of private subnet IDs"
}

output "public_subnet_ids" {
  value       = module.vpc.public_subnets
  description = "List of public subnet IDs"
}

output "internet_gateway_id" {
  value       = module.vpc.igw_id
  description = "ID of the Internet Gateway"
}

output "nat_gateway_id" {
  value       = try(module.vpc.natgw_ids[0], null)
  description = "ID of the NAT Gateway (null if NAT gateway is disabled)"
}

# ===================================================
# EKS
# ===================================================
output "eks_cluster_name" {
  value       = module.eks.cluster_name
  description = "Name of the EKS cluster"
}

output "eks_cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "API server endpoint of the EKS cluster"
}

output "eks_cluster_role_arn" {
  value       = module.eks.cluster_iam_role_arn
  description = "IAM role ARN used by the EKS control plane"
}

output "eks_cluster_security_group_id" {
  value       = module.eks.cluster_security_group_id
  description = "Security group ID associated with the EKS cluster"
}

output "eks_node_group_autoscaling_group_names" {
  value       = module.eks.eks_managed_node_groups_autoscaling_group_names
  description = "List of autoscaling group names for EKS node groups"
}

output "eks_cluster_version" {
  value       = module.eks.cluster_version
  description = "Kubernetes version of the EKS cluster"
}

output "eks_oidc_issuer_url" {
  value       = module.eks.cluster_oidc_issuer_url
  description = "OIDC issuer URL used for IAM Roles for Service Accounts (IRSA)"
}

output "eks_oidc_provider_arn" {
  value       = module.eks.oidc_provider_arn
  description = "ARN of the OIDC Provider for IRSA"
}
