# GitHub OIDC provider — allows GitHub Actions to authenticate to AWS without
# long-lived access keys.
module "github_oidc" {
  source = "../../modules/github-oidc-provider"
}

# Bootstrap role — assumed by GHA via OIDC, then assumes executor roles in each
# member account to run Terraform.
#
# Executor role ARNs are pre-computed from account IDs using the deterministic
# naming convention set in the terraform-executor-role module (terraform-executor-{env}).
# This avoids a circular dependency — shared-services can be deployed before
# dev/staging/prod as long as the account IDs are known from management outputs.
module "gha_bootstrap" {
  source = "../../modules/gha-bootstrap-role"

  oidc_provider_arn = module.github_oidc.provider_arn
  github_org        = var.github_org

  allowed_repos = [
    {
      repo = var.github_repo
      subjects = [
        "ref:refs/heads/main",
        "environment:dev",
        "environment:staging",
        "environment:prod",
        "pull_request",
      ]
    }
  ]

  executor_role_arns = [
    "arn:aws:iam::${var.dev_account_id}:role/terraform-executor-dev",
    "arn:aws:iam::${var.staging_account_id}:role/terraform-executor-staging",
    "arn:aws:iam::${var.prod_account_id}:role/terraform-executor-prod",
    "arn:aws:iam::${var.audit_account_id}:role/terraform-executor-audit",
  ]

  # Executor roles hold AdministratorAccess (dev/staging) or a scoped inline policy (prod),
  # so the bootstrap role itself does not need direct S3/KMS access.
  state_bucket_arn     = null
  state_lock_table_arn = null
  state_kms_key_arn    = null
}
