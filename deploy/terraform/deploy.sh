#!/bin/bash

# MSP Checklist Terraform Deployment Script
# Usage: ./deploy.sh [DEPLOYMENT_TYPE] [ENVIRONMENT] [ACTION]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEPLOYMENT_TYPE=${1:-"ec2"}
ENVIRONMENT=${2:-"production"}
ACTION=${3:-"apply"}
AWS_REGION=${AWS_REGION:-"us-east-1"}

# Validate deployment type
if [[ ! "$DEPLOYMENT_TYPE" =~ ^(ec2|ecs|eks)$ ]]; then
    echo -e "${RED}❌ Error: Invalid deployment type. Must be 'ec2', 'ecs', or 'eks'${NC}"
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}❌ Error: Invalid environment. Must be 'development', 'staging', or 'production'${NC}"
    exit 1
fi

# Validate action
if [[ ! "$ACTION" =~ ^(plan|apply|destroy|init|validate)$ ]]; then
    echo -e "${RED}❌ Error: Invalid action. Must be 'plan', 'apply', 'destroy', 'init', or 'validate'${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 MSP Checklist Terraform Deployment${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "Deployment Type: ${GREEN}${DEPLOYMENT_TYPE}${NC}"
echo -e "Environment: ${GREEN}${ENVIRONMENT}${NC}"
echo -e "Action: ${GREEN}${ACTION}${NC}"
echo -e "AWS Region: ${GREEN}${AWS_REGION}${NC}"
echo ""

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Error: Terraform is not installed${NC}"
    echo -e "${YELLOW}💡 Install Terraform: https://learn.hashicorp.com/tutorials/terraform/install-cli${NC}"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ Error: AWS credentials not configured${NC}"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if tfvars file exists
TFVARS_FILE="${ENVIRONMENT}.tfvars"
if [[ ! -f "$TFVARS_FILE" ]]; then
    echo -e "${YELLOW}⚠️  Warning: ${TFVARS_FILE} not found, using terraform.tfvars.example${NC}"
    if [[ -f "terraform.tfvars.example" ]]; then
        cp terraform.tfvars.example "$TFVARS_FILE"
        echo -e "${YELLOW}📝 Please edit ${TFVARS_FILE} with your configuration${NC}"
        echo -e "${YELLOW}Press Enter to continue after editing the file...${NC}"
        read -r
    else
        echo -e "${RED}❌ Error: No tfvars file found${NC}"
        exit 1
    fi
fi

# Set Terraform workspace
WORKSPACE="${ENVIRONMENT}-${DEPLOYMENT_TYPE}"

# Initialize Terraform if needed
if [[ "$ACTION" == "init" ]] || [[ ! -d ".terraform" ]]; then
    echo -e "${YELLOW}🔧 Initializing Terraform...${NC}"
    terraform init
fi

# Create or select workspace
echo -e "${YELLOW}🏗️  Setting up Terraform workspace: ${WORKSPACE}${NC}"
if terraform workspace list | grep -q "$WORKSPACE"; then
    terraform workspace select "$WORKSPACE"
else
    terraform workspace new "$WORKSPACE"
fi

# Set deployment type variable
export TF_VAR_deployment_type="$DEPLOYMENT_TYPE"
export TF_VAR_environment="$ENVIRONMENT"
export TF_VAR_aws_region="$AWS_REGION"

# Execute Terraform action
case $ACTION in
    "validate")
        echo -e "${YELLOW}🔍 Validating Terraform configuration...${NC}"
        terraform validate
        echo -e "${GREEN}✅ Terraform configuration is valid${NC}"
        ;;
    "plan")
        echo -e "${YELLOW}📋 Creating Terraform plan...${NC}"
        terraform plan -var-file="$TFVARS_FILE" -out="tfplan-${WORKSPACE}"
        echo -e "${GREEN}✅ Terraform plan created successfully${NC}"
        echo -e "${BLUE}💡 Review the plan above and run with 'apply' to execute${NC}"
        ;;
    "apply")
        # Run plan first if no plan file exists
        if [[ ! -f "tfplan-${WORKSPACE}" ]]; then
            echo -e "${YELLOW}📋 Creating Terraform plan...${NC}"
            terraform plan -var-file="$TFVARS_FILE" -out="tfplan-${WORKSPACE}"
        fi
        
        echo -e "${YELLOW}🚀 Applying Terraform configuration...${NC}"
        terraform apply "tfplan-${WORKSPACE}"
        
        # Clean up plan file
        rm -f "tfplan-${WORKSPACE}"
        
        echo -e "${GREEN}✅ Terraform apply completed successfully!${NC}"
        
        # Show outputs
        echo ""
        echo -e "${BLUE}📋 Terraform Outputs:${NC}"
        terraform output
        
        # Display useful information
        echo ""
        echo -e "${BLUE}🔗 Useful Information:${NC}"
        
        # Get application URLs if available
        MAIN_APP_URL=""
        ADMIN_APP_URL=""
        
        case $DEPLOYMENT_TYPE in
            "ec2")
                MAIN_APP_URL=$(terraform output -raw ec2_main_app_url 2>/dev/null || echo "")
                ADMIN_APP_URL=$(terraform output -raw ec2_admin_app_url 2>/dev/null || echo "")
                BASTION_IP=$(terraform output -raw ec2_bastion_ip 2>/dev/null || echo "")
                if [[ -n "$BASTION_IP" && "$BASTION_IP" != "null" ]]; then
                    echo -e "Bastion Host: ${GREEN}${BASTION_IP}${NC}"
                fi
                ;;
            "ecs")
                MAIN_APP_URL=$(terraform output -raw ecs_main_app_url 2>/dev/null || echo "")
                ADMIN_APP_URL=$(terraform output -raw ecs_admin_app_url 2>/dev/null || echo "")
                CLUSTER_NAME=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "")
                if [[ -n "$CLUSTER_NAME" && "$CLUSTER_NAME" != "null" ]]; then
                    echo -e "ECS Cluster: ${GREEN}${CLUSTER_NAME}${NC}"
                fi
                ;;
            "eks")
                CLUSTER_NAME=$(terraform output -raw eks_cluster_name 2>/dev/null || echo "")
                KUBECTL_CMD=$(terraform output -raw eks_kubectl_command 2>/dev/null || echo "")
                if [[ -n "$CLUSTER_NAME" && "$CLUSTER_NAME" != "null" ]]; then
                    echo -e "EKS Cluster: ${GREEN}${CLUSTER_NAME}${NC}"
                fi
                if [[ -n "$KUBECTL_CMD" && "$KUBECTL_CMD" != "null" ]]; then
                    echo -e "Configure kubectl: ${GREEN}${KUBECTL_CMD}${NC}"
                fi
                ;;
        esac
        
        if [[ -n "$MAIN_APP_URL" && "$MAIN_APP_URL" != "null" ]]; then
            echo -e "Main Application: ${GREEN}${MAIN_APP_URL}${NC}"
        fi
        
        if [[ -n "$ADMIN_APP_URL" && "$ADMIN_APP_URL" != "null" ]]; then
            echo -e "Admin Application: ${GREEN}${ADMIN_APP_URL}${NC}"
        fi
        
        # EKS specific instructions
        if [[ "$DEPLOYMENT_TYPE" == "eks" ]]; then
            echo ""
            echo -e "${YELLOW}📝 Next Steps for EKS:${NC}"
            echo -e "1. Configure kubectl using the command above"
            echo -e "2. Install AWS Load Balancer Controller"
            echo -e "3. Install EBS CSI Driver"
            echo -e "4. Install EFS CSI Driver"
            echo -e "5. Deploy your applications using Helm charts in deploy/eks/"
        fi
        ;;
    "destroy")
        echo -e "${RED}⚠️  WARNING: This will destroy all resources!${NC}"
        echo -e "${YELLOW}Type 'yes' to confirm destruction:${NC}"
        read -r CONFIRM
        
        if [[ "$CONFIRM" == "yes" ]]; then
            echo -e "${YELLOW}🗑️  Destroying Terraform resources...${NC}"
            terraform destroy -var-file="$TFVARS_FILE" -auto-approve
            echo -e "${GREEN}✅ Resources destroyed successfully${NC}"
        else
            echo -e "${BLUE}❌ Destruction cancelled${NC}"
        fi
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Terraform ${ACTION} completed successfully!${NC}"