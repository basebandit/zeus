# Lean ArgoCD bootstrap installer.
#
# Installs ArgoCD, seeds ONLY ArgoCD's own bootstrap secrets (repo credentials
# and the admin/server secret), and installs the root app-of-apps. Everything
# else — external-secrets, image-updater, ClusterSecretStore, workloads — is
# delivered by ArgoCD from git. No AWS or kubectl providers: the caller reads
# secret material from SecretsManager and passes it in.

variable "argocd_namespace" {
  type    = string
  default = "argocd"
}

# -- Helm values files (owned by the caller / git) --------------------------
variable "argocd_values_file" {
  type        = string
  description = "Path to the argo-cd Helm values file."
}

variable "argocd_apps_values_file" {
  type        = string
  description = "Path to the argocd-apps Helm values file (root projects + ApplicationSet)."
}

# -- Chart versions ----------------------------------------------------------
variable "argocd_chart_version" {
  type    = string
  default = "8.2.2"
}

variable "argocd_apps_chart_version" {
  type    = string
  default = "2.0.2"
}

variable "helm_timeout" {
  type        = number
  description = "Timeout in seconds for Helm releases."
  default     = 600
}

# -- Repository credentials (core Secret, so ArgoCD can pull immediately) ----
variable "repo_url" {
  type        = string
  description = "Git URL ArgoCD pulls from (e.g. git@github.com:basebandit/zeus.git)."
}

variable "repo_ssh_private_key" {
  type        = string
  description = "SSH private key for the repo. Read from SecretsManager by the caller."
  sensitive   = true
}

variable "repo_enable_lfs" {
  type    = string
  default = "true"
}

variable "repo_insecure" {
  type    = string
  default = "false"
}

# -- ArgoCD admin / server secret --------------------------------------------
variable "admin_password" {
  type        = string
  description = "Plaintext ArgoCD admin password. Stored bcrypt-hashed in argocd-secret."
  sensitive   = true
}

variable "admin_password_mtime" {
  type        = string
  description = "RFC3339 timestamp of the admin password's last change."
}

variable "server_secret_key" {
  type        = string
  description = "ArgoCD server signing key (server.secretkey)."
  sensitive   = true
}
