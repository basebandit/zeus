output "repository_urls" {
  description = "Map of repository name to repository URL."
  value       = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}

output "reader_role_arn" {
  description = "ARN of the cross-account ECR reader role (null if no reader principals configured)."
  value       = length(var.reader_principal_arns) > 0 ? aws_iam_role.reader[0].arn : null
}
