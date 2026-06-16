# Container registry for all environments. Images are built/pushed here once
# (shared is the source of truth) and ECR replication copies each image into the
# dev/staging/prod accounts, so clusters pull from their OWN account registry
# (same-account auth — no cross-account token juggling on the nodes).
module "ecr" {
  source = "../../modules/ecr"

  repository_names = ["orders", "payments", "inventory"]

  # Belt-and-suspenders: still allow direct cross-account pull. With replication
  # in place this is a fallback, not the primary path.
  pull_account_ids = [
    var.dev_account_id,
    var.staging_account_id,
    var.prod_account_id,
  ]

  # Reader role is unnecessary once images replicate into each account; leave
  # empty. Set principals here only if a cluster must read the shared registry
  # directly instead of its replica.
  reader_principal_arns = []
}

# Registry-level replication (one config per account/region). Copies every repo
# in this account to the same region of each workload account.
resource "aws_ecr_replication_configuration" "this" {
  replication_configuration {
    rule {
      dynamic "destination" {
        for_each = [var.dev_account_id, var.staging_account_id, var.prod_account_id]
        content {
          region      = var.aws_region
          registry_id = destination.value
        }
      }
    }
  }
}
