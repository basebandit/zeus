resource "helm_release" "argocd" {
  name = "argocd"

  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
  create_namespace = true

  timeout = 600 # Increase timeout to 10 minutes

  values = [file("${path.module}/../../charts/argocd/argocd-server/staging-argocd-values.yaml")]

  version = "8.2.2" # chart version - https://github.com/argoproj/argo-helm/blob/argo-cd-8.2.2/charts/argo-cd/Chart.yaml

  depends_on = [module.eks]
}

resource "helm_release" "argocd_apps" {
  name = "argocd-apps"

  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argocd-apps"
  namespace        = "argocd"
  create_namespace = true

  timeout = 600 # Increase timeout to 10 minutes

  values = [file("${path.module}/../../charts/argocd/argocd-apps/_project-app-sets/staging-project-app-set.yaml")]

  version = "2.0.2" # chart version - https://github.com/argoproj/argo-helm/blob/argocd-apps-2.0.2/charts/argocd-apps/Chart.yaml

  depends_on = [module.eks]
}

