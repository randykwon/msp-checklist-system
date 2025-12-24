# Admin Server 포트 3011 설정 가이드

## 🔍 **현재 상황 분석**

Admin 서버가 포트 3011에서 실행되도록 설정되어 있지만, 실제로 실행되지 않고 있을 수 있습니다.

## 📋 **설정 확인 체크리스트**

### **1. PM2 Ecosystem 설정**
```javascript
// /opt/msp-checklist-system/ecosystem.config.js
{
  name: 'msp-checklist-admin',
  cwd: '/opt/msp-checklist-system/msp-checklist/admin',
  script: 'npm',
  args: 'start',
  env: {
    NODE_ENV: 'production',
    PORT: 3011  // ✅ 포트 3011로 설정됨
  }
}
```

### **2. Admin 애플리케이션 package.json**
```json
{
  "scripts": {
    "start": "next start -p 3011"  // ✅ 포트 3011로 설정됨
  }
}
```

### **3. Admin .env.local**
```bash
PORT=3011  # ✅ 포트 3011로 설정됨
```

### **4. Nginx 프록시 설정**
```nginx
# /admin 경로를 포트 3011로 프록시
location /admin {
    rewrite ^/admin(/.*)$ $1 break;
    proxy_pass http://127.0.0.1:3011;  # ✅ 포트 3011로 프록시됨
}
```

## 🚀 **EC2에서 실행할 명령어들**

### **1. Admin 서버 상태 확인**
```bash
# 포트 3011 확인 스크립트 실행
sudo ./check-admin-server-port.sh
```

### **2. Admin 서버 시작**
```bash
# Admin 서버 자동 설정 및 시작
sudo ./start-admin-server.sh
```

### **3. 수동 확인 명령어들**
```bash
# PM2 상태 확인
pm2 status

# 포트 3011 리스닝 확인
netstat -tuln | grep 3011
ss -tuln | grep 3011

# 포트 3011 사용 프로세스 확인
lsof -i :3011

# HTTP 연결 테스트
curl -I http://localhost:3011
curl -I http://localhost/admin

# PM2 로그 확인
pm2 logs msp-checklist-admin
```

## 🔧 **문제 해결 방법**

### **문제 1: Admin 디렉토리가 없음**
```bash
# 해결 방법
cd /opt/msp-checklist-system/msp-checklist
mkdir -p admin/app

# 또는 자동 설정 스크립트 실행
sudo ./start-admin-server.sh
```

### **문제 2: PM2가 설치되지 않음**
```bash
# PM2 설치
sudo npm install -g pm2

# PM2로 시작
cd /opt/msp-checklist-system
pm2 start ecosystem.config.js
```

### **문제 3: Admin 서버가 시작되지 않음**
```bash
# 직접 시작
cd /opt/msp-checklist-system/msp-checklist/admin
PORT=3011 npm start

# 또는 PM2로 개별 시작
pm2 start ecosystem.config.js --only msp-checklist-admin
```

### **문제 4: 포트 3011이 이미 사용 중**
```bash
# 포트 사용 프로세스 확인
lsof -i :3011

# 프로세스 종료 (PID 확인 후)
kill -9 <PID>

# 또는 PM2 프로세스 재시작
pm2 restart msp-checklist-admin
```

### **문제 5: Nginx 프록시가 작동하지 않음**
```bash
# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx

# Nginx 상태 확인
sudo systemctl status nginx
```

## 📊 **예상 결과**

### **성공 시:**
```bash
✅ PM2 프로세스: msp-checklist-admin online
✅ 포트 3011: 리스닝 중
✅ HTTP 테스트: 200 OK
✅ Nginx 프록시: /admin 경로 정상 작동
```

### **접속 URL:**
- **직접 접속**: `http://your-server-ip:3011`
- **Nginx 프록시**: `http://your-server-ip/admin`

## 🔄 **자동 해결 스크립트**

### **완전 자동 설정:**
```bash
# 모든 문제를 자동으로 해결하는 스크립트
sudo ./start-admin-server.sh
```

### **상태 확인만:**
```bash
# 현재 상태만 확인하는 스크립트
sudo ./check-admin-server-port.sh
```

## 📝 **로그 위치**

- **PM2 Admin 로그**: `/opt/msp-checklist-system/logs/admin-*.log`
- **Nginx 로그**: `/var/log/nginx/msp-checklist-*.log`
- **실시간 로그**: `pm2 logs msp-checklist-admin`

## 🎯 **최종 확인 방법**

```bash
# 1. 포트 확인
netstat -tuln | grep 3011

# 2. HTTP 응답 확인
curl -s -o /dev/null -w "%{http_code}" http://localhost:3011

# 3. Nginx 프록시 확인
curl -s -o /dev/null -w "%{http_code}" http://localhost/admin

# 4. PM2 상태 확인
pm2 status | grep admin
```

모든 확인이 완료되면 Admin 서버가 포트 3011에서 정상적으로 실행되고 있을 것입니다.

## 🚨 **주의사항**

1. **방화벽 설정**: AWS 보안 그룹에서 포트 3011이 열려있는지 확인
2. **메모리 사용량**: Admin 서버도 메모리를 사용하므로 인스턴스 크기 고려
3. **SSL 설정**: 프로덕션에서는 HTTPS 설정 권장
4. **데이터베이스**: Admin과 메인이 같은 데이터베이스를 사용하는지 확인

---

**실행 순서**: EC2 인스턴스에서 `sudo ./start-admin-server.sh` 실행하여 모든 설정을 자동으로 완료하세요.