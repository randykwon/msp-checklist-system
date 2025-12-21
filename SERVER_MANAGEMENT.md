# 🚀 서버 관리 가이드

AWS MSP 체크리스트 애플리케이션의 서버 관리를 위한 종합 가이드입니다.

## 📋 사용 가능한 스크립트

### 1. 🔄 서버 재시작 (전체 기능)
```bash
./restart-server.sh
# 또는
npm run restart
```

**기능:**
- 기존 프로세스 완전 종료
- Node.js 버전 자동 설정 (NVM 사용 시)
- 웹 애플리케이션 서버 시작 (포트 3010)
- 파일 감시 시스템 시작
- 서버 상태 자동 확인
- 상세한 로그 및 상태 정보 제공

**사용 시기:**
- 처음 서버를 시작할 때
- 설정 변경 후 완전한 재시작이 필요할 때
- 문제 해결을 위한 클린 재시작이 필요할 때

### 2. ⚡ 빠른 재시작 (간단 버전)
```bash
./quick-restart.sh
# 또는
npm run quick-restart
```

**기능:**
- 빠른 프로세스 종료 및 재시작
- 최소한의 출력으로 신속한 재시작
- 개발 중 빠른 재시작이 필요할 때 사용

**사용 시기:**
- 개발 중 코드 변경 후 빠른 재시작
- 간단한 문제 해결
- 시간이 중요한 상황

### 3. 🛑 서버 중지
```bash
./stop-server.sh
# 또는
npm run stop
```

**기능:**
- 모든 관련 프로세스 안전하게 종료
- 포트 3010 프로세스 종료
- 파일 감시 프로세스 종료
- npm 및 Next.js 프로세스 종료
- 로그 파일 정보 표시
- 종료 상태 확인

**사용 시기:**
- 서버를 완전히 중지해야 할 때
- 시스템 종료 전
- 다른 포트로 서버를 시작하기 전

### 4. 📊 서버 상태 확인
```bash
./server-status.sh
# 또는
npm run status
```

**기능:**
- 웹 서버 상태 (포트 3010)
- 파일 감시 시스템 상태
- Node.js 환경 정보
- 로그 파일 상태 및 오류 확인
- 디스크 사용량
- 네트워크 상태
- 메모리 사용량
- 종합 상태 요약

**사용 시기:**
- 서버 상태를 확인하고 싶을 때
- 문제 진단이 필요할 때
- 시스템 모니터링

## 🎯 일반적인 사용 시나리오

### 개발 시작 시
```bash
# 1. 서버 상태 확인
./server-status.sh

# 2. 서버가 중지되어 있다면 시작
./restart-server.sh

# 3. 브라우저에서 http://localhost:3010 접속
```

### 코드 변경 후
```bash
# 빠른 재시작 (대부분의 경우)
./quick-restart.sh

# 또는 완전한 재시작 (설정 변경 시)
./restart-server.sh
```

### 문제 해결 시
```bash
# 1. 현재 상태 확인
./server-status.sh

# 2. 로그 확인
tail -f server.log

# 3. 완전한 재시작
./stop-server.sh
./restart-server.sh
```

### 작업 종료 시
```bash
# 서버 중지
./stop-server.sh
```

## 📁 로그 파일

### server.log
- 웹 애플리케이션 서버 로그
- Next.js 컴파일 정보
- HTTP 요청/응답 로그
- 오류 및 경고 메시지

```bash
# 실시간 로그 확인
tail -f server.log

# 오류만 확인
grep -i error server.log

# 최근 20줄 확인
tail -20 server.log
```

### file-watcher.log
- 파일 감시 시스템 로그
- 파일 변경 감지 정보
- 변환 작업 로그

```bash
# 실시간 로그 확인
tail -f file-watcher.log

# 최근 로그 확인
tail -10 file-watcher.log
```

## 🔧 문제 해결

### 포트 3010이 이미 사용 중인 경우
```bash
# 포트 사용 프로세스 확인
lsof -i:3010

# 강제 종료
./stop-server.sh

# 재시작
./restart-server.sh
```

### Node.js 버전 문제
```bash
# 현재 버전 확인
node --version

# NVM 사용 시 올바른 버전으로 변경
nvm use 20.9.0

# 재시작
./restart-server.sh
```

### 서버가 시작되지 않는 경우
```bash
# 1. 상태 확인
./server-status.sh

# 2. 로그 확인
cat server.log

# 3. 수동 시작으로 오류 확인
cd msp-checklist
npm run dev
```

### 파일 감시가 작동하지 않는 경우
```bash
# 1. 파일 감시 로그 확인
cat file-watcher.log

# 2. 수동 시작
npm run watch

# 3. msp_data 디렉토리 권한 확인
ls -la msp_data/
```

## 🚨 주의사항

1. **스크립트 실행 권한**: 스크립트가 실행되지 않으면 권한을 확인하세요
   ```bash
   chmod +x *.sh
   ```

2. **작업 디렉토리**: 스크립트는 프로젝트 루트 디렉토리에서 실행해야 합니다

3. **포트 충돌**: 다른 애플리케이션이 포트 3010을 사용하고 있지 않은지 확인하세요

4. **로그 파일 크기**: 로그 파일이 너무 커지면 정기적으로 정리하세요
   ```bash
   # 로그 파일 크기 확인
   du -h *.log
   
   # 로그 파일 정리 (백업 후)
   cp server.log server.log.backup
   > server.log
   ```

## 📞 지원

문제가 지속되면 다음을 확인하세요:
1. Node.js 버전 (20.9.0 권장)
2. npm 패키지 설치 상태
3. 포트 3010 사용 가능 여부
4. 로그 파일의 오류 메시지

더 자세한 정보는 `./server-status.sh`를 실행하여 전체 시스템 상태를 확인하세요.