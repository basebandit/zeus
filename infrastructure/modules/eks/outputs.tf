output "cluster_name" {
  description = "Name of the EKS cluster."
  value       = aws_eks_cluster.this.name
}

output "cluster_endpoint" {
  description = "Kubernetes API server endpoint."
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_ca" {
  description = "Base64-encoded certificate authority data for the cluster."
  value       = aws_eks_cluster.this.certificate_authority[0].data
}

output "oidc_issuer" {
  description = "OIDC issuer URL of the cluster."
  value       = aws_eks_cluster.this.identity[0].oidc[0].issuer
}

output "node_role_name" {
  description = "Name of the node group IAM role."
  value       = aws_iam_role.nodes.name
}

output "node_role_arn" {
  description = "ARN of the node group IAM role."
  value       = aws_iam_role.nodes.arn
}
