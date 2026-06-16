output "image_updater_role_arn" {
  description = "ARN of the ArgoCD Image Updater IAM role (grant ECR access to this in the registry-owning account)."
  value       = aws_iam_role.image_updater.arn
}

output "external_secrets_role_arn" {
  description = "ARN of the External Secrets IAM role."
  value       = aws_iam_role.external_secrets.arn
}

output "secrets_path_prefix" {
  description = "SecretsManager path prefix this cluster reads ArgoCD config from. Seed these secrets before applying ArgoCD config."
  value       = local.secrets_path_prefix
}
