terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }

  # Remote state is required for any non-local run:
  #   terraform init -backend-config="bucket=<tf-state-bucket>" ...
  backend "s3" {
    # populated via -backend-config in CI
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "airesume"
      ManagedBy = "terraform"
      Product   = "AIResume (wtfbuilds)"
    }
  }
}
