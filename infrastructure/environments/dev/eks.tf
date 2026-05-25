locals {
  eks_access_policy = "arn:aws:eks::aws:cluster-access-policy"

  eks_access_entries = merge(
    {
      admin = {
        principal_arn = var.cluster_admin_role_arn
        policy_arn    = "${local.eks_access_policy}/AmazonEKSClusterAdminPolicy"
        access_scope  = { type = "cluster" }
      }
    },
    var.developer_role_arn != null ? {
      developer = {
        principal_arn = var.developer_role_arn
        policy_arn    = "${local.eks_access_policy}/AmazonEKSViewPolicy"
        access_scope  = { type = "namespace", namespaces = var.app_namespaces }
      }
    } : {},
  )
}

module "eks" {
  source = "../../modules/eks"

  env             = local.env
  cluster_name    = local.cluster_full_name
  cluster_version = var.cluster_version
  subnet_ids      = module.vpc.private_subnet_ids

  node_instance_types = var.node_instance_types
  node_scaling        = var.node_scaling

  public_access_cidrs = var.cluster_public_access_cidrs
  access_entries      = local.eks_access_entries
}
