#!/bin/bash

# Nginx 디버깅 스크립트

echo "🔍 Nginx 디버깅 정보"
echo "===================="

echo ""
echo "1. Nginx 프로세스 상태:"
ps aux | grep nginx | grep -v grep || echo "Nginx 프로세스 없음"

echo ""
echo "2. 포트 사용 상태:"
sudo netstat -tuln | grep -E ':80|:3010|:3011' || echo "관련 포트 사용 없음"

echo ""
echo "3. Nginx 설정 테스트:"
sudo nginx -t

echo ""
echo "4. Nginx 설정 파일들:"
echo "conf.d 디렉토리:"
ls -la /etc/nginx/conf.d/

echo ""
echo "5. 최근 Nginx 에러 로그:"
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "에러 로그 없음"

echo ""
echo "6. systemd 상태:"
sudo systemctl status nginx --no-pager -l

echo ""
echo "7. 방화벽 상태 (iptables):"
sudo iptables -L INPUT | head -10

echo ""
echo "8. SELinux 상태:"
getenforce 2>/dev/null || echo "SELinux 없음"

echo ""
echo "디버깅 완료!"