# 포트 설정 수정 완료 상태

## 🎯 **수정된 포트 설정**

### **메인 웹 서비스: 3010 포트**
- ✅ **package.json**: `"dev": "next dev -p 3010"`, `"start": "next start -p 3010"`
- ✅ **ecosystem.config.js**: `PORT: 3010`
- ✅ **README.md**: 포트 3000 → 3010으로 수정
- ✅ **SETUP_GUIDE.md**: 모든 3000 참조를 3010으로 수정
- ✅ **CLAUDE.md**: 포트 정보 업데이트

### **Admin 시스템: 3011 포트**
- ✅ **Admin package.json**: `"dev": "next dev -p 3011"`, `"start": "next start -p 3011"`
- ✅ **ecosystem.config.js**: `PORT: 3011`
- ✅ **모든 설정 파일**: 3011 포트로 통일

## 🔧 **수정된 파일 목록**

### **1. 애플리케이션 설정 파일**
- `README.md` - 포트 다이어그램 수정
- `SETUP_GUIDE.md` - 포트 충돌 해결 가이드 수정
- `CLAUDE.md` - 포트 정보 업데이트
- `msp-checklist/package.json` - 이미 3010으로 설정됨 ✅
- `msp-checklist/admin/package.json` - 이미 3011로 설정됨 ✅
- `deploy/ecosystem.config.js` - 이미 올바르게 설정됨 ✅

### **2. 인프라 설정 파일**
- `deploy/cloudformation/ec2-stack.yaml` - 보안 그룹 및 타겟 그룹 포트 수정
- `deploy/cloudformation/ecs-stack.yaml` - 컨테이너 포트 및 타겟 그룹 수정
- `deploy/terraform/modules/security-groups/main.tf` - 보안 그룹 규칙 수정

### **3. 포트 충돌 해결 스크립트**
- `fix-admin-port-3011.sh` - 포트 3000 → 3010 확인으로 변경
- `fix-admin-port-3011-macos.sh` - 포트 3000 → 3010 확인으로 변경
- `ultimate-turbopack-css-fix-macos.sh` - 포트 정리 로직 수정

## 📊 **포트 사용 현황**

### **변경 전**
```
포트 3000: 메인 서비스 (문서상)
포트 3001: Admin 서비스 (실제 실행됨 - 잘못됨)
포트 3010: 메인 서비스 (실제 설정됨)
포트 3011: Admin 서비스 (목표 포트)
```

### **변경 후**
```
포트 3010: 메인 서비스 (통일됨) ✅
포트 3011: Admin 서비스 (통일됨) ✅
```

## 🚀 **AWS 인프라 설정 수정**

### **CloudFormation 템플릿**
- **EC2 스택**: 보안 그룹 3000 → 3010, 타겟 그룹 3000 → 3010
- **ECS 스택**: 컨테이너 포트 3000 → 3010, 타겟 그룹 3000 → 3010

### **Terraform 모듈**
- **보안 그룹**: Web 서버 및 ECS 보안 그룹 3000 → 3010

### **방화벽 설정**
- **Ubuntu (ufw)**: `sudo ufw allow 3010`
- **Amazon Linux (firewalld)**: `sudo firewall-cmd --permanent --add-port=3010/tcp`

## 🔍 **확인 방법**

### **1. 포트 사용 확인**
```bash
# 메인 서비스 (3010)
lsof -i :3010
curl -I http://localhost:3010

# Admin 서비스 (3011)
lsof -i :3011
curl -I http://localhost:3011
```

### **2. 설정 파일 확인**
```bash
# package.json 스크립트 확인
grep -r "3010" msp-checklist/package.json
grep -r "3011" msp-checklist/admin/package.json

# ecosystem.config.js 확인
grep -A 5 -B 5 "PORT" deploy/ecosystem.config.js
```

### **3. 인프라 설정 확인**
```bash
# CloudFormation 템플릿 확인
grep -r "3010" deploy/cloudformation/
grep -r "3011" deploy/cloudformation/

# Terraform 모듈 확인
grep -r "3010" deploy/terraform/
grep -r "3011" deploy/terraform/
```

## ⚠️ **주의사항**

### **1. 기존 배포된 인프라**
- 이미 배포된 AWS 인프라가 있다면 업데이트 필요
- CloudFormation 스택 업데이트 또는 Terraform apply 실행

### **2. 로드 밸런서 설정**
- ALB 타겟 그룹이 3010 포트를 바라보도록 설정 확인
- 헬스 체크 경로도 3010 포트로 설정

### **3. 방화벽 규칙**
- 기존 3000 포트 규칙 제거
- 새로운 3010 포트 규칙 추가

## 🎯 **최종 확인 체크리스트**

- ✅ 메인 서비스가 3010 포트에서 실행됨
- ✅ Admin 서비스가 3011 포트에서 실행됨
- ✅ 모든 문서가 올바른 포트를 참조함
- ✅ 인프라 설정이 올바른 포트를 사용함
- ✅ 포트 충돌 해결 스크립트가 올바른 포트를 확인함
- ✅ 방화벽 규칙이 올바른 포트를 허용함

## 🚀 **실행 방법**

### **로컬 개발 환경**
```bash
# 메인 서비스 시작
cd msp-checklist
PORT=3010 npm run dev

# Admin 서비스 시작 (별도 터미널)
cd msp-checklist/admin
PORT=3011 npm run dev
```

### **프로덕션 환경**
```bash
# PM2로 시작
pm2 start deploy/ecosystem.config.js

# 또는 직접 시작
cd msp-checklist
PORT=3010 npm start &

cd admin
PORT=3011 npm start &
```

---

**결론**: 모든 설정이 메인 서비스 3010, Admin 서비스 3011로 통일되었습니다. 더 이상 3000이나 3001 포트를 사용하지 않습니다.