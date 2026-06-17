module "vpc" {
  source = "../../modules/vpc"

  env               = local.env
  region            = var.aws_region
  cluster_full_name = local.cluster_full_name
  azs               = local.azs
}
