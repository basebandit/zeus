data "aws_iam_policy_document" "external_secrets_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["pods.eks.amazonaws.com"]
    }

    actions = [
      "sts:AssumeRole",
      "sts:TagSession"
    ]
  }
}

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "external_secrets_permissions" {
  statement {
    effect = "Allow"

    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
      "secretsmanager:ListSecrets"
    ]

    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:/infra/argo/*"
    ]
  }
}

resource "aws_iam_policy" "external_secrets_policy" {
  name   = "${module.eks.cluster_name}-external-secrets-access"
  policy = data.aws_iam_policy_document.external_secrets_permissions.json
}

resource "aws_iam_role" "external_secrets" {
  name               = "${module.eks.cluster_name}-external-secrets-provider"
  assume_role_policy = data.aws_iam_policy_document.external_secrets_assume_role.json
}

resource "aws_iam_role_policy_attachment" "external_secrets" {
  policy_arn = aws_iam_policy.external_secrets_policy.arn
  role       = aws_iam_role.external_secrets.name
}

resource "aws_eks_pod_identity_association" "external_secrets" {
  cluster_name    = module.eks.cluster_name
  namespace       = "external-secrets"
  service_account = "external-secrets"
  role_arn        = aws_iam_role.external_secrets.arn
}

# data "aws_eks_cluster" "eks" {
#   name = module.eks.cluster_name
#   depends_on = [module.eks]  # Add this
# }

# data "aws_eks_cluster_auth" "eks" {
#   name = module.eks.cluster_name
#   depends_on = [module.eks]  # Add this
# }
resource "helm_release" "external_secrets" {
  name = "external-secrets"

  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  namespace        = "external-secrets"
  create_namespace = true

  timeout = 600 # Increase timeout to 10 minutes

  depends_on = [
    module.eks,
    aws_eks_pod_identity_association.external_secrets,
  ]
}

resource "null_resource" "configure_kubectl" {
  provisioner "local-exec" {
    command = "aws --profile ${var.aws_profile} eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
  }

  depends_on = [module.eks]

  triggers = {
    cluster_name = module.eks.cluster_name
  }
}

resource "null_resource" "aws_secretsmanager_store" {
  provisioner "local-exec" {
    command = "kubectl apply -f ${path.module}/../../charts/argocd/argocd-server/argocd-config/staging/external-secrets-provider.yaml"
  }

  # Only create, don't manage updates or deletes
  provisioner "local-exec" {
    when    = destroy
    command = "echo 'Skipping delete - managed by ArgoCD'"
  }

  depends_on = [helm_release.external_secrets]

  # Only run once during bootstrap
  triggers = {
    cluster_id = module.eks.cluster_arn
  }
}

resource "null_resource" "argocd_external_secret" {
  provisioner "local-exec" {
    command = "kubectl apply -f ${path.module}/../../charts/argocd/argocd-server/argocd-config/staging/argocd-secret.yaml"
  }

  # Don't delete on destroy - let ArgoCD manage it
  provisioner "local-exec" {
    when    = destroy
    command = "echo 'Skipping delete - managed by ArgoCD'"
  }

  depends_on = [null_resource.aws_secretsmanager_store]

  # Only run once during bootstrap, don't track file changes
  triggers = {
    cluster_id = module.eks.cluster_arn
  }
}

resource "null_resource" "argocd_git_repo_external_secret" {
  provisioner "local-exec" {
    command = "kubectl apply -f ${path.module}/../../charts/argocd/argocd-server/argocd-config/staging/git-repo-secret.yaml"
  }

  # Don't delete on destroy - let ArgoCD manage it
  provisioner "local-exec" {
    when    = destroy
    command = "echo 'Skipping delete - managed by ArgoCD'"
  }

  depends_on = [null_resource.aws_secretsmanager_store]

  # Only run once during bootstrap, don't track file changes
  triggers = {
    cluster_id = module.eks.cluster_arn
  }
}