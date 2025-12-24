#!/bin/bash

# Debug script to help identify the issue with msp-deployment-suite-refined.sh
echo "=== Debug Script Execution ==="
echo "Current directory: $(pwd)"
echo "Script path: $0"
echo "Arguments: $@"
echo "USER: $USER"
echo "HOME: $HOME"
echo "PATH: $PATH"
echo ""

# Check if the main script exists
if [ -f "msp-deployment-suite-refined.sh" ]; then
    echo "✅ msp-deployment-suite-refined.sh exists"
    echo "File size: $(wc -l < msp-deployment-suite-refined.sh) lines"
    echo "File permissions: $(ls -la msp-deployment-suite-refined.sh)"
else
    echo "❌ msp-deployment-suite-refined.sh not found"
    exit 1
fi

echo ""
echo "=== Syntax Check ==="
if bash -n msp-deployment-suite-refined.sh; then
    echo "✅ Syntax check passed"
else
    echo "❌ Syntax check failed"
    exit 1
fi

echo ""
echo "=== Line 1900 Content ==="
echo "Line 1900: $(sed -n '1900p' msp-deployment-suite-refined.sh)"
echo "Lines 1898-1902:"
sed -n '1898,1902p' msp-deployment-suite-refined.sh | nl -ba -v1898

echo ""
echo "=== Environment Variables ==="
echo "PROJECT_DIR would be: /opt/msp-checklist-system"
echo "OS_TYPE detection:"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "  ID: $ID"
    echo "  VERSION_ID: $VERSION_ID"
    echo "  NAME: $NAME"
else
    echo "  /etc/os-release not found"
fi

echo ""
echo "=== Test Function Execution ==="
# Test the problematic function in isolation
PROJECT_DIR="/opt/msp-checklist-system"

start_applications_test() {
    echo "Testing start_applications function..."
    echo "PROJECT_DIR: $PROJECT_DIR"
    
    if [ -d "$PROJECT_DIR" ]; then
        echo "Directory exists, would cd to: $PROJECT_DIR"
    else
        echo "Directory does not exist: $PROJECT_DIR"
    fi
    
    echo "Function test completed"
}

start_applications_test

echo ""
echo "=== Debug Complete ==="