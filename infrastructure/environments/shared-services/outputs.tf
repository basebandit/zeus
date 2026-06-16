output "bootstrap_role_arn" {
  description = "ARN of the GHA bootstrap role. Use this as var.bootstrap_role_arn in dev, staging, and prod."
  value       = module.gha_bootstrap.role_arn
}

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider."
  value       = module.github_oidc.provider_arn
}

output "ecr_repository_urls" {
  description = "Map of service name to ECR repository URL."
  value       = module.ecr.repository_urls
}

output "ecr_reader_role_arn" {
  description = "ARN of the cross-account ECR reader role. Pass as var.ecr_pull_role_arn in workload envs."
  value       = module.ecr.reader_role_arn
}
