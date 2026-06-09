resource "aws_iam_role" "terraform_execution_shared_services" {
  provider = aws.shared_services

  name        = "TerraformExecutionRole"
  description = "Role assumed by Terraform to provision shared-services account resources."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowManagementAccountToAssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.management_account_id}:root"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "terraform_execution_shared_services_admin" {
  provider = aws.shared_services

  role       = aws_iam_role.terraform_execution_shared_services.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_role" "terraform_execution_dev" {
  provider = aws.dev

  name        = "TerraformExecutionRole"
  description = "Role assumed by Terraform to provision dev account resources."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowManagementAccountToAssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.management_account_id}:root"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "terraform_execution_dev_admin" {
  provider = aws.dev

  role       = aws_iam_role.terraform_execution_dev.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_role" "terraform_execution_staging" {
  provider = aws.staging

  name        = "TerraformExecutionRole"
  description = "Role assumed by Terraform to provision staging account resources."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowManagementAccountToAssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.management_account_id}:root"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "terraform_execution_staging_admin" {
  provider = aws.staging

  role       = aws_iam_role.terraform_execution_staging.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_role" "terraform_execution_prod" {
  provider = aws.prod

  name        = "TerraformExecutionRole"
  description = "Role assumed by Terraform to provision prod account resources."

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowManagementAccountToAssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.management_account_id}:root"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "terraform_execution_prod_admin" {
  provider = aws.prod

  role       = aws_iam_role.terraform_execution_prod.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
