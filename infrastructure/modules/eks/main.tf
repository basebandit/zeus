# ---------------------------------------------------------------------------
# Control plane
# ---------------------------------------------------------------------------
resource "aws_iam_role" "cluster" {
  name = "${var.cluster_name}-eks-cluster"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cluster" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

resource "aws_eks_cluster" "this" {
  name     = var.cluster_name
  version  = var.cluster_version
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    endpoint_private_access = var.endpoint_private_access
    endpoint_public_access  = var.endpoint_public_access
    subnet_ids              = var.subnet_ids
  }

  access_config {
    authentication_mode                         = "API"
    bootstrap_cluster_creator_admin_permissions = true
  }

  depends_on = [aws_iam_role_policy_attachment.cluster]
}

# ---------------------------------------------------------------------------
# Node group
# ---------------------------------------------------------------------------
resource "aws_iam_role" "nodes" {
  name = "${var.cluster_name}-eks-nodes"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "nodes" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
  ])
  policy_arn = each.value
  role       = aws_iam_role.nodes.name
}

resource "aws_eks_node_group" "general" {
  cluster_name    = aws_eks_cluster.this.name
  version         = var.cluster_version
  node_group_name = "general"
  node_role_arn   = aws_iam_role.nodes.arn
  subnet_ids      = var.subnet_ids

  capacity_type  = var.node_capacity_type
  instance_types = var.node_instance_types

  scaling_config {
    desired_size = var.node_scaling.desired
    max_size     = var.node_scaling.max
    min_size     = var.node_scaling.min
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    role = "general"
  }

  depends_on = [aws_iam_role_policy_attachment.nodes]

  # Let cluster-autoscaler manage desired_size without a Terraform diff.
  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# ---------------------------------------------------------------------------
# Pod Identity Agent (used instead of IRSA for service-account IAM)
# ---------------------------------------------------------------------------
resource "aws_eks_addon" "pod_identity" {
  cluster_name  = aws_eks_cluster.this.name
  addon_name    = "eks-pod-identity-agent"
  addon_version = var.pod_identity_addon_version
}
