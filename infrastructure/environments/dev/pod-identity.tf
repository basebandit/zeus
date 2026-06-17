# Pod Identity roles for external-secrets and image-updater. Pure AWS, so they
# live in the cluster root; the service accounts are created later by ArgoCD.

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "external_secrets" {
  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      "secretsmanager:ListSecrets",
    ]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${local.argocd_secrets_path}/*",
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${local.argocd_secrets_path}*",
    ]
  }
}

module "external_secrets_irsa" {
  source = "../../modules/pod-identity-role"

  role_name          = "${local.cluster_full_name}-external-secrets"
  cluster_name       = module.eks.cluster_name
  namespace          = "external-secrets"
  service_account    = "external-secrets"
  inline_policy_json = data.aws_iam_policy_document.external_secrets.json
}

module "image_updater_irsa" {
  source = "../../modules/pod-identity-role"

  role_name           = "${local.cluster_full_name}-argocd-image-updater"
  cluster_name        = module.eks.cluster_name
  namespace           = "argocd"
  service_account     = "argocd-image-updater"
  managed_policy_arns = ["arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"]
}
