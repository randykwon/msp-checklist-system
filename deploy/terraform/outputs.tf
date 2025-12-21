output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = module.s3.bucket_name
}

# EC2 Outputs
output "ec2_load_balancer_dns" {
  description = "EC2 Load Balancer DNS name"
  value       = var.deployment_type == "ec2" ? module.ec2[0].load_balancer_dns : null
}

output "ec2_main_app_url" {
  description = "EC2 Main Application URL"
  value       = var.deployment_type == "ec2" ? "http://${module.ec2[0].load_balancer_dns}" : null
}

output "ec2_admin_app_url" {
  description = "EC2 Admin Application URL"
  value       = var.deployment_type == "ec2" ? "http://${module.ec2[0].load_balancer_dns}/admin" : null
}

output "ec2_bastion_ip" {
  description = "EC2 Bastion Host Public IP"
  value       = var.deployment_type == "ec2" ? module.ec2[0].bastion_public_ip : null
}

# ECS Outputs
output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = var.deployment_type == "ecs" ? module.ecs[0].cluster_name : null
}

output "ecs_load_balancer_dns" {
  description = "ECS Load Balancer DNS name"
  value       = var.deployment_type == "ecs" ? module.ecs[0].load_balancer_dns : null
}

output "ecs_main_app_url" {
  description = "ECS Main Application URL"
  value       = var.deployment_type == "ecs" ? "http://${module.ecs[0].load_balancer_dns}" : null
}

output "ecs_admin_app_url" {
  description = "ECS Admin Application URL"
  value       = var.deployment_type == "ecs" ? "http://${module.ecs[0].load_balancer_dns}/admin" : null
}

output "ecs_efs_file_system_id" {
  description = "ECS EFS File System ID"
  value       = var.deployment_type == "ecs" ? module.ecs[0].efs_file_system_id : null
}

# EKS Outputs
output "eks_cluster_name" {
  description = "EKS Cluster name"
  value       = var.deployment_type == "eks" ? module.eks[0].cluster_name : null
}

output "eks_cluster_endpoint" {
  description = "EKS Cluster endpoint"
  value       = var.deployment_type == "eks" ? module.eks[0].cluster_endpoint : null
}

output "eks_cluster_security_group_id" {
  description = "EKS Cluster security group ID"
  value       = var.deployment_type == "eks" ? module.eks[0].cluster_security_group_id : null
}

output "eks_node_security_group_id" {
  description = "EKS Node security group ID"
  value       = var.deployment_type == "eks" ? module.eks[0].node_security_group_id : null
}

output "eks_efs_file_system_id" {
  description = "EKS EFS File System ID"
  value       = var.deployment_type == "eks" ? module.eks[0].efs_file_system_id : null
}

output "eks_kubectl_command" {
  description = "Command to configure kubectl"
  value       = var.deployment_type == "eks" ? "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks[0].cluster_name}" : null
}

# Service Account Role ARNs for EKS
output "eks_aws_load_balancer_controller_role_arn" {
  description = "AWS Load Balancer Controller Role ARN"
  value       = var.deployment_type == "eks" ? module.eks[0].aws_load_balancer_controller_role_arn : null
}

output "eks_ebs_csi_driver_role_arn" {
  description = "EBS CSI Driver Role ARN"
  value       = var.deployment_type == "eks" ? module.eks[0].ebs_csi_driver_role_arn : null
}

output "eks_efs_csi_driver_role_arn" {
  description = "EFS CSI Driver Role ARN"
  value       = var.deployment_type == "eks" ? module.eks[0].efs_csi_driver_role_arn : null
}