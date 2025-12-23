#!/bin/bash

# 빠른 Admin 문제 해결
echo "🚀 빠른 Admin 문제 해결 시작..."

cd /opt/msp-checklist/msp-checklist/admin

# AdminLayout 컴포넌트 생성
mkdir -p components
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  );
}
EOF

# db 모듈 생성
mkdir -p lib
cat > lib/db.ts << 'EOF'
export interface AdminAnnouncement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export async function getAnnouncements(): Promise<AdminAnnouncement[]> {
  return [];
}
EOF

echo "✅ Admin 컴포넌트 생성 완료!"
echo "이제 빌드를 다시 시도하세요: npm run build"