#!/bin/bash

# Admin 시스템 빌드 문제 해결 스크립트
# '@/components/AdminLayout' 모듈을 찾을 수 없는 문제를 해결합니다.

set -e

echo "🔧 Admin 시스템 빌드 문제 해결 시작..."

# MSP Checklist 디렉토리로 이동
cd /opt/msp-checklist/msp-checklist

echo "📍 현재 위치: $(pwd)"

# 1. admin 디렉토리 확인
if [ ! -d "admin" ]; then
    echo "❌ admin 디렉토리를 찾을 수 없습니다."
    exit 1
fi

cd admin
echo "📍 Admin 디렉토리로 이동: $(pwd)"

# 2. AdminLayout 컴포넌트 확인
echo "🔍 AdminLayout 컴포넌트 확인 중..."

# AdminLayout 컴포넌트가 있는지 확인
if [ ! -f "components/AdminLayout.tsx" ] && [ ! -f "components/AdminLayout.js" ]; then
    echo "⚠️  AdminLayout 컴포넌트가 없습니다. 생성 중..."
    
    # components 디렉토리 생성
    mkdir -p components
    
    # AdminLayout 컴포넌트 생성
    cat > components/AdminLayout.tsx << 'EOF'
'use client';

import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = 'Admin Dashboard' }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <nav className="flex space-x-4">
              <a href="/admin" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/admin/announcements" className="text-gray-600 hover:text-gray-900">Announcements</a>
              <a href="/admin/users" className="text-gray-600 hover:text-gray-900">Users</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  );
}
EOF

    echo "✅ AdminLayout 컴포넌트 생성 완료"
fi

# 3. tsconfig.json 확인 및 수정 (admin 디렉토리용)
echo "📝 Admin TypeScript 설정 확인 중..."

if [ ! -f "tsconfig.json" ]; then
    echo "⚠️  Admin tsconfig.json이 없습니다. 생성 중..."
    
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "types": ["node"],
    "forceConsistentCasingInFileNames": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

    echo "✅ Admin tsconfig.json 생성 완료"
else
    # 기존 tsconfig.json 업데이트
    echo "⚙️  기존 Admin tsconfig.json 업데이트 중..."
    
    # 백업 생성
    cp tsconfig.json tsconfig.json.backup
    
    # paths 설정이 있는지 확인하고 없으면 추가
    if ! grep -q '"@/\*"' tsconfig.json; then
        # baseUrl과 paths 추가
        sed -i '/"compilerOptions": {/a\    "baseUrl": ".",\n    "paths": {\n      "@/*": ["./*"]\n    },' tsconfig.json
    fi
fi

# 4. next.config.ts 확인 (admin용)
echo "⚙️  Admin Next.js 설정 확인 중..."

if [ ! -f "next.config.ts" ] && [ ! -f "next.config.js" ]; then
    echo "⚠️  Admin next.config.ts가 없습니다. 생성 중..."
    
    cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  turbopack: {
    root: process.cwd()
  },
  
  webpack: (config: any, { isServer }: any) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    
    return config;
  },
  
  serverExternalPackages: ['better-sqlite3']
};

export default nextConfig;
EOF

    echo "✅ Admin next.config.ts 생성 완료"
fi

# 5. lib/db.ts 확인 (필요한 경우)
echo "🔍 Admin 데이터베이스 모듈 확인 중..."

if [ ! -f "lib/db.ts" ] && [ ! -f "lib/db.js" ]; then
    echo "⚠️  Admin db 모듈이 없습니다. 기본 모듈 생성 중..."
    
    mkdir -p lib
    
    cat > lib/db.ts << 'EOF'
// Admin 데이터베이스 타입 정의
export interface AdminAnnouncement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  lastLogin?: string;
}

// 기본 데이터베이스 함수들 (실제 구현은 나중에)
export async function getAnnouncements(): Promise<AdminAnnouncement[]> {
  // TODO: 실제 데이터베이스 연결 구현
  return [];
}

export async function getUsers(): Promise<AdminUser[]> {
  // TODO: 실제 데이터베이스 연결 구현
  return [];
}
EOF

    echo "✅ Admin db 모듈 생성 완료"
fi

# 6. 빌드 캐시 정리
echo "🧹 Admin 빌드 캐시 정리 중..."
rm -rf .next

# 7. Admin 시스템 테스트 빌드
echo "🔨 Admin 시스템 테스트 빌드 실행 중..."

if NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
    echo ""
    echo "✅ Admin 시스템 빌드 성공!"
    echo ""
    echo "🎉 해결 완료:"
    echo "- AdminLayout 컴포넌트 생성"
    echo "- TypeScript 경로 설정 수정"
    echo "- 필요한 모듈들 생성"
    echo "- Admin 빌드 성공 확인"
    echo ""
    
    # 메인 디렉토리로 돌아가서 전체 빌드 테스트
    cd ..
    echo "🔨 전체 시스템 빌드 테스트 중..."
    
    if NODE_OPTIONS="--max-old-space-size=2048" npm run build; then
        echo "✅ 전체 시스템 빌드 성공!"
        echo ""
        echo "🎉 모든 빌드 문제가 해결되었습니다!"
        echo "이제 설치가 정상적으로 완료됩니다."
    else
        echo "⚠️  메인 시스템 빌드에 문제가 있을 수 있습니다."
        echo "하지만 Admin 시스템은 정상적으로 빌드되었습니다."
    fi
    
else
    echo ""
    echo "❌ Admin 시스템 빌드 실패. 추가 진단이 필요합니다."
    echo ""
    echo "오류 로그:"
    npm run build 2>&1 | tail -20
    exit 1
fi

echo ""
echo "🏁 Admin 시스템 빌드 문제 해결 완료!"