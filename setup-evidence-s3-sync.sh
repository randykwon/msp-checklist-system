#!/bin/bash
# ============================================================================
# 증빙 자료 S3 동기화 서비스 설치 스크립트
# ============================================================================

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

INSTALL_DIR="/opt/msp-checklist-system"
EVIDENCE_DIR="$INSTALL_DIR/evidence-files"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  증빙 자료 S3 동기화 서비스 설치${NC}"
echo -e "${BLUE}============================================${NC}"

# S3 버킷 이름 입력
echo ""
read -p "S3 버킷 이름을 입력하세요: " S3_BUCKET

if [ -z "$S3_BUCKET" ]; then
    echo -e "${RED}S3 버킷 이름이 필요합니다.${NC}"
    exit 1
fi

# S3 프리픽스 입력 (기본값: evidence-files)
read -p "S3 프리픽스 (기본값: evidence-files): " S3_PREFIX
S3_PREFIX=${S3_PREFIX:-evidence-files}

echo ""
echo -e "${YELLOW}설정 정보:${NC}"
echo "  - S3 버킷: $S3_BUCKET"
echo "  - S3 프리픽스: $S3_PREFIX"
echo "  - 로컬 저장 경로: $EVIDENCE_DIR"
echo ""

read -p "계속하시겠습니까? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "설치가 취소되었습니다."
    exit 0
fi

# 1. 디렉토리 생성
echo -e "${GREEN}1. 디렉토리 생성 중...${NC}"
sudo mkdir -p "$EVIDENCE_DIR/pending"
sudo mkdir -p "$EVIDENCE_DIR/uploaded"
sudo chown -R ec2-user:ec2-user "$EVIDENCE_DIR"
echo "   ✓ $EVIDENCE_DIR 생성 완료"

# 2. 스크립트 복사
echo -e "${GREEN}2. 동기화 스크립트 설치 중...${NC}"
sudo cp evidence-s3-sync.sh "$INSTALL_DIR/"
sudo chmod +x "$INSTALL_DIR/evidence-s3-sync.sh"
echo "   ✓ evidence-s3-sync.sh 설치 완료"

# 3. Systemd 서비스 파일 생성
echo -e "${GREEN}3. Systemd 서비스 설정 중...${NC}"

sudo tee /etc/systemd/system/evidence-s3-sync.service > /dev/null << EOF
[Unit]
Description=Evidence Files S3 Sync Service
After=network.target

[Service]
Type=oneshot
User=ec2-user
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/evidence-s3-sync.sh
Environment=EVIDENCE_STORAGE_PATH=$EVIDENCE_DIR
Environment=EVIDENCE_S3_BUCKET=$S3_BUCKET
Environment=EVIDENCE_S3_PREFIX=$S3_PREFIX

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/evidence-s3-sync.timer > /dev/null << EOF
[Unit]
Description=Evidence Files S3 Sync Timer
Requires=evidence-s3-sync.service

[Timer]
# 매 5분마다 실행
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
EOF

echo "   ✓ Systemd 서비스 파일 생성 완료"

# 4. 환경 변수 설정 (.env 파일에 추가)
echo -e "${GREEN}4. 환경 변수 설정 중...${NC}"

ENV_FILE="$INSTALL_DIR/msp-checklist/.env.local"
if [ -f "$ENV_FILE" ]; then
    # 기존 설정 제거
    sed -i '/^EVIDENCE_STORAGE_PATH=/d' "$ENV_FILE" 2>/dev/null || true
    sed -i '/^EVIDENCE_S3_BUCKET=/d' "$ENV_FILE" 2>/dev/null || true
    sed -i '/^EVIDENCE_S3_PREFIX=/d' "$ENV_FILE" 2>/dev/null || true
fi

# 새 설정 추가
echo "" >> "$ENV_FILE"
echo "# Evidence Storage Settings" >> "$ENV_FILE"
echo "EVIDENCE_STORAGE_PATH=$EVIDENCE_DIR" >> "$ENV_FILE"
echo "EVIDENCE_S3_BUCKET=$S3_BUCKET" >> "$ENV_FILE"
echo "EVIDENCE_S3_PREFIX=$S3_PREFIX" >> "$ENV_FILE"

echo "   ✓ 환경 변수 설정 완료"

# 5. Systemd 데몬 리로드 및 타이머 활성화
echo -e "${GREEN}5. 서비스 활성화 중...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable evidence-s3-sync.timer
sudo systemctl start evidence-s3-sync.timer
echo "   ✓ 타이머 서비스 활성화 완료"

# 6. AWS CLI 확인
echo -e "${GREEN}6. AWS CLI 확인 중...${NC}"
if command -v aws &> /dev/null; then
    echo "   ✓ AWS CLI 설치됨: $(aws --version)"
else
    echo -e "${YELLOW}   ⚠ AWS CLI가 설치되어 있지 않습니다.${NC}"
    echo "   다음 명령으로 설치하세요:"
    echo "   curl \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o \"awscliv2.zip\""
    echo "   unzip awscliv2.zip && sudo ./aws/install"
fi

# 7. S3 접근 권한 확인
echo -e "${GREEN}7. S3 접근 권한 확인 중...${NC}"
if aws s3 ls "s3://$S3_BUCKET" &> /dev/null; then
    echo "   ✓ S3 버킷 접근 가능"
else
    echo -e "${YELLOW}   ⚠ S3 버킷에 접근할 수 없습니다.${NC}"
    echo "   IAM 역할 또는 자격 증명을 확인하세요."
    echo "   필요한 권한: s3:PutObject, s3:GetObject, s3:ListBucket"
fi

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}설치가 완료되었습니다!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "유용한 명령어:"
echo "  - 타이머 상태 확인: systemctl status evidence-s3-sync.timer"
echo "  - 수동 동기화 실행: sudo systemctl start evidence-s3-sync.service"
echo "  - 로그 확인: tail -f /var/log/evidence-s3-sync.log"
echo "  - 타이머 중지: sudo systemctl stop evidence-s3-sync.timer"
echo ""
echo "저장 경로:"
echo "  - 대기 중: $EVIDENCE_DIR/pending/"
echo "  - 업로드 완료: $EVIDENCE_DIR/uploaded/"
echo ""
