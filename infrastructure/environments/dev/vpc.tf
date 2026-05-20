module "vpc" {
  source = "../../modules/vpc"

  env                = local.env
  cluster_full_name  = local.cluster_full_name
  azs                = local.azs
  single_nat_gateway = true
}
