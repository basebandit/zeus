# VPC Module

Reusable Terraform module for creating AWS VPCs. Wraps the [terraform-aws-modules/vpc/aws](https://github.com/terraform-aws-modules/terraform-aws-vpc) module (v6.6.0).

## Usage

### Basic Example (Development)

```hcl
module "vpc" {
  source = "../../modules/vpc"

  name        = "zeus-dev"
  environment = "dev"
  cidr        = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  # Cost savings: single NAT gateway for dev
  enable_nat_gateway = true
  single_nat_gateway = true
}
```

### Production Example (High Availability)

```hcl
module "vpc" {
  source = "../../modules/vpc"

  name        = "zeus-prod"
  environment = "prod"
  cidr        = "10.0.0.0/16"

  azs              = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

  # High availability: one NAT gateway per AZ
  enable_nat_gateway     = true
  one_nat_gateway_per_az = true

  # Enable flow logs for compliance
  enable_flow_log = true

  tags = {
    Project = "zeus"
  }
}
```

### EKS-Ready Example

```hcl
module "vpc" {
  source = "../../modules/vpc"

  name        = "zeus-eks"
  environment = "staging"
  cidr        = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  # EKS-specific subnet tags
  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = 1
    "kubernetes.io/cluster/zeus-eks"            = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"           = 1
    "kubernetes.io/cluster/zeus-eks"            = "shared"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| name | Name of the VPC | `string` | n/a | yes |
| environment | Environment name (e.g., dev, staging, prod) | `string` | n/a | yes |
| azs | Availability zones for the VPC | `list(string)` | n/a | yes |
| cidr | CIDR block for the VPC | `string` | `"10.0.0.0/16"` | no |
| private_subnets | CIDR blocks for private subnets | `list(string)` | `[]` | no |
| public_subnets | CIDR blocks for public subnets | `list(string)` | `[]` | no |
| database_subnets | CIDR blocks for database subnets | `list(string)` | `[]` | no |
| enable_nat_gateway | Enable NAT Gateway for private subnets | `bool` | `true` | no |
| single_nat_gateway | Use a single NAT Gateway (cost savings) | `bool` | `false` | no |
| one_nat_gateway_per_az | Use one NAT Gateway per AZ (HA) | `bool` | `false` | no |
| enable_vpn_gateway | Enable VPN Gateway | `bool` | `false` | no |
| enable_flow_log | Enable VPC Flow Logs | `bool` | `false` | no |
| tags | Additional tags for all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| vpc_id | The ID of the VPC |
| vpc_arn | The ARN of the VPC |
| vpc_cidr_block | The CIDR block of the VPC |
| private_subnets | List of IDs of private subnets |
| public_subnets | List of IDs of public subnets |
| database_subnets | List of IDs of database subnets |
| database_subnet_group_name | Name of database subnet group |
| nat_public_ips | List of public Elastic IPs for NAT Gateways |
| igw_id | The ID of the Internet Gateway |
| default_security_group_id | The ID of the default security group |
