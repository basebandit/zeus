variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "eu-central-1"
}

variable "cluster_state_bucket" {
  description = "S3 bucket holding the dev cluster root's Terraform state."
  type        = string
  default     = "zeus-tfstate-890387920780"
}

variable "cluster_state_region" {
  description = "Region of the cluster state bucket."
  type        = string
  default     = "eu-west-1"
}
