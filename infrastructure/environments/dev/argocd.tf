module "argocd" {
  source = "../../modules/argocd"

  providers = {
    aws        = aws
    helm       = helm
    kubernetes = kubernetes
    kubectl    = kubectl
  }

  env          = local.env
  cluster_name = module.eks.cluster_name
  aws_region   = var.aws_region

  # Images replicate from shared into this account, so the registry is local.
  ecr_account_id    = coalesce(var.ecr_account_id, var.dev_account_id)
  ecr_region        = var.ecr_region
  ecr_pull_role_arn = var.ecr_pull_role_arn # null: same-account, no assume-role needed

  argocd_values_file        = "${path.module}/../../../charts/argocd/argocd-server/dev-argocd-values.yaml"
  argocd_apps_values_file   = "${path.module}/../../../charts/argocd/argocd-apps/_project-app-sets/dev-project-app-set.yaml"
  image_updater_values_file = "${path.module}/../../../charts/argocd/argocd-server/dev-argocd-image-updater-values.yaml"

  depends_on = [module.eks]
}
