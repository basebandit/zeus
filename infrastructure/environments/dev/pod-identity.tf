# Pod Identity roles for the in-cluster platform components. These are pure AWS
# (no Kubernetes providers), so they live in the cluster root. The service
# accounts they bind to are created later by ArgoCD when it installs the
# external-secrets and image-updater Helm charts — Pod Identity associations by
# (namespace, service account) name work regardless of creation order.

data "aws_caller_identity" "current" {}

# External Secrets: read ArgoCD/app config from this account's SecretsManager.
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

# ArgoCD Image Updater: read this account's ECR (images replicate here from shared).
module "image_updater_irsa" {
  source = "../../modules/pod-identity-role"

  role_name           = "${local.cluster_full_name}-argocd-image-updater"
  cluster_name        = module.eks.cluster_name
  namespace           = "argocd"
  service_account     = "argocd-image-updater"
  managed_policy_arns = ["arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"]
}
