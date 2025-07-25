data "aws_availability_zones" "available" {}

locals {
  env             = var.environment
  region          = var.aws_region
  cluster_name    = "${var.environment}-${var.cluster_name}-cluster"
  cluster_version = var.cluster_version

  azs   = slice(data.aws_availability_zones.available.names, 0, 3)
  zone1 = local.azs[0]
  zone2 = local.azs[1]
  zone3 = local.azs[2]
}
