data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  region   = var.aws_region
  env      = "dev"
  org_name = "basebandit"

  cluster_name      = "basebandit-lab"
  cluster_full_name = "${local.env}-${local.cluster_name}-cluster"

  # SecretsManager path holding ArgoCD bootstrap material (seeded in secrets.tf,
  # read by the argocd root and by External Secrets for app secrets).
  argocd_secrets_path = "/infra/argo/${local.cluster_full_name}"

  # Two AZs, matching the two-subnet-pair VPC layout.
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}
