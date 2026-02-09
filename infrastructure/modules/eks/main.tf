module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "21.14.0"

  name               = var.name
  kubernetes_version = var.kubernetes_version

  # VPC Configuration
  vpc_id     = var.vpc_id
  subnet_ids = var.subnet_ids

  # Endpoint access configuration
  endpoint_public_access  = var.endpoint_public_access
  endpoint_private_access = var.endpoint_private_access

  # Cluster access configuration
  enable_cluster_creator_admin_permissions = var.enable_cluster_creator_admin_permissions
  authentication_mode                      = var.authentication_mode

  # Security: Enable secrets encryption with KMS
  create_kms_key                  = true
  enable_kms_key_rotation         = true
  kms_key_deletion_window_in_days = 7

  # Security & Compliance: Enable control plane logging
  enabled_log_types                      = ["audit", "api", "authenticator"]
  create_cloudwatch_log_group            = true
  cloudwatch_log_group_retention_in_days = var.cloudwatch_log_group_retention_in_days

  # EKS Managed Node Groups
  eks_managed_node_groups = var.eks_managed_node_groups

  # Enable IRSA
  enable_irsa = true

  # Tags
  tags = merge(
    {
      Terraform   = "true"
      Environment = var.environment
    },
    var.tags
  )
}
