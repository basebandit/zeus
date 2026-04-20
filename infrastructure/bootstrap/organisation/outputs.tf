output "management_account_id" {
  description = "The management account (admin) — never destroyed."
  value       = data.aws_organizations_organization.this.master_account_id
}

output "organization_root_id" {
  value = data.aws_organizations_organization.this.roots[0].id
}

output "shared_services_account_id" {
  value = aws_organizations_account.shared_services.id
}

output "dev_account_id" {
  value = aws_organizations_account.dev.id
}

output "staging_account_id" {
  value = aws_organizations_account.staging.id
}

output "prod_account_id" {
  value = aws_organizations_account.prod.id
}
