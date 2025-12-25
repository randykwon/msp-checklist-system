import { MSPChecklistData } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface DashboardProps {
  data: MSPChecklistData;
}

export default function Dashboard({ data }: DashboardProps) {
  const { overallProgress } = data;
  const { t } = useLanguage();

  const stats = [
    {
      label: t('dashboard.totalItems'),
      value: overallProgress.total,
      color: 'text-gray-600',
      icon: '📊'
    },
    {
      label: t('dashboard.completed'),
      value: overallProgress.completed,
      color: 'text-green-600',
      icon: '✅'
    },
    {
      label: t('dashboard.inProgress'),
      value: overallProgress.inProgress,
      color: 'text-blue-600',
      icon: '🔄'
    },
    {
      label: t('dashboard.progress'),
      value: `${overallProgress.percentage.toFixed(1)}%`,
      color: 'text-purple-600',
      icon: '📈'
    }
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.overallProgress')}</h2>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">실시간 업데이트</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Overall Progress Bar */}
      <div className="progress-section">
        <div className="progress-header">
          <h3 className="text-lg font-semibold text-gray-900">전체 진행률</h3>
          <span className="text-lg font-bold text-purple-600">
            {overallProgress.percentage.toFixed(1)}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${overallProgress.percentage}%` }}
          />
        </div>
        <div className="progress-labels">
          <span>시작</span>
          <span>완료</span>
        </div>
      </div>

      {/* Category Progress */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">카테고리별 진행 현황</h3>
        <div className="category-grid">
          {data.categories.map((category, index) => (
            <div key={category.id} className="category-card">
              <div className="category-header">
                <h4 className="category-title">{category.name}</h4>
                <span className="category-percentage">
                  {category.progress.percentage.toFixed(0)}%
                </span>
              </div>
              
              <div className="category-progress">
                <div className="progress-bar" style={{ height: '6px' }}>
                  <div
                    className="progress-fill"
                    style={{ 
                      width: `${category.progress.percentage}%`,
                      background: `linear-gradient(90deg, 
                        ${index % 3 === 0 ? '#3b82f6' : index % 3 === 1 ? '#10b981' : '#8b5cf6'}, 
                        ${index % 3 === 0 ? '#1d4ed8' : index % 3 === 1 ? '#047857' : '#7c3aed'})`
                    }}
                  />
                </div>
              </div>
              
              <div className="category-stats">
                <span>완료: {category.progress.completed}</span>
                <span>전체: {category.progress.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((overallProgress.completed / overallProgress.total) * 100)}%
            </div>
            <div className="text-sm text-gray-600">완료율</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {overallProgress.total - overallProgress.completed - overallProgress.inProgress}
            </div>
            <div className="text-sm text-gray-600">미시작</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {data.categories.length}
            </div>
            <div className="text-sm text-gray-600">카테고리</div>
          </div>
        </div>
      </div>
    </div>
  );
}
