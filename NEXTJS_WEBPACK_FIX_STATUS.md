# Next.js Webpack Flag 문제 해결

## 현재 상황
AWS EC2에서 MSP Checklist 배포 중 다음 오류 발생:
```
error: unknown option '--webpack'
```

## 문제 원인
1. **Next.js 15.1.0+에서 --webpack 플래그 제거됨**
   - Next.js 15부터 webpack이 기본값이 되어 별도 플래그 불필요
   - 스크립트에서 `--webpack` 플래그를 계속 사용하고 있음

2. **보안 취약점 경고**
   - Next.js 15.1.0에 보안 취약점 존재 (CVE-2025-66478)
   - 15.1.3으로 업데이트 필요

## 해결 방법

### 즉시 해결 (EC2에서 실행)
```bash
# 즉시 수정 스크립트 실행
sudo ./immediate-webpack-fix.sh
```

### 영구 해결 (메인 스크립트 수정 완료)
`msp-deployment-suite-refined.sh`에서 다음 수정 완료:

#### 1. package.json 스크립트 수정
```json
// 수정 전
"build": "next build --webpack"

// 수정 후  
"build": "next build"
```

#### 2. 빌드 명령어 수정
```bash
# 수정 전
npx next build --webpack

# 수정 후
npx next build
```

#### 3. Next.js 버전 업데이트
```json
// 수정 전
"next": "15.1.0"
"eslint-config-next": "15.1.0"

// 수정 후
"next": "15.1.3"
"eslint-config-next": "15.1.3"
```

## 수정된 파일들

### 메인 스크립트
- `msp-deployment-suite-refined.sh`: 모든 --webpack 플래그 제거 및 Next.js 버전 업데이트

### 즉시 수정 도구
- `immediate-webpack-fix.sh`: EC2에서 즉시 실행할 수 있는 수정 스크립트

## 실행 순서

### 현재 EC2 인스턴스에서
1. **즉시 수정 실행**:
   ```bash
   sudo ./immediate-webpack-fix.sh
   ```

2. **빌드 성공 확인**:
   ```bash
   cd /opt/msp-checklist-system/msp-checklist
   npm run build
   ```

3. **PM2로 애플리케이션 시작**:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### 향후 배포에서
- 수정된 `msp-deployment-suite-refined.sh` 사용
- --webpack 플래그 문제 자동으로 해결됨

## 예상 결과

### 성공 시
```
✅ Dependencies installed successfully!
🔨 Attempting to build (without --webpack flag)...
> msp-checklist@0.1.0 build
> next build

✓ Creating an optimized production build
✓ Compiled successfully
🎉 Build successful!
```

### 추가 문제 발생 시
- Nuclear CSS Fix가 자동으로 실행되어 CSS 관련 문제 해결
- 상세한 오류 로그로 정확한 문제 파악 가능

## 관련 변경사항

### Nuclear CSS Fix 함수 업데이트
- 모든 빌드 명령에서 --webpack 플래그 제거
- Next.js 15.1.3으로 버전 고정
- ESLint 9.0.0 호환성 확보

### 오류 처리 개선
- 빌드 실패 시 더 명확한 오류 메시지
- 단계별 디버그 정보 제공

## 다음 단계

1. **즉시 수정 실행** → 현재 --webpack 오류 해결
2. **빌드 테스트** → Next.js 애플리케이션 정상 빌드 확인  
3. **PM2 시작** → 애플리케이션 서비스 시작
4. **Nginx 연동** → 리버스 프록시 설정 완료
5. **최종 테스트** → 웹 브라우저에서 접근 확인

---

**상태**: ✅ 수정 완료
**테스트**: 🔄 EC2에서 실행 대기
**다음 작업**: immediate-webpack-fix.sh 실행