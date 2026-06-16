data "aws_caller_identity" "current" {}

locals {
  secrets_path_prefix = coalesce(var.secrets_path_prefix, "/infra/argo/${var.cluster_name}")
}

# ===========================================================================
# ArgoCD server
# ===========================================================================
resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = var.argocd_chart_version
  namespace        = "argocd"
  create_namespace = true
  timeout          = var.helm_timeout

  values = [file(var.argocd_values_file)]
}

# ===========================================================================
# External Secrets Operator (delivers ArgoCD admin + repo secrets from SecretsManager)
# ===========================================================================
data "aws_iam_policy_document" "external_secrets_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole", "sts:TagSession"]
    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "external_secrets_perms" {
  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      "secretsmanager:ListSecrets",
    ]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${local.secrets_path_prefix}/*",
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${local.secrets_path_prefix}*",
    ]
  }
}

resource "aws_iam_role" "external_secrets" {
  name               = "${var.cluster_name}-external-secrets-provider"
  assume_role_policy = data.aws_iam_policy_document.external_secrets_assume.json
}

resource "aws_iam_policy" "external_secrets" {
  name   = "${var.cluster_name}-external-secrets-access"
  policy = data.aws_iam_policy_document.external_secrets_perms.json
}

resource "aws_iam_role_policy_attachment" "external_secrets" {
  role       = aws_iam_role.external_secrets.name
  policy_arn = aws_iam_policy.external_secrets.arn
}

resource "aws_eks_pod_identity_association" "external_secrets" {
  cluster_name    = var.cluster_name
  namespace       = "external-secrets"
  service_account = "external-secrets"
  role_arn        = aws_iam_role.external_secrets.arn
}

resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  namespace        = "external-secrets"
  create_namespace = true
  timeout          = var.helm_timeout

  depends_on = [aws_eks_pod_identity_association.external_secrets]
}

# ===========================================================================
# ArgoCD config manifests (replaces the legacy null_resource + kubectl --profile)
# ===========================================================================
resource "kubectl_manifest" "cluster_secret_store" {
  yaml_body = templatefile("${path.module}/templates/external-secrets-provider.yaml.tftpl", {
    region = var.aws_region
  })

  depends_on = [helm_release.external_secrets]
}

resource "kubectl_manifest" "argocd_secret" {
  yaml_body = templatefile("${path.module}/templates/argocd-secret.yaml.tftpl", {
    secrets_path_prefix = local.secrets_path_prefix
  })

  depends_on = [kubectl_manifest.cluster_secret_store, helm_release.argocd]
}

resource "kubectl_manifest" "git_repo_secret" {
  yaml_body = templatefile("${path.module}/templates/git-repo-secret.yaml.tftpl", {
    secrets_path_prefix = local.secrets_path_prefix
  })

  depends_on = [kubectl_manifest.cluster_secret_store, helm_release.argocd]
}

# ===========================================================================
# ArgoCD Image Updater
# ===========================================================================
data "aws_iam_policy_document" "image_updater_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole", "sts:TagSession"]
    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "image_updater" {
  name               = "${var.cluster_name}-argocd-image-updater"
  assume_role_policy = data.aws_iam_policy_document.image_updater_assume.json
}

# Same-account ECR read. AmazonEC2ContainerRegistryReadOnly covers
# GetAuthorizationToken (account-scoped) and pull/list on this account's repos.
resource "aws_iam_role_policy_attachment" "image_updater_ecr" {
  role       = aws_iam_role.image_updater.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# Cross-account ECR: when the registry lives in another account (e.g. shared),
# allow the image-updater role to assume the reader role provided by that
# account. The auth script in the Helm values uses this to fetch a token.
resource "aws_iam_role_policy" "image_updater_assume_ecr" {
  count = var.ecr_pull_role_arn != null ? 1 : 0
  name  = "${var.cluster_name}-image-updater-assume-ecr"
  role  = aws_iam_role.image_updater.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sts:AssumeRole"
      Resource = var.ecr_pull_role_arn
    }]
  })
}

resource "aws_eks_pod_identity_association" "image_updater" {
  cluster_name    = var.cluster_name
  namespace       = "argocd"
  service_account = "argocd-image-updater"
  role_arn        = aws_iam_role.image_updater.arn
}

resource "helm_release" "image_updater" {
  name       = "argocd-image-updater"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argocd-image-updater"
  version    = var.image_updater_chart_version
  namespace  = "argocd"
  timeout    = var.helm_timeout

  values = [file(var.image_updater_values_file)]

  depends_on = [helm_release.argocd]
}

# ===========================================================================
# ArgoCD Applications / ApplicationSet (app-of-apps via the argocd-apps chart)
# ===========================================================================
resource "helm_release" "argocd_apps" {
  name             = "argocd-apps"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argocd-apps"
  version          = var.argocd_apps_chart_version
  namespace        = "argocd"
  create_namespace = true
  timeout          = var.helm_timeout

  values = [file(var.argocd_apps_values_file)]

  # Needs the repo credentials secret to exist so generated Applications can sync.
  depends_on = [
    helm_release.argocd,
    kubectl_manifest.git_repo_secret,
  ]
}
