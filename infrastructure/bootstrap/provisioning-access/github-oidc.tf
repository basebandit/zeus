resource "aws_iam_openid_connect_provider" "github_shared_services" {
  provider = aws.shared_services

  url = local.github_oidc_provider_url

  client_id_list = [
    "sts.amazonaws.com",
  ]
}

resource "aws_iam_role" "github_actions_terraform_shared_services" {
  provider = aws.shared_services

  name        = "GitHubActionsTerraformRole"
  description = "Role assumed by GitHub Actions to run Terraform in shared-services."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowGitHubActionsOidc"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_shared_services.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = local.github_branch_subjects
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_actions_shared_services_admin" {
  provider = aws.shared_services

  role       = aws_iam_role.github_actions_terraform_shared_services.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_openid_connect_provider" "github_dev" {
  provider = aws.dev

  url = local.github_oidc_provider_url

  client_id_list = [
    "sts.amazonaws.com",
  ]
}

resource "aws_iam_role" "github_actions_terraform_dev" {
  provider = aws.dev

  name        = "GitHubActionsTerraformRole"
  description = "Role assumed by GitHub Actions to run Terraform in dev."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowGitHubActionsOidc"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_dev.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = local.github_branch_subjects
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_actions_dev_admin" {
  provider = aws.dev

  role       = aws_iam_role.github_actions_terraform_dev.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_openid_connect_provider" "github_staging" {
  provider = aws.staging

  url = local.github_oidc_provider_url

  client_id_list = [
    "sts.amazonaws.com",
  ]
}

resource "aws_iam_role" "github_actions_terraform_staging" {
  provider = aws.staging

  name        = "GitHubActionsTerraformRole"
  description = "Role assumed by GitHub Actions to run Terraform in staging."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowGitHubActionsOidc"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_staging.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = local.github_branch_subjects
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_actions_staging_admin" {
  provider = aws.staging

  role       = aws_iam_role.github_actions_terraform_staging.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_openid_connect_provider" "github_prod" {
  provider = aws.prod

  url = local.github_oidc_provider_url

  client_id_list = [
    "sts.amazonaws.com",
  ]
}

resource "aws_iam_role" "github_actions_terraform_prod" {
  provider = aws.prod

  name        = "GitHubActionsTerraformRole"
  description = "Role assumed by GitHub Actions to run Terraform in prod."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowGitHubActionsOidc"
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github_prod.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = local.github_branch_subjects
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_actions_prod_admin" {
  provider = aws.prod

  role       = aws_iam_role.github_actions_terraform_prod.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
