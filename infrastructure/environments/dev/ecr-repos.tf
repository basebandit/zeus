# Pre-create the replica repos so they get a lifecycle policy — ECR auto-created
# replicas inherit none, so images would accumulate forever.
module "ecr" {
  source = "../../modules/ecr"

  repository_names = ["orders", "payments", "inventory"]
  keep_last_images = 20

  pull_account_ids      = []
  reader_principal_arns = []
}
