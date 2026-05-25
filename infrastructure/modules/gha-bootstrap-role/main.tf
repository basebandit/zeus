locals {
  allowed_subs = flatten([
    for r in var.allowed_repos : [
      for s in r.subjects : "repo:${var.github_org}/${r.repo}:${s}"
    ]
  ])
}

data "aws_iam_policy_document" "trust" {
  statement {
    sid     = "AllowGitHubOIDC"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.allowed_subs
    }
  }
}

resource "aws_iam_role" "bootstrap" {
  name                 = var.role_name
  assume_role_policy   = data.aws_iam_policy_document.trust.json
  max_session_duration = 3600

  tags = {
    Purpose   = "terraform-ci-bootstrap"
    ManagedBy = "terraform"
  }
}

data "aws_iam_policy_document" "permissions" {
  statement {
    sid       = "AssumeExecutorRoles"
    effect    = "Allow"
    actions   = ["sts:AssumeRole"]
    resources = var.executor_role_arns
  }

  dynamic "statement" {
    for_each = var.state_bucket_arn != null ? [1] : []
    content {
      sid    = "TerraformStateBucket"
      effect = "Allow"
      actions = [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
      ]
      resources = [
        var.state_bucket_arn,
        "${var.state_bucket_arn}/*",
      ]
    }
  }

  dynamic "statement" {
    for_each = var.state_lock_table_arn != null ? [1] : []
    content {
      sid    = "TerraformStateLock"
      effect = "Allow"
      actions = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "dynamodb:DescribeTable",
      ]
      resources = [var.state_lock_table_arn]
    }
  }

  dynamic "statement" {
    for_each = var.state_kms_key_arn != null ? [1] : []
    content {
      sid    = "TerraformStateKMS"
      effect = "Allow"
      actions = [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey",
      ]
      resources = [var.state_kms_key_arn]
    }
  }
}

resource "aws_iam_role_policy" "permissions" {
  name   = "${var.role_name}-permissions"
  role   = aws_iam_role.bootstrap.id
  policy = data.aws_iam_policy_document.permissions.json
}

output "role_arn" {
  value = aws_iam_role.bootstrap.arn
}
