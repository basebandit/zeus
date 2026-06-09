data "aws_ssoadmin_instances" "this" {}

data "aws_identitystore_user" "admin" {
  identity_store_id = tolist(data.aws_ssoadmin_instances.this.identity_store_ids)[0]

  alternate_identifier {
    unique_attribute {
      attribute_path  = "UserName"
      attribute_value = var.identity_center_username
    }
  }
}

data "aws_ssoadmin_permission_set" "admin" {
  instance_arn = tolist(data.aws_ssoadmin_instances.this.arns)[0]
  name         = var.permission_set_name
}
