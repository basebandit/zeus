module "terraform_executor" {
  source = "../../modules/terraform-executor-role"

  environment        = local.env
  bootstrap_role_arn = var.bootstrap_role_arn

  # AdministratorAccess is acceptable for dev — iterate quickly without permission friction.
  managed_policy_arns = ["arn:aws:iam::aws:policy/AdministratorAccess"]
}
