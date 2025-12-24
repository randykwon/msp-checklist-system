# MSP Checklist Ultimate Fix Script

## 개요
모든 알려진 MSP Checklist 배포 문제를 자동으로 감지하고 해결하는 통합 스크립트입니다.

## 해결하는 문제들

### 🔧 시스템 레벨 문제
1. **Amazon Linux 2023 curl 충돌**
   - curl-minimal과 curl 패키지 충돌
   - 소스 컴파일을 통한 자동 해결

2. **Nginx 설정 문제**
   - 포트 충돌 (3010, 3011)
   - sendfile, gzip 중복 설정
   - 기본 사이트 충돌

3. **권한 문제**
   - 프로젝트 디렉토리 소유권
   - 실행 권한 누락

### 📦 Node.js/npm 문제
4. **ESLint 의존성 충돌**
   - eslint ^8 vs eslint-config-next ^16+ 충돌
   - 호환 가능한 버전으로 자동 수정

5. **Next.js Webpack 플래그 문제**
   - Next.js 15+에서 제거된 --webpack 플래그
   - 자동 제거 및 설정 수정

6. **LightningCSS 네이티브 모듈 문제**
   - `Cannot find module '../lightningcss.linux-x64-gnu.node'`
   - 완전한 CSS 프레임워크 제거 및 순수 CSS 대체

### 🚀 서비스 관리 문제
7. **PM2 프로세스 관리**
   - 중복 프로세스 정리
   - ecosystem.config.js 자동 생성

8. **빌드 및 배포 문제**
   - 메모리 부족 문제
   - 캐시 충돌 문제

## 사용 방법

### 기본 실행
```bash
# 스크립트 실행 권한 부여
chmod +x msp-ultimate-fix.sh

# 실행 (root 권한 필요)
sudo ./msp-ultimate-fix.sh
```

### 실행 과정
1. **시스템 감지**: Ubuntu 22.04 LTS 또는 Amazon Linux 2023 자동 감지
2. **백업 생성**: 모든 설정 파일 자동 백업
3. **문제 해결**: 9단계 자동 문제 해결
4. **테스트**: 빌드 및 연결 테스트
5. **서비스 시작**: Nginx, PM2 자동 시작
6. **상태 확인**: 전체 시스템 상태 표시

## 해결 과정 상세

### 1단계: Amazon Linux curl 문제 해결
```bash
# curl-minimal 제거 및 curl 설치
sudo dnf remove -y curl-minimal
sudo dnf install -y curl

# 필요시 소스 컴파일
wget https://curl.se/download/curl-8.4.0.tar.gz
# ... 컴파일 과정
```

### 2단계: Nginx 설정 최적화
```bash
# 포트 충돌 해결
sudo fuser -k 3010/tcp 3011/tcp

# 중복 설정 제거
# sendfile, gzip 설정 정리
```

### 3단계: ESLint 충돌 해결
```json
{
  "dependencies": {
    "eslint": "^9.0.0",
    "eslint-config-next": "15.1.3",
    "next": "15.1.3"
  }
}
```

### 4단계: LightningCSS 완전 제거
- 모든 CSS 프레임워크 의존성 제거
- 순수 CSS로 스타일링 대체
- Next.js 설정 최적화

### 5단계: PM2 설정 자동화
```javascript
// ecosystem.config.js 자동 생성
module.exports = {
  apps: [
    {
      name: 'msp-main',
      cwd: './msp-checklist',
      script: 'npm',
      args: 'start',
      env: { PORT: 3010 }
    },
    {
      name: 'msp-admin', 
      cwd: './msp-checklist/admin',
      script: 'npm',
      args: 'start',
      env: { PORT: 3011 }
    }
  ]
};
```

## 실행 결과

### 성공 시 출력
```
✅ Amazon Linux 2023 curl 충돌 해결 완료
✅ Nginx 포트 충돌 해결 완료
✅ ESLint 의존성 충돌 해결 완료
✅ LightningCSS 문제 해결 완료
✅ 메인 애플리케이션 빌드 성공
✅ PM2 애플리케이션 시작됨 (2개 프로세스)
✅ HTTP 응답 테스트 통과 (HTTP 200)
🎉 MSP Checklist Ultimate Fix 완료!
```

### 시스템 상태 표시
```
=== MSP Checklist 시스템 상태 ===

🔧 서비스 상태:
  - Nginx: ✅ 실행 중
  - PM2: ✅ 2개 프로세스 실행 중

🌐 포트 상태:
  - 80 (HTTP): ✅ 사용 중
  - 3010 (메인): ✅ 사용 중
  - 3011 (관리자): ✅ 사용 중

🌍 접속 정보:
  - 메인 사이트: http://YOUR_SERVER_IP
  - 관리자 페이지: http://YOUR_SERVER_IP/admin
```

## 백업 및 복구

### 자동 백업
스크립트 실행 시 다음 항목들이 자동으로 백업됩니다:
- 프로젝트 디렉토리 전체
- Nginx 설정 파일들
- PM2 설정 및 프로세스 목록

### 백업 위치
```
/tmp/msp-backup-YYYYMMDD_HHMMSS/
├── msp-checklist-system/     # 프로젝트 백업
├── nginx/                    # Nginx 설정 백업
└── pm2-dump.pm2             # PM2 프로세스 백업
```

### 복구 방법
```bash
# 프로젝트 복구
sudo cp -r /tmp/msp-backup-*/msp-checklist-system /opt/

# Nginx 설정 복구
sudo cp -r /tmp/msp-backup-*/nginx/* /etc/nginx/

# PM2 프로세스 복구
pm2 resurrect /tmp/msp-backup-*/pm2-dump.pm2
```

## 문제 해결

### 스크립트 실행 실패 시
1. **권한 확인**: `sudo` 권한으로 실행했는지 확인
2. **OS 지원**: Ubuntu 22.04 LTS 또는 Amazon Linux 2023인지 확인
3. **네트워크**: 인터넷 연결 상태 확인 (패키지 다운로드 필요)

### 개별 문제 해결
```bash
# 특정 문제만 해결하고 싶은 경우
# 스크립트 내 개별 함수 호출 가능

# ESLint 문제만 해결
fix_eslint_conflict

# Nginx 문제만 해결  
fix_nginx_config

# LightningCSS 문제만 해결
fix_lightningcss_issue
```

## 관리 명령어

### 일상 관리
```bash
# 전체 상태 확인
pm2 status

# 애플리케이션 재시작
pm2 restart all

# 로그 확인
pm2 logs

# Nginx 재시작
sudo systemctl restart nginx

# Nginx 설정 테스트
sudo nginx -t
```

### 모니터링
```bash
# 실시간 로그 모니터링
pm2 logs --lines 50

# 리소스 사용량 확인
pm2 monit

# 시스템 리소스 확인
htop
df -h
free -h
```

## 통합된 기존 스크립트들

이 Ultimate Fix 스크립트는 다음 개별 스크립트들의 기능을 모두 통합합니다:

### 제거된 스크립트들 (기능 통합됨)
- ~~`immediate-eslint-fix.sh`~~ → `fix_eslint_conflict()`
- ~~`immediate-webpack-fix.sh`~~ → `fix_nextjs_webpack_flag()`
- ~~`nuclear-css-fix.sh`~~ → `fix_lightningcss_issue()`
- ~~`fix-nginx-config.sh`~~ → `fix_nginx_config()`
- ~~`fix-nginx-port-conflict.sh`~~ → `fix_nginx_port_conflict()`
- ~~`fix-amazon-linux-curl-conflict.sh`~~ → `fix_amazon_linux_curl()`

### 유지되는 스크립트들
- `msp-deployment-suite-refined.sh`: 전체 배포용 (Ultimate Fix 기능 포함)
- `msp-ultimate-fix.sh`: 문제 해결 전용 (이 스크립트)

## 사용 시나리오

### 시나리오 1: 새로운 배포
```bash
# 전체 배포 (권장)
sudo ./msp-deployment-suite-refined.sh
```

### 시나리오 2: 기존 시스템 문제 해결
```bash
# 문제 해결만 (이 스크립트)
sudo ./msp-ultimate-fix.sh
```

### 시나리오 3: 특정 문제 해결
```bash
# Ultimate Fix 스크립트에서 필요한 함수만 실행
# (스크립트 수정 후 실행)
```

---

**상태**: ✅ 완료
**지원 OS**: Ubuntu 22.04 LTS, Amazon Linux 2023
**백업**: 자동 생성
**복구**: 수동 복구 가능