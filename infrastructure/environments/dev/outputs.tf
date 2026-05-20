output "executor_role_arn" {
  description = "ARN of the Terraform executor role. Provide this to the shared-services bootstrap role as an executor_role_arn."
  value       = module.terraform_executor.role_arn
}

output "vpc_id" {
  description = "ID of the dev VPC."
  value       = module.vpc.vpc_id
}

output "cluster_name" {
  description = "Name of the dev EKS cluster."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Kubernetes API endpoint of the dev EKS cluster."
  value       = module.eks.cluster_endpoint
}

output "node_role_arn" {
  description = "Node group role ARN. Grant this ECR pull in the shared account's repository policy."
  value       = module.eks.node_role_arn
}

output "image_updater_role_arn" {
  description = "ArgoCD Image Updater role ARN. Grant this ECR read in the shared account's repository policy."
  value       = module.argocd.image_updater_role_arn
}

output "argocd_secrets_path_prefix" {
  description = "SecretsManager path prefix to seed ArgoCD config under (admin password, server key, repo creds)."
  value       = module.argocd.secrets_path_prefix
}
