# Nginx + Node.js 빠른 시작 가이드

## 🚀 5분 만에 설정하기

### 1. 자동 설정 스크립트 실행
```bash
cd /path/to/msp-checklist-system
chmod +x deploy/setup-nginx-node.sh
./deploy/setup-nginx-node.sh
```

### 2. 애플리케이션 배포
```bash
# 애플리케이션 빌드 및 배포
./deploy/deploy-app.sh

# PM2로 시작
cd /opt/msp-checklist
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. 설정 검증
```bash
./deploy/validate-setup.sh
```

## 📋 체크리스트

### 배포 전
- [ ] 도메인 DNS 설정 완료
- [ ] 서버 방화벽 포트 80, 443 열기
- [ ] Node.js 20.9.0+ 설치

### 배포 후
- [ ] PM2 프로세스 정상 실행 (`pm2 status`)
- [ ] Nginx 프록시 동작 확인 (`curl http://localhost`)
- [ ] 도메인 접속 테스트
- [ ] SSL 인증서 설정 (선택사항)

## 🔗 접속 주소

- **메인 서비스**: http://your-domain.com
- **관리자 시스템**: http://your-domain.com/admin
- **직접 접속**: http://your-domain.com:3010 (메인), http://your-domain.com:3011 (관리자)

## 🛠️ 유용한 명령어

```bash
# 상태 확인
pm2 status
sudo systemctl status nginx

# 로그 확인
pm2 logs
sudo tail -f /var/log/nginx/msp-checklist-*.log

# 재시작
pm2 restart all
sudo systemctl restart nginx

# 모니터링
./deploy/monitor.sh
./deploy/health-check.sh
```

## 🔧 문제 해결

### Nginx 502 Bad Gateway
```bash
# Node.js 앱 상태 확인
pm2 status

# 포트 확인
sudo netstat -tlnp | grep -E "(3010|3011)"

# Nginx 에러 로그 확인
sudo tail -f /var/log/nginx/error.log
```

### SSL 인증서 문제
```bash
# 인증서 상태 확인
sudo certbot certificates

# 수동 갱신
sudo certbot renew

# Nginx 재시작
sudo systemctl restart nginx
```

## 📚 추가 문서

- [상세 설정 가이드](NGINX_NODE_SETUP_GUIDE.md)
- [AWS 배포 가이드](AWS_DEPLOYMENT_GUIDE.md)
- [빠른 배포 스크립트](deploy/quick-deploy.sh)