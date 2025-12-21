#!/bin/bash

# MSP Checklist 모니터링 스크립트

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         MSP Checklist 시스템 모니터링 대시보드            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 시스템 정보
echo -e "${BLUE}[시스템 정보]${NC}"
echo "호스트명: $(hostname)"
echo "OS: $(lsb_release -d | cut -f2)"
echo "커널: $(uname -r)"
echo "가동 시간: $(uptime -p)"
echo ""

# CPU 사용률
echo -e "${BLUE}[CPU 사용률]${NC}"
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')
echo "CPU 사용률: $CPU_USAGE"
echo ""

# 메모리 사용률
echo -e "${BLUE}[메모리 사용률]${NC}"
free -h | grep -E "Mem|Swap"
echo ""

# 디스크 사용률
echo -e "${BLUE}[디스크 사용률]${NC}"
df -h | grep -E "Filesystem|/$|/opt"
echo ""

# PM2 프로세스 상태
echo -e "${BLUE}[애플리케이션 상태]${NC}"
if command -v pm2 &> /dev/null; then
    pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status) (CPU: \(.monit.cpu)%, Memory: \(.monit.memory / 1024 / 1024 | floor)MB)"' 2>/dev/null || pm2 status
else
    echo "PM2가 설치되지 않았습니다."
fi
echo ""

# 네트워크 연결
echo -e "${BLUE}[네트워크 연결]${NC}"
echo "활성 연결 수:"
netstat -an | grep ESTABLISHED | wc -l
echo ""

# 포트 상태
echo -e "${BLUE}[포트 상태]${NC}"
echo "포트 3010 (메인): $(sudo netstat -tlnp | grep :3010 | awk '{print $6}')"
echo "포트 3011 (관리자): $(sudo netstat -tlnp | grep :3011 | awk '{print $6}')"
echo "포트 80 (HTTP): $(sudo netstat -tlnp | grep :80 | awk '{print $6}')"
echo "포트 443 (HTTPS): $(sudo netstat -tlnp | grep :443 | awk '{print $6}')"
echo ""

# Nginx 상태
echo -e "${BLUE}[Nginx 상태]${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx 실행 중${NC}"
    echo "활성 연결: $(curl -s http://localhost/nginx_status 2>/dev/null | grep 'Active connections' || echo 'N/A')"
else
    echo -e "${RED}✗ Nginx 중지됨${NC}"
fi
echo ""

# 최근 로그 (에러만)
echo -e "${BLUE}[최근 에러 로그]${NC}"
if [ -f "/opt/msp-checklist/logs/msp-main-error.log" ]; then
    echo "메인 애플리케이션 에러:"
    tail -n 5 /opt/msp-checklist/logs/msp-main-error.log 2>/dev/null || echo "에러 없음"
fi
echo ""

if [ -f "/opt/msp-checklist/logs/msp-admin-error.log" ]; then
    echo "관리자 애플리케이션 에러:"
    tail -n 5 /opt/msp-checklist/logs/msp-admin-error.log 2>/dev/null || echo "에러 없음"
fi
echo ""

# 데이터베이스 크기
echo -e "${BLUE}[데이터베이스 크기]${NC}"
if [ -f "/opt/msp-checklist/msp-checklist/msp-assessment.db" ]; then
    echo "메인 DB: $(du -h /opt/msp-checklist/msp-checklist/msp-assessment.db | cut -f1)"
fi
if [ -f "/opt/msp-checklist/msp-checklist/admin/msp-assessment.db" ]; then
    echo "관리자 DB: $(du -h /opt/msp-checklist/msp-checklist/admin/msp-assessment.db | cut -f1)"
fi
echo ""

# 백업 상태
echo -e "${BLUE}[백업 상태]${NC}"
if [ -d "/opt/msp-checklist/backups" ]; then
    BACKUP_COUNT=$(ls -1 /opt/msp-checklist/backups/*.gz 2>/dev/null | wc -l)
    LATEST_BACKUP=$(ls -t /opt/msp-checklist/backups/*.gz 2>/dev/null | head -1)
    echo "백업 파일 수: $BACKUP_COUNT"
    if [ ! -z "$LATEST_BACKUP" ]; then
        echo "최근 백업: $(basename $LATEST_BACKUP)"
        echo "백업 시간: $(stat -c %y $LATEST_BACKUP | cut -d'.' -f1)"
    fi
else
    echo "백업 디렉토리가 없습니다."
fi
echo ""

# SSL 인증서 상태
echo -e "${BLUE}[SSL 인증서 상태]${NC}"
if command -v certbot &> /dev/null; then
    sudo certbot certificates 2>/dev/null | grep -E "Certificate Name|Expiry Date" || echo "SSL 인증서 없음"
else
    echo "Certbot이 설치되지 않았습니다."
fi
echo ""

# 시스템 부하
echo -e "${BLUE}[시스템 부하]${NC}"
uptime
echo ""

# 상위 프로세스
echo -e "${BLUE}[CPU 사용률 상위 5개 프로세스]${NC}"
ps aux --sort=-%cpu | head -6
echo ""

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    모니터링 완료                           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo "유용한 명령어:"
echo "- 실시간 모니터링: watch -n 5 ./monitor.sh"
echo "- PM2 모니터링: pm2 monit"
echo "- 로그 확인: pm2 logs"
echo "- 시스템 리소스: htop"
echo ""