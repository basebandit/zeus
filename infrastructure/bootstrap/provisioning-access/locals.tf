locals {
  github_oidc_provider_url = "https://token.actions.githubusercontent.com"

  github_branch_subjects = [
    for branch in var.github_branches :
    "repo:${var.github_owner}/${var.github_repository}:ref:refs/heads/${branch}"
  ]
}
