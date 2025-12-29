#!/bin/bash
# Node/tsx/bedrock 관련 프로세스 종료 스크립트

echo "🔍 Node/tsx/bedrock 관련 프로세스 검색 중..."
echo ""

# 프로세스 목록 표시
PROCS=$(ps aux | grep -E "node|tsx|bedrock" | grep -v grep | grep -v "kill-node-processes")

if [ -z "$PROCS" ]; then
    echo "✅ 종료할 프로세스가 없습니다."
    exit 0
fi

echo "📋 발견된 프로세스:"
echo "─────────────────────────────────────────────────────"
echo "$PROCS"
echo "─────────────────────────────────────────────────────"
echo ""

# 확인 메시지
read -p "⚠️  위 프로세스들을 모두 종료하시겠습니까? (y/N): " confirm

if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    echo ""
    echo "🔪 프로세스 종료 중..."
    
    # node 프로세스 종료
    pkill -f "node" 2>/dev/null
    
    # tsx 프로세스 종료
    pkill -f "tsx" 2>/dev/null
    
    # bedrock 관련 프로세스 종료
    pkill -f "bedrock" 2>/dev/null
    
    sleep 1
    
    # 남은 프로세스 확인
    REMAINING=$(ps aux | grep -E "node|tsx|bedrock" | grep -v grep | grep -v "kill-node-processes")
    
    if [ -z "$REMAINING" ]; then
        echo "✅ 모든 프로세스가 종료되었습니다."
    else
        echo "⚠️  일부 프로세스가 남아있습니다. 강제 종료 시도..."
        pkill -9 -f "node" 2>/dev/null
        pkill -9 -f "tsx" 2>/dev/null
        echo "✅ 강제 종료 완료"
    fi
else
    echo "❌ 취소되었습니다."
fi
