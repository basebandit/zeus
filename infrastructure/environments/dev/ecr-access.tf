# Cross-account ECR (dev side)
#
# Images live in the shared account and are replicated into this account by the
# shared account's aws_ecr_replication_configuration. This registry policy grants
# the shared account permission to create the replica repositories and push the
# replicated images. Once replicated, the node group pulls same-account (its
# AmazonEC2ContainerRegistryReadOnly is enough) and ArgoCD Image Updater watches
# this account's own registry.

data "aws_iam_policy_document" "ecr_replication" {
  statement {
    sid    = "AllowSharedAccountReplication"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${var.shared_account_id}:root"]
    }

    actions = [
      "ecr:CreateRepository",
      "ecr:ReplicateImage",
    ]

    resources = ["arn:aws:ecr:${var.aws_region}:${var.dev_account_id}:repository/*"]
  }
}

resource "aws_ecr_registry_policy" "replication" {
  policy = data.aws_iam_policy_document.ecr_replication.json
}
