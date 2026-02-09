module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "6.6.0"

  name = var.name
  cidr = var.cidr

  azs              = var.azs
  private_subnets  = var.private_subnets
  public_subnets   = var.public_subnets
  database_subnets = var.database_subnets

  # NAT Gateway configuration
  enable_nat_gateway     = var.enable_nat_gateway
  single_nat_gateway     = var.single_nat_gateway
  one_nat_gateway_per_az = var.one_nat_gateway_per_az

  # VPN Gateway
  enable_vpn_gateway = var.enable_vpn_gateway

  # DNS
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support

  # Database subnet group
  create_database_subnet_group       = var.create_database_subnet_group
  create_database_subnet_route_table = var.create_database_subnet_route_table

  # Flow logs
  enable_flow_log           = var.enable_flow_log
  flow_log_destination_type = var.flow_log_destination_type

  # Tags
  tags = merge(
    {
      Terraform   = "true"
      Environment = var.environment
    },
    var.tags
  )

  public_subnet_tags = merge(
    {
      "Type" = "public"
    },
    var.public_subnet_tags
  )

  private_subnet_tags = merge(
    {
      "Type" = "private"
    },
    var.private_subnet_tags
  )
}
