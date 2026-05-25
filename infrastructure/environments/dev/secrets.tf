# ArgoCD bootstrap secrets, generated and stored in SecretsManager (read by the
# argocd root). After apply, register the output public key as a GitHub deploy
# key (write — Image Updater pushes tag bumps). SSH key is in state; keep backend encrypted.

resource "random_password" "argocd_admin" {
  length  = 24
  special = false
}

resource "random_password" "argocd_server_key" {
  length  = 32
  special = false
}

resource "tls_private_key" "zeus_repo" {
  algorithm = "ED25519"
}

resource "time_static" "admin_password_mtime" {
  triggers = {
    password = random_password.argocd_admin.result
  }
}

resource "aws_secretsmanager_secret" "admin_password" {
  name                    = "${local.argocd_secrets_path}/admin-password"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "admin_password" {
  secret_id     = aws_secretsmanager_secret.admin_password.id
  secret_string = random_password.argocd_admin.result
}

resource "aws_secretsmanager_secret" "admin_password_mtime" {
  name                    = "${local.argocd_secrets_path}/admin-password-mtime"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "admin_password_mtime" {
  secret_id     = aws_secretsmanager_secret.admin_password_mtime.id
  secret_string = time_static.admin_password_mtime.rfc3339
}

resource "aws_secretsmanager_secret" "server_secret_key" {
  name                    = "${local.argocd_secrets_path}/server-secret-key"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "server_secret_key" {
  secret_id     = aws_secretsmanager_secret.server_secret_key.id
  secret_string = random_password.argocd_server_key.result
}

resource "aws_secretsmanager_secret" "zeus_repo_config" {
  name                    = "${local.argocd_secrets_path}/zeus-repo-config"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "zeus_repo_config" {
  secret_id = aws_secretsmanager_secret.zeus_repo_config.id
  secret_string = jsonencode({
    url           = var.argocd_repo_url
    sshPrivateKey = tls_private_key.zeus_repo.private_key_openssh
    enableLfs     = "true"
    insecure      = "false"
  })
}
