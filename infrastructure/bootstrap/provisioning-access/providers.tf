provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

provider "aws" {
  alias   = "shared_services"
  region  = var.aws_region
  profile = var.aws_profile

  assume_role {
    role_arn     = "arn:aws:iam::${var.accounts["shared_services"]}:role/OrganizationAccountAccessRole"
    session_name = "bootstrap-provisioning-access-shared"
  }
}

provider "aws" {
  alias   = "dev"
  region  = var.aws_region
  profile = var.aws_profile

  assume_role {
    role_arn     = "arn:aws:iam::${var.accounts["dev"]}:role/OrganizationAccountAccessRole"
    session_name = "bootstrap-provisioning-access-dev"
  }
}

provider "aws" {
  alias   = "staging"
  region  = var.aws_region
  profile = var.aws_profile

  assume_role {
    role_arn     = "arn:aws:iam::${var.accounts["staging"]}:role/OrganizationAccountAccessRole"
    session_name = "bootstrap-provisioning-access-staging"
  }
}

provider "aws" {
  alias   = "prod"
  region  = var.aws_region
  profile = var.aws_profile

  assume_role {
    role_arn     = "arn:aws:iam::${var.accounts["prod"]}:role/OrganizationAccountAccessRole"
    session_name = "bootstrap-provisioning-access-prod"
  }
}
