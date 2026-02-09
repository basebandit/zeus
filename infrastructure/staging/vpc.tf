module "vpc" {
  source = "../modules/vpc"

  name        = "${local.env}"
  environment = local.env
  cidr        = "10.0.0.0/16"

  azs             = [local.zone1, local.zone2]
  private_subnets = [var.vpc_cidr_ipv4_private_z1, var.vpc_cidr_ipv4_private_z2]
  public_subnets  = [var.vpc_cidr_ipv4_public_z1, var.vpc_cidr_ipv4_public_z2]

  enable_nat_gateway = true
  single_nat_gateway = true # Cost savings for staging

  enable_dns_hostnames = true
  enable_dns_support   = true

  # EKS-specific subnet tags
  public_subnet_tags = {
    "kubernetes.io/role/elb"                                   = "1"
    "kubernetes.io/cluster/${local.env}-${local.cluster_name}" = "owned"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"                          = "1"
    "kubernetes.io/cluster/${local.env}-${local.cluster_name}" = "owned"
  }
}
