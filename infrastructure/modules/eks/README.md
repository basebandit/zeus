# EKS Module

Reusable Terraform module for creating an Amazon EKS cluster using [terraform-aws-modules/eks/aws](https://github.com/terraform-aws-modules/terraform-aws-eks) v21.14.0.

## Usage

```hcl
module "eks" {
  source = "../modules/eks"

  name               = "staging-cluster"
  kubernetes_version = "1.32"
  environment        = "staging"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  endpoint_public_access  = true
  endpoint_private_access = false

  enable_cluster_creator_admin_permissions = true
  authentication_mode                      = "API"

  eks_managed_node_groups = {
    general = {
      name           = "general"
      instance_types = ["t3.small"]
      capacity_type  = "ON_DEMAND"

      min_size     = 2
      max_size     = 10
      desired_size = 5

      labels = {
        role = "general"
      }
    }
  }

  tags = {
    Project = "my-project"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| name | Name of the EKS cluster | `string` | n/a | yes |
| kubernetes_version | Kubernetes version for the EKS cluster | `string` | `"1.32"` | no |
| vpc_id | ID of the VPC where the cluster will be deployed | `string` | n/a | yes |
| subnet_ids | List of subnet IDs for the EKS cluster | `list(string)` | n/a | yes |
| endpoint_public_access | Enable public API server endpoint access | `bool` | `true` | no |
| endpoint_private_access | Enable private API server endpoint access | `bool` | `false` | no |
| enable_cluster_creator_admin_permissions | Adds the current caller identity as an administrator | `bool` | `true` | no |
| authentication_mode | Authentication mode (API, API_AND_CONFIG_MAP, CONFIG_MAP) | `string` | `"API"` | no |
| eks_managed_node_groups | Map of EKS managed node group definitions | `any` | `{}` | no |
| environment | Environment name (e.g., dev, staging, prod) | `string` | n/a | yes |
| tags | Additional tags for all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| cluster_name | Name of the EKS cluster |
| cluster_endpoint | Endpoint for the EKS cluster API server |
| cluster_arn | ARN of the EKS cluster |
| cluster_version | Kubernetes version of the EKS cluster |
| cluster_certificate_authority_data | Base64 encoded certificate data |
| cluster_security_group_id | Security group ID attached to the EKS cluster |
| cluster_oidc_issuer_url | OIDC issuer URL for IRSA |
| oidc_provider_arn | ARN of the OIDC Provider for IRSA |
| cluster_iam_role_arn | IAM role ARN of the EKS cluster |
| eks_managed_node_groups | Map of attribute maps for all EKS managed node groups |
| eks_managed_node_groups_autoscaling_group_names | List of autoscaling group names |
| node_security_group_id | ID of the node shared security group |
