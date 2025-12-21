'use client';

import { AssessmentItem } from '../lib/csv-parser';
import AssessmentItemComponent from './AssessmentItem';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AssessmentViewProps {
  items: AssessmentItem[];
  assessmentType: 'prerequisites' | 'technical';
  onUpdate: (itemId: string, updates: Partial<AssessmentItem>) => void;
}

export default function AssessmentView({ items, assessmentType, onUpdate }: AssessmentViewProps) {
  const { language, t } = useLanguage();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 카테고리별로 그룹화
  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, AssessmentItem[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // 카테고리별 진행률 계산
  const getCategoryProgress = (categoryItems: AssessmentItem[]) => {
    const total = categoryItems.length;
    const met = categoryItems.filter(item => item.met === true).length;
    const notMet = categoryItems.filter(item => item.met === false).length;
    const na = categoryItems.filter(item => item.met === null).length;
    const percentage = total > 0 ? Math.round((met / total) * 100) : 0;
    return { total, met, notMet, na, percentage };
  };

  return (
    <div className="space-y-4">
      {Object.entries(itemsByCategory).map(([category, categoryItems]) => {
        const isExpanded = expandedCategories.has(category);
        const progress = getCategoryProgress(categoryItems);

        return (
          <div key={category} className="border border-gray-300 rounded-lg overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{isExpanded ? '📂' : '📁'}</span>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-gray-900">
                    {language === 'ko' && categoryItems[0]?.categoryKo ? categoryItems[0].categoryKo : category}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {progress.total} {t('assessmentDashboard.items')} • {progress.met} {t('assessmentDashboard.met')} • {progress.notMet} {t('assessmentDashboard.notMet')} • {progress.na} {t('assessmentDashboard.pending')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Progress Bar */}
                <div className="w-48">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-600">{t('dashboard.progress')}</span>
                    <span className="text-xs font-bold text-blue-600">{progress.percentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>

                <span className="text-gray-400">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {/* Category Items */}
            {isExpanded && (
              <div className="p-6 bg-white space-y-4">
                {categoryItems.map(item => (
                  <AssessmentItemComponent
                    key={item.id}
                    item={item}
                    assessmentType={assessmentType}
                    onUpdate={onUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
