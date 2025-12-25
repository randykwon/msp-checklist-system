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

  // 카테고리별 색상 스킴
  const colors = [
    { bg: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', light: '#E7F3FF', accent: '#1877F2', hoverBg: 'linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)' },
    { bg: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', light: '#E8F5E9', accent: '#42B883', hoverBg: 'linear-gradient(135deg, #2E7D32 0%, #43A047 100%)' },
    { bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', light: '#FEF3C7', accent: '#F59E0B', hoverBg: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)' },
    { bg: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', light: '#EDE9FE', accent: '#8B5CF6', hoverBg: 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)' },
    { bg: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', light: '#FCE7F3', accent: '#EC4899', hoverBg: 'linear-gradient(135deg, #DB2777 0%, #EC4899 100%)' },
    { bg: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)', light: '#CCFBF1', accent: '#14B8A6', hoverBg: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)' },
    { bg: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', light: '#FEE2E2', accent: '#EF4444', hoverBg: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)' },
    { bg: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', light: '#E0E7FF', accent: '#6366F1', hoverBg: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)' },
  ];

  return (
    <div className="space-y-4">
      {Object.entries(itemsByCategory).map(([category, categoryItems], index) => {
        const isExpanded = expandedCategories.has(category);
        const progress = getCategoryProgress(categoryItems);
        const colorScheme = colors[index % colors.length];

        return (
          <div 
            key={category} 
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: 'none'
            }}
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: colorScheme.bg,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 24, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
                  {isExpanded ? '📂' : '📁'}
                </span>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ 
                    fontSize: 18, 
                    fontWeight: 700, 
                    color: 'white',
                    margin: 0,
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}>
                    {language === 'ko' && categoryItems[0]?.categoryKo ? categoryItems[0].categoryKo : category}
                  </h3>
                  <p style={{ 
                    fontSize: 13, 
                    color: 'rgba(255,255,255,0.9)',
                    margin: '4px 0 0 0'
                  }}>
                    {progress.total} {t('assessmentDashboard.items')} • {progress.met} {t('assessmentDashboard.met')} • {progress.notMet} {t('assessmentDashboard.notMet')} • {progress.na} {t('assessmentDashboard.pending')}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Progress Bar */}
                <div style={{ width: 200 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
                      {t('dashboard.progress')}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>
                      {progress.percentage}%
                    </span>
                  </div>
                  <div style={{ 
                    height: 8, 
                    background: 'rgba(255,255,255,0.3)', 
                    borderRadius: 4, 
                    overflow: 'hidden' 
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress.percentage}%`,
                      background: 'white',
                      borderRadius: 4,
                      transition: 'width 0.3s'
                    }}></div>
                  </div>
                </div>

                <span style={{ 
                  color: 'white', 
                  fontSize: 14,
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 6
                }}>
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
