# Pre-create the replica repositories in this account so they carry a lifecycle
# policy (and scan-on-push). Replicated repos that ECR auto-creates inherit
# NOTHING from the source — no lifecycle — so images would accumulate forever.
# Shared-account replication pushes into these existing repos.
module "ecr" {
  source = "../../modules/ecr"

  repository_names = ["orders", "payments", "inventory"]
  keep_last_images = 20

  # Same-account: nodes pull directly, no cross-account pull policy or reader role.
  pull_account_ids      = []
  reader_principal_arns = []
}
