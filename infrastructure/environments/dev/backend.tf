terraform {
  backend "s3" {
    bucket       = "zeus-tfstate-890387920780"
    key          = "dev/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true
  }
}
