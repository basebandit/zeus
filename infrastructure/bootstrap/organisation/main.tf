data "aws_organizations_organization" "this" {}

resource "aws_organizations_organizational_unit" "infrastructure" {
  name      = "Infrastructure"
  parent_id = data.aws_organizations_organization.this.roots[0].id
}

resource "aws_organizations_organizational_unit" "workloads" {
  name      = "Workloads"
  parent_id = data.aws_organizations_organization.this.roots[0].id
}

resource "aws_organizations_account" "shared_services" {
  name      = "shared"
  email     = "${var.account_email_prefix}+aws-shared-services@gmail.com"
  parent_id = aws_organizations_organizational_unit.infrastructure.id

  close_on_deletion = false

  tags = merge(local.common_tags, {
    Environment = "shared"
  })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_organizations_account" "dev" {
  name      = "dev"
  email     = "${var.account_email_prefix}+aws-dev@gmail.com"
  parent_id = aws_organizations_organizational_unit.workloads.id

  close_on_deletion = false

  tags = merge(local.common_tags, {
    Environment = "dev"
  })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_organizations_account" "staging" {
  name      = "staging"
  email     = "${var.account_email_prefix}+aws-staging@gmail.com"
  parent_id = aws_organizations_organizational_unit.workloads.id

  close_on_deletion = false

  tags = merge(local.common_tags, {
    Environment = "staging"
  })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_organizations_account" "prod" {
  name      = "prod"
  email     = "${var.account_email_prefix}+aws-prod@gmail.com"
  parent_id = aws_organizations_organizational_unit.workloads.id

  close_on_deletion = false

  tags = merge(local.common_tags, {
    Environment = "prod"
  })

  lifecycle {
    prevent_destroy = true
  }
}
