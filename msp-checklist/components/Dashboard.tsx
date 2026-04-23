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
      icon: '📊'
    },
    {
      label: t('dashboard.completed'),
      value: overallProgress.completed,
      icon: '✅'
    },
    {
      label: t('dashboard.inProgress'),
      value: overallProgress.inProgress,
      icon: '🔄'
    },
    {
      label: t('dashboard.progress'),
      value: `${overallProgress.percentage.toFixed(1)}%`,
      icon: '📈'
    }
  ];

  return (
    <div className="fb-card">
      {/* Dashboard Header - Facebook Style */}
      <div className="fb-dashboard-header">
        <h2 className="fb-dashboard-title">{t('dashboard.overallProgress')}</h2>
        <div className="fb-dashboard-status">
          <div className="fb-status-indicator"></div>
          <span className="fb-status-text">실시간 업데이트</span>
        </div>
      </div>

      {/* Stats Grid - Facebook Style */}
      <div className="fb-stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="fb-stat-card">
            <div className="fb-stat-card-icon">{stat.icon}</div>
            <div className="fb-stat-card-value">{stat.value}</div>
            <div className="fb-stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Overall Progress Bar - Facebook Style */}
      <div className="fb-progress-card">
        <div className="fb-progress-card-header">
          <span className="fb-progress-card-title">전체 진행률</span>
          <span className="fb-progress-card-value">
            {overallProgress.percentage.toFixed(1)}%
          </span>
        </div>
        <div className="fb-progress">
          <div
            className="fb-progress-fill"
            style={{ width: `${overallProgress.percentage}%` }}
          />
        </div>
        <div className="fb-progress-card-footer">
          <span>시작</span>
          <span>완료</span>
        </div>
      </div>

      {/* Category Progress - Facebook Style */}
      <div className="fb-category-section">
        <h3 className="fb-section-title">카테고리별 진행 현황</h3>
        <div className="fb-category-grid">
          {data.categories.map((category, index) => (
            <div key={category.id} className="fb-category-card">
              <div className="fb-category-header">
                <h4 className="fb-category-title">{category.name}</h4>
                <span className="fb-category-percentage">
                  {category.progress.percentage.toFixed(0)}%
                </span>
              </div>
              
              <div className="fb-category-progress">
                <div className="fb-progress fb-progress-sm">
                  <div
                    className="fb-progress-fill"
                    style={{ 
                      width: `${category.progress.percentage}%`,
                      backgroundColor: index % 3 === 0 ? 'var(--fb-primary)' : index % 3 === 1 ? 'var(--fb-success)' : '#8b5cf6'
                    }}
                  />
                </div>
              </div>
              
              <div className="fb-category-stats">
                <span>완료: {category.progress.completed}</span>
                <span>전체: {category.progress.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats - Facebook Style */}
      <div className="fb-quick-stats">
        <div className="fb-quick-stats-grid">
          <div className="fb-quick-stat-item">
            <div className="fb-quick-stat-value fb-quick-stat-primary">
              {Math.round((overallProgress.completed / overallProgress.total) * 100)}%
            </div>
            <div className="fb-quick-stat-label">완료율</div>
          </div>
          <div className="fb-quick-stat-item">
            <div className="fb-quick-stat-value fb-quick-stat-success">
              {overallProgress.total - overallProgress.completed - overallProgress.inProgress}
            </div>
            <div className="fb-quick-stat-label">미시작</div>
          </div>
          <div className="fb-quick-stat-item">
            <div className="fb-quick-stat-value fb-quick-stat-purple">
              {data.categories.length}
            </div>
            <div className="fb-quick-stat-label">카테고리</div>
          </div>
        </div>
      </div>
    </div>
  );
}
