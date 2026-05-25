# ArgoCD bootstrap installer: installs ArgoCD + its own secrets + the root
# app-of-apps. Everything else is delivered by ArgoCD from git.

variable "argocd_namespace" {
  type    = string
  default = "argocd"
}

variable "argocd_values_file" {
  type        = string
  description = "Path to the argo-cd Helm values file."
}

variable "argocd_apps_values_file" {
  type        = string
  description = "Path to the argocd-apps Helm values file (root projects + ApplicationSet)."
}

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
