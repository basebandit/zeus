data "aws_caller_identity" "current" {}

provider "aws" {
  region = local.region

  assume_role {
    role_arn = "arn:aws:iam::${var.shared_services_account_id}:role/OrganizationAccountAccessRole"
  }
}

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.49"
    }
  }

  # backend "s3" {
  #   bucket       = "basebandit-terraform-state-<management-account-id>"
  #   key          = "environments/shared-services/terraform.tfstate"
  #   region       = "eu-central-1"
  #   use_lockfile = true
  # }
}
