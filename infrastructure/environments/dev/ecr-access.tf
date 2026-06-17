# Lets the shared account replicate images into this account's ECR.
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
