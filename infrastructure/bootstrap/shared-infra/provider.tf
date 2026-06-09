provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  assume_role {
    role_arn     = "arn:aws:iam::${var.shared_services_account_id}:role/OrganizationAccountAccessRole"
    session_name = "tf-shared-backend-bootstrap"
  }
}
