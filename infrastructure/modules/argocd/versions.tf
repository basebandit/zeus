terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.49"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.0.2"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
    # gavinbunney/kubectl applies raw manifests at apply-time without a
    # plan-time CRD check, which the official kubernetes_manifest resource
    # cannot do. The External Secrets CRDs (ClusterSecretStore, ExternalSecret)
    # do not exist until the external-secrets Helm release is installed, so we
    # need a resource that tolerates that ordering.
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
  }
}
