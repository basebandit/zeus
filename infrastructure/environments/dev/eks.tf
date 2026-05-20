module "eks" {
  source = "../../modules/eks"

  env             = local.env
  cluster_name    = local.cluster_full_name
  cluster_version = var.cluster_version
  subnet_ids      = module.vpc.private_subnet_ids

  node_instance_types = var.node_instance_types
  node_scaling        = var.node_scaling
}
