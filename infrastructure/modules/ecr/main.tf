resource "aws_ecr_repository" "this" {
  for_each = toset(var.repository_names)

  name                 = each.value
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }
}

resource "aws_ecr_lifecycle_policy" "this" {
  for_each   = aws_ecr_repository.this
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last ${var.keep_last_images} images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = var.keep_last_images
      }
      action = { type = "expire" }
    }]
  })
}

# Cross-account pull authorization (token still issued by this account).
data "aws_iam_policy_document" "repo" {
  count = length(var.pull_account_ids) > 0 ? 1 : 0

  statement {
    sid    = "AllowCrossAccountPull"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = [for id in var.pull_account_ids : "arn:aws:iam::${id}:root"]
    }

    actions = [
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:BatchCheckLayerAvailability",
      "ecr:DescribeImages",
      "ecr:ListImages",
    ]
  }
}

resource "aws_ecr_repository_policy" "this" {
  for_each   = length(var.pull_account_ids) > 0 ? aws_ecr_repository.this : {}
  repository = each.value.name
  policy     = data.aws_iam_policy_document.repo[0].json
}

# Reader role workload accounts assume for a token valid against this registry.
data "aws_iam_policy_document" "reader_trust" {
  count = length(var.reader_principal_arns) > 0 ? 1 : 0

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "AWS"
      identifiers = var.reader_principal_arns
    }
  }
}

data "aws_iam_policy_document" "reader_perms" {
  count = length(var.reader_principal_arns) > 0 ? 1 : 0

  statement {
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:BatchCheckLayerAvailability",
      "ecr:DescribeImages",
      "ecr:ListImages",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role" "reader" {
  count              = length(var.reader_principal_arns) > 0 ? 1 : 0
  name               = var.reader_role_name
  assume_role_policy = data.aws_iam_policy_document.reader_trust[0].json
}

resource "aws_iam_role_policy" "reader" {
  count  = length(var.reader_principal_arns) > 0 ? 1 : 0
  name   = "${var.reader_role_name}-perms"
  role   = aws_iam_role.reader[0].id
  policy = data.aws_iam_policy_document.reader_perms[0].json
}
