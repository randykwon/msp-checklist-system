'use client';

import { AssessmentItem } from '../lib/csv-parser';
import { useLanguage } from '@/contexts/LanguageContext';

interface AssessmentDashboardProps {
  items: AssessmentItem[];
  title: string;
}

export default function AssessmentDashboard({ items, title }: AssessmentDashboardProps) {
  const { t } = useLanguage();
  // 전체 통계
  const totalItems = items.length;
  const mandatoryItems = items.filter(item => item.isMandatory).length;
  const metItems = items.filter(item => item.met === true).length;
  const notMetItems = items.filter(item => item.met === false).length;
  const pendingItems = items.filter(item => item.met === null).length;
  const overallProgress = totalItems > 0 ? Math.round((metItems / totalItems) * 100) : 0;

  // 카테고리별 통계
  const categoryStats = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = { total: 0, met: 0, notMet: 0, pending: 0 };
    }
    acc[item.category].total++;
    if (item.met === true) acc[item.category].met++;
    else if (item.met === false) acc[item.category].notMet++;
    else acc[item.category].pending++;
    return acc;
  }, {} as Record<string, { total: number; met: number; notMet: number; pending: number }>);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg p-8 mb-8">
      {/* Title */}
      <h2 className="text-3xl font-bold text-gray-900 mb-6">{title}</h2>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-sm font-medium text-gray-500 mb-1">{t('assessmentDashboard.totalItems')}</div>
          <div className="text-3xl font-bold text-gray-900">{totalItems}</div>
          <div className="text-xs text-gray-500 mt-1">{mandatoryItems} {t('assessmentDashboard.mandatory')}</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-sm font-medium text-gray-500 mb-1">{t('assessmentDashboard.met')} ✓</div>
          <div className="text-3xl font-bold text-green-600">{metItems}</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalItems > 0 ? Math.round((metItems / totalItems) * 100) : 0}% {t('assessmentDashboard.complete')}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-sm font-medium text-gray-500 mb-1">{t('assessmentDashboard.notMet')} ✗</div>
          <div className="text-3xl font-bold text-red-600">{notMetItems}</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalItems > 0 ? Math.round((notMetItems / totalItems) * 100) : 0}% {t('assessmentDashboard.needWork')}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-sm font-medium text-gray-500 mb-1">{t('assessmentDashboard.pending')} ⏳</div>
          <div className="text-3xl font-bold text-gray-600">{pendingItems}</div>
          <div className="text-xs text-gray-500 mt-1">
            {totalItems > 0 ? Math.round((pendingItems / totalItems) * 100) : 0}% {t('assessmentDashboard.toReview')}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="text-sm font-medium text-gray-500 mb-1">{t('assessmentDashboard.overallProgress')}</div>
          <div className="text-3xl font-bold text-blue-600">{overallProgress}%</div>
          <div className="fb-progress fb-progress-xs mt-2">
            <div
              className="fb-progress-fill"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('assessmentDashboard.categoryBreakdown')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(categoryStats).map(([category, stats]) => {
            const percentage = stats.total > 0 ? Math.round((stats.met / stats.total) * 100) : 0;
            return (
              <div key={category} className="border border-gray-200 rounded-lg p-4">
                <div className="font-semibold text-gray-900 mb-2">{category}</div>
                <div className="text-sm text-gray-600 mb-2">
                  {stats.total} {t('assessmentDashboard.items')} • {stats.met} {t('assessmentDashboard.met')} • {stats.notMet} {t('assessmentDashboard.notMet')} • {stats.pending} {t('assessmentDashboard.pending')}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 fb-progress fb-progress-xs">
                    <div
                      className="fb-progress-fill fb-progress-fill-success"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-700 min-w-[40px] text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
