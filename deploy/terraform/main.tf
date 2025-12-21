terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
  
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_cidr             = var.vpc_cidr
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  availability_zones   = local.azs
  
  tags = local.common_tags
}

# Security Groups Module
module "security_groups" {
  source = "./modules/security-groups"
  
  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
  
  tags = local.common_tags
}

# S3 Module
module "s3" {
  source = "./modules/s3"
  
  project_name = var.project_name
  environment  = var.environment
  account_id   = data.aws_caller_identity.current.account_id
  
  tags = local.common_tags
}

# Conditional deployment based on deployment_type
module "ec2" {
  count  = var.deployment_type == "ec2" ? 1 : 0
  source = "./modules/ec2"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  private_subnet_ids  = module.vpc.private_subnet_ids
  alb_security_group_id = module.security_groups.alb_security_group_id
  web_security_group_id = module.security_groups.web_security_group_id
  bastion_security_group_id = module.security_groups.bastion_security_group_id
  
  instance_type = var.instance_type
  key_name      = var.key_name
  s3_bucket_name = module.s3.bucket_name
  
  tags = local.common_tags
}

module "ecs" {
  count  = var.deployment_type == "ecs" ? 1 : 0
  source = "./modules/ecs"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  private_subnet_ids  = module.vpc.private_subnet_ids
  alb_security_group_id = module.security_groups.alb_security_group_id
  ecs_security_group_id = module.security_groups.ecs_security_group_id
  
  main_app_image  = var.main_app_image
  admin_app_image = var.admin_app_image
  s3_bucket_name  = module.s3.bucket_name
  
  tags = local.common_tags
}

module "eks" {
  count  = var.deployment_type == "eks" ? 1 : 0
  source = "./modules/eks"
  
  project_name = var.project_name
  environment  = var.environment
  
  vpc_id             = module.vpc.vpc_id
  public_subnet_ids  = module.vpc.public_subnet_ids
  private_subnet_ids = module.vpc.private_subnet_ids
  
  cluster_name           = var.cluster_name
  node_instance_type     = var.node_instance_type
  node_desired_size      = var.node_desired_size
  node_min_size         = var.node_min_size
  node_max_size         = var.node_max_size
  key_name              = var.key_name
  s3_bucket_name        = module.s3.bucket_name
  
  tags = local.common_tags
}