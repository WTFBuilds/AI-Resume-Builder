variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (staging | production)"
  type        = string
  default     = "staging"
}

variable "app_domain" {
  description = "Public domain served by CloudFront/ALB (e.g. airesume.com)"
  type        = string
  default     = ""
}

variable "container_image_web" {
  description = "ECR image URI:tag for the web app"
  type        = string
  default     = "" # set via tfvars in CI
}

variable "container_image_worker" {
  description = "ECR image URI:tag for the export worker"
  type        = string
  default     = ""
}

variable "web_task_count" {
  type    = number
  default = 2
}

variable "worker_task_count" {
  type    = number
  default = 1
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.medium"
}

variable "db_multi_az" {
  type    = bool
  default = false # true for production
}
