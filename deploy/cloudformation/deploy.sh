#!/bin/bash

# MSP Checklist CloudFormation Deployment Script
# Usage: ./deploy.sh [DEPLOYMENT_TYPE] [ENVIRONMENT] [STACK_NAME]

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
STACK_NAME=${3:-"msp-checklist-${DEPLOYMENT_TYPE}-${ENVIRONMENT}"}
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

echo -e "${BLUE}🚀 MSP Checklist CloudFormation Deployment${NC}"
echo -e "${BLUE}===========================================${NC}"
echo -e "Deployment Type: ${GREEN}${DEPLOYMENT_TYPE}${NC}"
echo -e "Environment: ${GREEN}${ENVIRONMENT}${NC}"
echo -e "Stack Name: ${GREEN}${STACK_NAME}${NC}"
echo -e "AWS Region: ${GREEN}${AWS_REGION}${NC}"
echo ""

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
TEMPLATE_FILE="${SCRIPT_DIR}/${DEPLOYMENT_TYPE}-stack.yaml"

# Check if template file exists
if [[ ! -f "$TEMPLATE_FILE" ]]; then
    echo -e "${RED}❌ Error: Template file not found: ${TEMPLATE_FILE}${NC}"
    exit 1
fi

# Validate CloudFormation template
echo -e "${YELLOW}🔍 Validating CloudFormation template...${NC}"
if aws cloudformation validate-template --template-body file://"$TEMPLATE_FILE" --region "$AWS_REGION" > /dev/null; then
    echo -e "${GREEN}✅ Template validation successful${NC}"
else
    echo -e "${RED}❌ Template validation failed${NC}"
    exit 1
fi

# Check if stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" 2>/dev/null || echo "false")

# Prepare parameters
PARAMETERS=""

# Common parameters
PARAMETERS+="ParameterKey=Environment,ParameterValue=${ENVIRONMENT} "

# Deployment-specific parameters
case $DEPLOYMENT_TYPE in
    "ec2")
        # Prompt for EC2 key pair if not set
        if [[ -z "$EC2_KEY_NAME" ]]; then
            echo -e "${YELLOW}📝 Please enter EC2 Key Pair name for SSH access:${NC}"
            read -r EC2_KEY_NAME
        fi
        PARAMETERS+="ParameterKey=KeyName,ParameterValue=${EC2_KEY_NAME} "
        
        # Optional instance type
        if [[ -n "$INSTANCE_TYPE" ]]; then
            PARAMETERS+="ParameterKey=InstanceType,ParameterValue=${INSTANCE_TYPE} "
        fi
        ;;
    "ecs")
        # Prompt for Docker images if not set
        if [[ -z "$MAIN_APP_IMAGE" ]]; then
            echo -e "${YELLOW}📝 Please enter Main App Docker image URI:${NC}"
            read -r MAIN_APP_IMAGE
        fi
        if [[ -z "$ADMIN_APP_IMAGE" ]]; then
            echo -e "${YELLOW}📝 Please enter Admin App Docker image URI:${NC}"
            read -r ADMIN_APP_IMAGE
        fi
        PARAMETERS+="ParameterKey=MainAppImage,ParameterValue=${MAIN_APP_IMAGE} "
        PARAMETERS+="ParameterKey=AdminAppImage,ParameterValue=${ADMIN_APP_IMAGE} "
        ;;
    "eks")
        # Optional cluster name
        if [[ -n "$CLUSTER_NAME" ]]; then
            PARAMETERS+="ParameterKey=ClusterName,ParameterValue=${CLUSTER_NAME} "
        fi
        
        # Optional node group settings
        if [[ -n "$NODE_INSTANCE_TYPE" ]]; then
            PARAMETERS+="ParameterKey=NodeGroupInstanceType,ParameterValue=${NODE_INSTANCE_TYPE} "
        fi
        if [[ -n "$NODE_DESIRED_SIZE" ]]; then
            PARAMETERS+="ParameterKey=NodeGroupDesiredSize,ParameterValue=${NODE_DESIRED_SIZE} "
        fi
        ;;
esac

# Optional domain name
if [[ -n "$DOMAIN_NAME" ]]; then
    PARAMETERS+="ParameterKey=DomainName,ParameterValue=${DOMAIN_NAME} "
fi

# Deploy or update stack
if [[ "$STACK_EXISTS" != "false" ]]; then
    echo -e "${YELLOW}🔄 Updating existing stack...${NC}"
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://"$TEMPLATE_FILE" \
        --parameters $PARAMETERS \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION"
    
    echo -e "${YELLOW}⏳ Waiting for stack update to complete...${NC}"
    aws cloudformation wait stack-update-complete \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION"
else
    echo -e "${YELLOW}🆕 Creating new stack...${NC}"
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://"$TEMPLATE_FILE" \
        --parameters $PARAMETERS \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region "$AWS_REGION" \
        --enable-termination-protection
    
    echo -e "${YELLOW}⏳ Waiting for stack creation to complete...${NC}"
    aws cloudformation wait stack-create-complete \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION"
fi

# Get stack outputs
echo -e "${GREEN}✅ Stack deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Stack Outputs:${NC}"
aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

# Display useful information
echo ""
echo -e "${BLUE}🔗 Useful Links:${NC}"
echo -e "CloudFormation Console: https://${AWS_REGION}.console.aws.amazon.com/cloudformation/home?region=${AWS_REGION}#/stacks/stackinfo?stackId=${STACK_NAME}"

# Get application URLs if available
MAIN_APP_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`MainAppURL`].OutputValue' \
    --output text 2>/dev/null || echo "")

ADMIN_APP_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$AWS_REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`AdminAppURL`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [[ -n "$MAIN_APP_URL" && "$MAIN_APP_URL" != "None" ]]; then
    echo -e "Main Application: ${GREEN}${MAIN_APP_URL}${NC}"
fi

if [[ -n "$ADMIN_APP_URL" && "$ADMIN_APP_URL" != "None" ]]; then
    echo -e "Admin Application: ${GREEN}${ADMIN_APP_URL}${NC}"
fi

# EKS specific instructions
if [[ "$DEPLOYMENT_TYPE" == "eks" ]]; then
    CLUSTER_NAME_OUTPUT=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`EKSClusterName`].OutputValue' \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$CLUSTER_NAME_OUTPUT" && "$CLUSTER_NAME_OUTPUT" != "None" ]]; then
        echo ""
        echo -e "${YELLOW}📝 Next Steps for EKS:${NC}"
        echo -e "1. Configure kubectl: ${GREEN}aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME_OUTPUT}${NC}"
        echo -e "2. Install AWS Load Balancer Controller"
        echo -e "3. Install EBS CSI Driver"
        echo -e "4. Install EFS CSI Driver"
        echo -e "5. Deploy your applications using Helm charts"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"