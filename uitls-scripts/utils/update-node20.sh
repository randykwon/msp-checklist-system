# NodeSource 저장소 추가 및 Node.js 20.x 설치
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 버전 확인
node --version  # v20.x.x 이어야 함