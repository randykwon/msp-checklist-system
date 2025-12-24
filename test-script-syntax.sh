#!/bin/bash

# Simple test to check if the issue is with the script syntax
echo "Testing script syntax..."

# Test the problematic area around line 1900
echo "Testing function definition..."

start_applications() {
    echo "MSP Checklist 애플리케이션 시작 중..."
    
    PROJECT_DIR="/opt/msp-checklist-system"
    cd "$PROJECT_DIR"
    
    echo "Function test completed"
}

echo "Calling function..."
start_applications

echo "Test completed successfully"