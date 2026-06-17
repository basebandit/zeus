output "namespace" {
  description = "Namespace ArgoCD is installed into."
  value       = kubernetes_namespace.argocd.metadata[0].name
}
