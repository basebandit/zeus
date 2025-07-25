output "vpc_id" {
  value = aws_vpc.main.id
  description = "VPC id"
}

output "vpc_arn" {
  value = aws_vpc.main.arn
  description = "VPC arn"
}

output "vpc_name" {
  value       = aws_vpc.main.tags["Name"]
  description = "Name tag of the VPC"
}

output "vpc_cidr_block" {
  value = aws_vpc.main.cidr_block
  description = "VPC main cidr block"
}

output "availability_zones" {
  value       = local.azs
  description = "AZs used for subnets"
}

output "vpc_private_subnet_cidr_blocks" {
  value = [aws_subnet.private_zone1.cidr_block, aws_subnet.private_zone2.cidr_block ]
  description = "List of private subnet cidr blocks"
}

output "vpc_public_subnet_cidr_blocks" {
  value = [aws_subnet.public_zone1.cidr_block, aws_subnet.public_zone2.cidr_block ]
   description = "List of public subnet cidr blocks"
}

output "vpc_nat_gateway_static_public_ip" {
  value = aws_eip.nat.public_ip
}

output "private_subnet_ids" {
  value = [aws_subnet.private_zone1.id, aws_subnet.private_zone2.id]
  description = "List of private subnet IDs"
}

output "public_subnet_ids" {
  value = [aws_subnet.public_zone1.id, aws_subnet.public_zone2.id]
  description = "List of public subnet IDs"
}

output "private_route_table_id" {
  value       = aws_route_table.private.id
  description = "Route table for private subnets"
}

output "public_route_table_id" {
  value       = aws_route_table.public.id
  description = "Route table for public subnets"
}

output "internet_gateway_id" {
  value       = aws_internet_gateway.igw.id
  description = "ID of the Internet Gateway"
}

output "nat_gateway_id" {
  value       = aws_nat_gateway.nat.id
  description = "ID of the NAT Gateway"
}
