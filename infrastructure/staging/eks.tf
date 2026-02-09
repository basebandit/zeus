module "eks" {
  source = "../modules/eks"

  name               = "${local.env}-${local.cluster_name}"
  environment        = local.env
  kubernetes_version = local.cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Cost: 7-day retention for staging
  cloudwatch_log_group_retention_in_days = 7

  eks_managed_node_groups = {
    general = {
      name           = "general"
      instance_types = ["t3.small"]
      capacity_type  = "ON_DEMAND"

      min_size     = 2
      max_size     = 10
      desired_size = 3

      labels = {
        role = "general"
      }

      update_config = {
        max_unavailable = 1
      }
    }
  }
}
