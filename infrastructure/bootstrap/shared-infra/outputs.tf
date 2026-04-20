output "terraform_state_bucket_name" {
  value = aws_s3_bucket.tf_state.bucket
}

output "cloudtrail_logs_bucket_name" {
  value = aws_s3_bucket.cloudtrail_logs.bucket
}
