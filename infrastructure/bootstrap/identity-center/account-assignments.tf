resource "aws_ssoadmin_account_assignment" "admin" {
  for_each = var.account_ids

  instance_arn       = tolist(data.aws_ssoadmin_instances.this.arns)[0]
  permission_set_arn = data.aws_ssoadmin_permission_set.admin.arn

  principal_id   = data.aws_identitystore_user.admin.user_id
  principal_type = "USER"

  target_id   = each.value
  target_type = "AWS_ACCOUNT"
}
