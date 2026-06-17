resource "kubernetes_namespace" "argocd" {
  metadata {
    name = var.argocd_namespace
  }
}

# Plain core/v1 Secrets (no CRDs) so ArgoCD can pull the repo and authenticate
# immediately. App-level secrets come later from External Secrets, via git.
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

  # bcrypt() re-hashes each plan; ignore the hash and rotate via admin_password_mtime.
  lifecycle {
    ignore_changes = [data["admin.password"]]
  }
}

resource "helm_release" "argocd" {
  name       = "argocd"
  repository = "https://argoproj.github.io/argo-helm"
  chart      = "argo-cd"
  version    = var.argocd_chart_version
  namespace  = kubernetes_namespace.argocd.metadata[0].name
  timeout    = var.helm_timeout

  values = [file(var.argocd_values_file)]

  depends_on = [kubernetes_secret.argocd]
}

# Root app-of-apps. The argocd-apps chart renders Applications via Helm, so no
# Application CRD is needed at plan time. ArgoCD then syncs everything from git.
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
