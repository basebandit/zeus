data "terraform_remote_state" "cluster" {
  backend = "s3"
  config = {
    bucket = var.cluster_state_bucket
    key    = "dev/terraform.tfstate"
    region = var.cluster_state_region
  }
}

# ArgoCD bootstrap material seeded by the cluster root in SecretsManager.
data "aws_secretsmanager_secret_version" "admin_password" {
  secret_id = "${data.terraform_remote_state.cluster.outputs.argocd_secrets_path_prefix}/admin-password"
}

data "aws_secretsmanager_secret_version" "admin_password_mtime" {
  secret_id = "${data.terraform_remote_state.cluster.outputs.argocd_secrets_path_prefix}/admin-password-mtime"
}

data "aws_secretsmanager_secret_version" "server_secret_key" {
  secret_id = "${data.terraform_remote_state.cluster.outputs.argocd_secrets_path_prefix}/server-secret-key"
}

data "aws_secretsmanager_secret_version" "zeus_repo_config" {
  secret_id = "${data.terraform_remote_state.cluster.outputs.argocd_secrets_path_prefix}/zeus-repo-config"
}

locals {
  charts   = "${path.module}/../../../../charts/argocd"
  repo_cfg = jsondecode(data.aws_secretsmanager_secret_version.zeus_repo_config.secret_string)
}

module "argocd" {
  source = "../../../modules/argocd"

  providers = {
    helm       = helm
    kubernetes = kubernetes
  }

  argocd_values_file      = "${local.charts}/install/dev/argocd-values.yaml"
  argocd_apps_values_file = "${local.charts}/install/dev/appsets.yaml"

  repo_url             = local.repo_cfg.url
  repo_ssh_private_key = local.repo_cfg.sshPrivateKey
  repo_enable_lfs      = local.repo_cfg.enableLfs
  repo_insecure        = local.repo_cfg.insecure

  admin_password       = data.aws_secretsmanager_secret_version.admin_password.secret_string
  admin_password_mtime = data.aws_secretsmanager_secret_version.admin_password_mtime.secret_string
  server_secret_key    = data.aws_secretsmanager_secret_version.server_secret_key.secret_string
}
