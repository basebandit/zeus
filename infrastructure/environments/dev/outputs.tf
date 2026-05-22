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
  description = "Node group role ARN."
  value       = module.eks.node_role_arn
}

output "image_updater_role_arn" {
  description = "ArgoCD Image Updater Pod Identity role ARN."
  value       = module.image_updater_irsa.role_arn
}

output "external_secrets_role_arn" {
  description = "External Secrets Pod Identity role ARN."
  value       = module.external_secrets_irsa.role_arn
}

output "argocd_secrets_path_prefix" {
  description = "SecretsManager path prefix holding ArgoCD bootstrap material."
  value       = local.argocd_secrets_path
}

output "argocd_repo_deploy_public_key" {
  description = "Register this as a deploy key on the basebandit/zeus GitHub repo (write access for Image Updater write-back)."
  value       = tls_private_key.zeus_repo.public_key_openssh
}
