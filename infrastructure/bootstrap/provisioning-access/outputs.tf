output "terraform_execution_role_arns" {
  value = {
    shared_services = aws_iam_role.terraform_execution_shared_services.arn
    dev             = aws_iam_role.terraform_execution_dev.arn
    staging         = aws_iam_role.terraform_execution_staging.arn
    prod            = aws_iam_role.terraform_execution_prod.arn
  }
}

output "github_actions_terraform_role_arns" {
  value = {
    shared_services = aws_iam_role.github_actions_terraform_shared_services.arn
    dev             = aws_iam_role.github_actions_terraform_dev.arn
    staging         = aws_iam_role.github_actions_terraform_staging.arn
    prod            = aws_iam_role.github_actions_terraform_prod.arn
  }
}
