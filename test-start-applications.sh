#!/bin/bash

# Test the start_applications function in isolation
PROJECT_DIR="/opt/msp-checklist-system"

log_step() { echo "[STEP] $1"; }
log_success() { echo "[SUCCESS] $1"; }
log_warning() { echo "[WARNING] $1"; }

start_applications() {
    log_step "MSP Checklist 애플리케이션 시작 중..."
    
    echo "PROJECT_DIR is: $PROJECT_DIR"
    echo "Attempting to cd to: $PROJECT_DIR"
    
    if [ -d "$PROJECT_DIR" ]; then
        cd "$PROJECT_DIR"
        echo "Successfully changed to: $(pwd)"
    else
        echo "Directory does not exist: $PROJECT_DIR"
        return 1
    fi
    
    # Test PM2 commands (but don't actually run them)
    echo "Would run: pm2 start ecosystem.config.js"
    echo "Would run: pm2 save"
    echo "Would run: pm2 startup"
    
    # Simulate status check
    echo "Would check PM2 status"
    PM2_STATUS="0"
    
    if [ "$PM2_STATUS" -gt 0 ]; then
        log_success "✅ MSP Checklist 애플리케이션 시작 완료 ($PM2_STATUS개 프로세스)"
    else
        log_warning "⚠️ 일부 애플리케이션 시작 실패"
        echo "Would run: pm2 status"
    fi
}

echo "Testing start_applications function..."
start_applications
echo "Test completed"