data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  region   = var.aws_region
  env      = "dev"
  org_name = "basebandit"

  cluster_name      = "basebandit-lab"
  cluster_full_name = "${local.env}-${local.cluster_name}-cluster"

  # Two AZs, matching the two-subnet-pair VPC layout.
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}
