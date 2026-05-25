resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.env}-main"
  }
}

# Private-only VPC: nodes have no public IPs and no internet route. Egress to AWS
# services is via VPC endpoints below (no NAT gateway). Public subnets / IGW are
# intentionally omitted until internet-facing ingress is actually needed.
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]

  tags = {
    "Name"                                           = "${var.env}-private-${var.azs[count.index]}"
    "kubernetes.io/role/internal-elb"                = "1"
    "kubernetes.io/cluster/${var.cluster_full_name}" = "owned"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.env}-private"
  }
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ---------------------------------------------------------------------------
# VPC endpoints — let private nodes reach AWS without a NAT gateway.
# ---------------------------------------------------------------------------

# S3 gateway endpoint (free). ECR stores image layers in S3.
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = {
    Name = "${var.env}-s3"
  }
}

# Security group for the interface endpoints: HTTPS from within the VPC.
resource "aws_security_group" "endpoints" {
  name        = "${var.env}-vpc-endpoints"
  description = "Allow HTTPS from the VPC to interface endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  # No egress rule: interface endpoints only respond to ingress, they don't
  # initiate outbound connections. Omitting egress = deny-all out.

  tags = {
    Name = "${var.env}-vpc-endpoints"
  }
}

resource "aws_vpc_endpoint" "interface" {
  for_each = toset(var.interface_endpoint_services)

  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.${each.value}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "${var.env}-${each.value}"
  }
}
