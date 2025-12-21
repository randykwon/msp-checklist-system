# Production Environment Configuration
aws_region   = "us-east-1"
project_name = "msp-checklist"
environment  = "production"

# Deployment Type
deployment_type = "ec2"

# Network Configuration
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.3.0/24", "10.0.4.0/24"]

# EC2 Configuration
instance_type = "t3.medium"
key_name      = "prod-key-pair"

# ECS Configuration
main_app_image  = "123456789012.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-main:latest"
admin_app_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-admin:latest"

# EKS Configuration
cluster_name       = "msp-checklist-prod"
node_instance_type = "t3.medium"
node_desired_size  = 2
node_min_size      = 1
node_max_size      = 5

# Domain Configuration
domain_name     = "msp-checklist.example.com"
certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"