provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  # Hard guard: error out at init if the profile resolves to any account
  # other than the management account. Cheap insurance for org-root ops.
  allowed_account_ids = [var.management_account_id]
}
