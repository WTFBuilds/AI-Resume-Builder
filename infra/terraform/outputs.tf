output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "ecr_web_repository" {
  value = aws_ecr_repository.web.repository_url
}

output "ecr_worker_repository" {
  value = aws_ecr_repository.worker.repository_url
}

output "exports_bucket" {
  value = aws_s3_bucket.exports.bucket
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "db_secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}
