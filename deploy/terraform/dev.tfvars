# Development Environment Configuration
aws_region   = "us-east-1"
project_name = "msp-checklist"
environment  = "development"

# Deployment Type
deployment_type = "ec2"

# Network Configuration
vpc_cidr             = "10.0.0.0/16"
public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs = ["10.0.3.0/24", "10.0.4.0/24"]

# EC2 Configuration (smaller instances for dev)
instance_type = "t3.small"
key_name      = "dev-key-pair"

# ECS Configuration
main_app_image  = "123456789012.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-main:dev"
admin_app_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/msp-checklist-admin:dev"

# EKS Configuration (smaller cluster for dev)
cluster_name       = "msp-checklist-dev"
node_instance_type = "t3.small"
node_desired_size  = 1
node_min_size      = 1
node_max_size      = 3

# Domain Configuration
domain_name     = "dev.msp-checklist.example.com"
certificate_arn = ""