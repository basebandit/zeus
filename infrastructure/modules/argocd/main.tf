resource "kubernetes_namespace" "argocd" {
  metadata {
    name = var.argocd_namespace
  }
}

# ===========================================================================
# ArgoCD's own bootstrap secrets (plain core/v1 Secrets — no CRDs, so no
# kubectl_manifest/gavinbunney needed). Terraform owns these so ArgoCD can pull
# the repo and authenticate immediately. App-level secrets are handled later by
# External Secrets, which ArgoCD itself installs from git.
# ===========================================================================
resource "kubernetes_secret" "repo" {
  metadata {
    name      = "zeus-repo"
    namespace = kubernetes_namespace.argocd.metadata[0].name
    labels = {
      "argocd.argoproj.io/secret-type" = "repository"
    }
  }

  data = {
    url           = var.repo_url
    sshPrivateKey = var.repo_ssh_private_key
    enableLfs     = var.repo_enable_lfs
    insecure      = var.repo_insecure
  }
}

resource "kubernetes_secret" "argocd" {
  metadata {
    name      = "argocd-secret"
    namespace = kubernetes_namespace.argocd.metadata[0].name
    labels = {
      "app.kubernetes.io/name"    = "argocd-secret"
      "app.kubernetes.io/part-of" = "argocd"
    }
  }

  data = {
    "admin.password"      = bcrypt(var.admin_password)
    "admin.passwordMtime" = var.admin_password_mtime
    "server.secretkey"    = var.server_secret_key
  }

  # bcrypt() re-hashes on every plan (random salt); ignore drift on the hash so
  # we don't churn the secret. Rotate by changing var.admin_password_mtime.
  lifecycle {
    ignore_changes = [data["admin.password"]]
  }
}

# ===========================================================================
# ArgoCD server
# ===========================================================================
resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = var.argocd_chart_version
  namespace  = kubernetes_namespace.argocd.metadata[0].name
  timeout    = var.helm_timeout

  values = [file(var.argocd_values_file)]

  # argocd-secret must exist first (chart is configured with createSecret=false).
  depends_on = [kubernetes_secret.argocd]
}

# ===========================================================================
# Root app-of-apps. The argocd-apps chart renders Applications/AppProjects via
# Helm (server-side at apply), so no Application CRD is required at plan time.
# From here ArgoCD takes over: external-secrets, image-updater, the
# ClusterSecretStore, and workloads are all synced from git.
# ===========================================================================
resource "helm_release" "argocd_apps" {
  name       = "argocd-apps"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argocd-apps"
  version    = var.argocd_apps_chart_version
  namespace  = kubernetes_namespace.argocd.metadata[0].name
  timeout    = var.helm_timeout

  values = [file(var.argocd_apps_values_file)]

  depends_on = [
    helm_release.argocd,
    kubernetes_secret.repo,
  ]
}
