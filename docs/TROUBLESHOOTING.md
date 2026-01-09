# MSP 어드바이저 - 문제 해결 가이드

## 📋 목차

1. [설치 문제](#설치-문제)
2. [빌드 문제](#빌드-문제)
3. [서버 실행 문제](#서버-실행-문제)
4. [LLM API 문제](#llm-api-문제)
5. [데이터베이스 문제](#데이터베이스-문제)
6. [Nginx 문제](#nginx-문제)
7. [성능 문제](#성능-문제)

---

## 설치 문제

### Node.js 버전이 맞지 않음

**증상:**
```
error: The engine "node" is incompatible with this module
```

**해결:**
```bash
# nvm 재로드
source ~/.bashrc  # 또는 source ~/.zshrc

# Node.js 20 설치 및 사용
nvm install 20
nvm use 20
nvm alias default 20

# 버전 확인
node -v  # v20.x.x
```

### nvm 명령어를 찾을 수 없음

**증상:**
```
nvm: command not found
```

**해결:**
```bash
# nvm 재설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 셸 설정 재로드
source ~/.bashrc  # bash
source ~/.zshrc   # zsh

# 확인
nvm --version
```

### sudo로 스크립트 실행 시 Node.js 버전 문제

**증상:**
```
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   required: { node: '20.x || 22.x' },
npm warn EBADENGINE   current: { node: 'v18.20.8' }
```

**원인:** sudo로 실행하면 root 사용자의 환경을 사용하여 ec2-user의 nvm을 찾지 못함

**해결 방법 1: sudo 없이 실행 (권장)**
```bash
# 프로젝트 디렉토리 권한 변경
sudo chown -R $(whoami):$(whoami) /opt/msp-checklist-system

# sudo 없이 빌드
./scripts/install/build-all.sh
```

**해결 방법 2: 현재 사용자로 Node.js 20 설치 확인**
```bash
# nvm으로 Node.js 20 설치
nvm install 20
nvm use 20
nvm alias default 20

# 확인
node -v  # v20.x.x
```

**해결 방법 3: 시스템 전역 Node.js 20 설치**
```bash
# Amazon Linux 2023
sudo dnf module enable nodejs:20 -y
sudo dnf install nodejs -y

# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 권한 오류

**증상:**
```
EACCES: permission denied
```

**해결:**
```bash
# npm 캐시 정리
npm cache clean --force

# 권한 수정 (홈 디렉토리)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) ~/.nvm

# 설치 디렉토리 권한
sudo chown -R $(whoami) /opt/msp-advisor
```

---

## 빌드 문제

### Shared 패키지 빌드 실패

**증상:**
```
Cannot find module '@msp/shared'
```

**해결:**
```bash
# Shared 패키지 먼저 빌드
cd msp-checklist/packages/shared
npm install
npm run build

# dist 폴더 확인
ls dist/  # index.js, index.d.ts 등이 있어야 함
```

### TypeScript 컴파일 오류

**증상:**
```
error TS2307: Cannot find module
```

**해결:**
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install

# TypeScript 캐시 삭제
rm -rf .next
npm run build
```

### 메모리 부족으로 빌드 실패

**증상:**
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**해결:**
```bash
# Node.js 메모리 제한 증가
export NODE_OPTIONS="--max-old-space-size=4096"

# 빌드 재시도
npm run build
```

### 클린 빌드

모든 빌드 문제에 대한 일반적인 해결책:

```bash
# 전체 클린 빌드
./scripts/install/build-all.sh --clean

# 또는 수동으로
rm -rf msp-checklist/packages/shared/node_modules
rm -rf msp-checklist/packages/shared/dist
rm -rf msp-checklist/node_modules
rm -rf msp-checklist/.next
rm -rf msp-checklist/admin/node_modules
rm -rf msp-checklist/admin/.next

./scripts/install/build-all.sh
```

---

## 서버 실행 문제

### 포트가 이미 사용 중

**증상:**
```
Error: listen EADDRINUSE: address already in use :::3010
```

**해결:**
```bash
# 포트 사용 프로세스 확인
lsof -i :3010
lsof -i :3011

# 프로세스 종료
kill -9 <PID>

# 또는 서버 스크립트로 정리
./scripts/server-all.sh stop
./scripts/server-all.sh start
```

### PM2 프로세스 문제

**증상:**
```
pm2 status shows "errored" or "stopped"
```

**해결:**
```bash
# 로그 확인
pm2 logs --lines 100

# 프로세스 삭제 후 재시작
pm2 delete all
cd /opt/msp-advisor
pm2 start ecosystem.config.js

# PM2 저장
pm2 save
```

### 서버가 시작되지만 접속 불가

**확인 사항:**
```bash
# 1. 서버 상태 확인
./scripts/server-all.sh status

# 2. 로컬 접속 테스트
curl http://localhost:3010
curl http://localhost:3011

# 3. 방화벽 확인 (EC2)
# AWS 콘솔에서 보안 그룹 확인

# 4. iptables 확인 (Linux)
sudo iptables -L -n
```

---

## LLM API 문제

### AWS Bedrock 인증 실패

**증상:**
```
UnrecognizedClientException: The security token included in the request is invalid
```

**해결:**
```bash
# 환경 변수 확인
cat msp-checklist/.env.local | grep AWS

# 올바른 형식 확인
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=AKIA...  # 20자
AWS_SECRET_ACCESS_KEY=...   # 40자

# IAM 권한 확인 (AWS 콘솔)
# bedrock:InvokeModel 권한 필요
```

### Bedrock 모델 접근 불가

**증상:**
```
AccessDeniedException: You don't have access to the model
```

**해결:**
1. AWS 콘솔 → Bedrock → Model access
2. Claude 모델 활성화 요청
3. 승인 후 재시도

### OpenAI API 오류

**증상:**
```
401 Unauthorized
```

**해결:**
```bash
# API 키 확인
cat msp-checklist/.env.local | grep OPENAI

# 올바른 형식
OPENAI_API_KEY=sk-...

# API 키 테스트
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-..."
```

### 타임아웃 오류

**증상:**
```
TimeoutError: Request timed out
```

**해결:**
```bash
# Nginx 타임아웃 증가
# /etc/nginx/conf.d/msp-advisor.conf
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;

sudo systemctl reload nginx
```

---

## 데이터베이스 문제

### 데이터베이스 잠금

**증상:**
```
SQLITE_BUSY: database is locked
```

**해결:**
```bash
# 서버 재시작
./scripts/server-all.sh restart

# 또는 잠금 파일 삭제
rm msp-checklist/*.db-journal
rm msp-checklist/*.db-wal
rm msp-checklist/*.db-shm
```

### 데이터베이스 손상

**증상:**
```
SQLITE_CORRUPT: database disk image is malformed
```

**해결:**
```bash
# 백업에서 복구
cp /opt/msp-advisor/backups/latest/*.db /opt/msp-advisor/msp-checklist/

# 또는 새 데이터베이스 생성 (데이터 손실)
rm msp-checklist/*.db
./scripts/server-all.sh restart
```

### 테이블이 없음

**증상:**
```
SQLITE_ERROR: no such table
```

**해결:**
```bash
# 서버 재시작 (자동 테이블 생성)
./scripts/server-all.sh restart

# 또는 수동으로 테이블 확인
sqlite3 msp-checklist/msp-assessment.db ".tables"
```

---

## Nginx 문제

### 502 Bad Gateway

**원인:** 백엔드 서버가 실행되지 않음

**해결:**
```bash
# 백엔드 확인
pm2 status
curl http://localhost:3010

# 백엔드 시작
./scripts/server-all.sh start
```

### 504 Gateway Timeout

**원인:** 요청 처리 시간 초과

**해결:**
```nginx
# /etc/nginx/conf.d/msp-advisor.conf
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

```bash
sudo systemctl reload nginx
```

### SSL 인증서 오류

**증상:**
```
NET::ERR_CERT_DATE_INVALID
```

**해결:**
```bash
# 인증서 갱신
sudo certbot renew

# 강제 갱신
sudo certbot renew --force-renewal

# Nginx 재시작
sudo systemctl restart nginx
```

---

## 성능 문제

### 느린 응답 시간

**확인:**
```bash
# 서버 리소스 확인
top
free -m
df -h

# PM2 메트릭
pm2 monit
```

**해결:**
```bash
# Node.js 메모리 증가
export NODE_OPTIONS="--max-old-space-size=4096"
pm2 restart all

# 또는 인스턴스 업그레이드 (EC2)
```

### 메모리 누수

**증상:** 시간이 지남에 따라 메모리 사용량 증가

**해결:**
```bash
# PM2 자동 재시작 설정
pm2 start ecosystem.config.js --max-memory-restart 1G

# 또는 주기적 재시작 (cron)
0 4 * * * pm2 restart all
```

### 디스크 공간 부족

**확인:**
```bash
df -h
du -sh /opt/msp-advisor/*
```

**해결:**
```bash
# 로그 정리
pm2 flush

# 오래된 백업 삭제
find /opt/msp-advisor/backups -type d -mtime +7 -exec rm -rf {} +

# npm 캐시 정리
npm cache clean --force
```

---

## 로그 확인 방법

### PM2 로그
```bash
# 전체 로그
pm2 logs

# 특정 앱 로그
pm2 logs msp-main
pm2 logs msp-admin

# 최근 100줄
pm2 logs --lines 100
```

### 시스템 로그
```bash
# Nginx 로그
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 시스템 로그
sudo journalctl -u nginx -f
```

### 애플리케이션 로그
```bash
# 메인 앱
tail -f /opt/msp-advisor/logs/main-combined.log

# Admin 앱
tail -f /opt/msp-advisor/logs/admin-combined.log
```

---

## 지원 요청

문제가 해결되지 않으면 다음 정보와 함께 이슈를 등록해주세요:

1. 오류 메시지 전체
2. 실행한 명령어
3. 환경 정보:
   ```bash
   node -v
   npm -v
   cat /etc/os-release
   pm2 status
   ```
4. 관련 로그 (민감 정보 제거)
