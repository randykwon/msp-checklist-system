import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    // JWT 토큰 검증
    const token = request.cookies.get('admin_auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    
    if (!['operator', 'admin', 'superadmin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // 데이터베이스 연결
    const dbPath = path.join(process.cwd(), '..', 'msp-assessment.db');
    const db = new Database(dbPath);

    try {
      // 사용자별 평가 데이터 집계
      const progressQuery = `
        SELECT 
          assessment_type,
          category,
          COUNT(*) as total_items,
          SUM(CASE WHEN met = 'true' THEN 1 ELSE 0 END) as completed_items,
          SUM(CASE WHEN met = 'partial' THEN 1 ELSE 0 END) as in_progress_items,
          ROUND(
            (SUM(CASE WHEN met = 'true' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 
            1
          ) as completion_percentage
        FROM assessment_data 
        WHERE assessment_type IN ('prerequisites', 'customer_management', 'service_delivery', 'monitoring', 'security', 'backup_dr', 'cost_optimization')
        GROUP BY assessment_type, category
        ORDER BY assessment_type, category
      `;

      const progressData = db.prepare(progressQuery).all();

      // 카테고리별로 데이터 정리
      const categoryMap = new Map();

      progressData.forEach((row: any) => {
        const categoryId = row.assessment_type;
        const categoryName = getCategoryName(categoryId);
        const categoryNameKo = getCategoryNameKo(categoryId);
        const type = categoryId === 'prerequisites' ? 'prerequisites' : 'technical';

        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            id: categoryId,
            name: categoryName,
            nameKo: categoryNameKo,
            type: type,
            total: 0,
            completed: 0,
            inProgress: 0,
            percentage: 0
          });
        }

        const category = categoryMap.get(categoryId);
        category.total += row.total_items;
        category.completed += row.completed_items;
        category.inProgress += row.in_progress_items;
      });

      // 완료율 계산
      categoryMap.forEach((category) => {
        if (category.total > 0) {
          category.percentage = Math.round((category.completed / category.total) * 100);
        }
      });

      const result = Array.from(categoryMap.values());

      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });

    } finally {
      db.close();
    }

  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 카테고리 이름 매핑 함수들
function getCategoryName(categoryId: string): string {
  const nameMap: { [key: string]: string } = {
    'prerequisites': 'Prerequisites Controls',
    'customer_management': 'Customer Management',
    'service_delivery': 'Service Delivery',
    'monitoring': 'Monitoring and Observability',
    'security': 'Security and Compliance',
    'backup_dr': 'Backup and Disaster Recovery',
    'cost_optimization': 'Cost Optimization'
  };
  return nameMap[categoryId] || categoryId;
}

function getCategoryNameKo(categoryId: string): string {
  const nameMapKo: { [key: string]: string } = {
    'prerequisites': '사전 요구사항 제어',
    'customer_management': '고객 관리',
    'service_delivery': '서비스 제공',
    'monitoring': '모니터링 및 옵저버빌리티',
    'security': '보안 및 규정 준수',
    'backup_dr': '백업 및 재해 복구',
    'cost_optimization': '비용 최적화'
  };
  return nameMapKo[categoryId] || categoryId;
}