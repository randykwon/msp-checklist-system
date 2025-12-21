output "alb_security_group_id" {
  description = "ALB Security Group ID"
  value       = aws_security_group.alb.id
}

output "web_security_group_id" {
  description = "Web Security Group ID"
  value       = aws_security_group.web.id
}

output "ecs_security_group_id" {
  description = "ECS Security Group ID"
  value       = aws_security_group.ecs.id
}

output "bastion_security_group_id" {
  description = "Bastion Security Group ID"
  value       = aws_security_group.bastion.id
}

output "eks_cluster_security_group_id" {
  description = "EKS Cluster Security Group ID"
  value       = aws_security_group.eks_cluster.id
}

output "eks_nodes_security_group_id" {
  description = "EKS Nodes Security Group ID"
  value       = aws_security_group.eks_nodes.id
}

output "efs_security_group_id" {
  description = "EFS Security Group ID"
  value       = aws_security_group.efs.id
}