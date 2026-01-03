# 배포 가이드

## 배포 업데이트

### 자동 배포

```bash
# GitHub에서 최신 코드 가져오기 + 빌드 + 재시작
./scripts/deploy/deploy-update.sh
```

### 옵션

```bash
# 메인 앱만 업데이트
./scripts/deploy/deploy-update.sh --main-only

# Admin 앱만 업데이트
./scripts/deploy/deploy-update.sh --admin-only

# 빌드 건너뛰기 (서비스 재시작만)
./scripts/deploy/deploy-update.sh --skip-build

# 강제 빌드
./scripts/deploy/deploy-update.sh --force
```

## 변경사항 확인

```bash
# GitHub 변경사항 미리보기
./scripts/deploy/pull-changes.sh
```

출력 예시:
- 🟢 추가된 파일
- 🟡 수정된 파일
- 🔴 삭제된 파일
- 빌드 필요 여부 자동 감지

## 수동 배포

```bash
# 1. 코드 업데이트
cd /opt/msp-checklist-system
git pull origin main

# 2. 의존성 업데이트 (필요시)
cd msp-checklist
npm install --legacy-peer-deps

# 3. 빌드
npm run build
cd admin && npm run build

# 4. 서버 재시작
cd ../..
./scripts/manage/restart-servers.sh
```

## 롤백

```bash
# 이전 커밋으로 롤백
git log --oneline -10  # 커밋 확인
git checkout <commit-hash>

# 빌드 및 재시작
cd msp-checklist && npm run build
cd admin && npm run build
cd ../..
./scripts/manage/restart-servers.sh
```

## CI/CD 설정

### GitHub Actions 예시

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/msp-checklist-system
            ./scripts/deploy/deploy-update.sh
```

## 무중단 배포

PM2를 사용한 무중단 배포:

```bash
# PM2 설치
npm install -g pm2

# ecosystem.config.js 사용
pm2 start ecosystem.config.js

# 무중단 재시작
pm2 reload all
```
