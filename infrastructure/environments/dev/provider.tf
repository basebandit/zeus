terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.49"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.12"
    }
  }
}

# Cluster root: AWS only. No in-cluster providers here, so the cluster can be
# planned and applied in a single pass. ArgoCD is installed by the separate
# bootstrap root (environments/dev/bootstrap), which runs after this.
provider "aws" {
  region = var.aws_region
}
