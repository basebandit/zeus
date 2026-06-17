resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  # AWS no longer requires thumbprint validation for GitHub's OIDC provider
  # (since mid-2023), but the field is still required by the API.
  # This is a documented placeholder; AWS validates against its own root CA store.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  tags = {
    Name      = "github-actions-oidc"
    ManagedBy = "terraform"
  }
}
