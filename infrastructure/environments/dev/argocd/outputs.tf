output "argocd_namespace" {
  description = "Namespace ArgoCD is installed into."
  value       = module.argocd.namespace
}
