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

      {/* Overall Stats - Horizontal Layout with Colors */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)', 
        gap: '16px', 
        marginBottom: '32px'
      }}>
        {/* 총 항목 - 파란색 */}
        <div style={{
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
            color: 'white'
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.9 }}>{t('assessmentDashboard.totalItems')}</div>
          </div>
          <div style={{ padding: '16px', background: 'white' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1877F2' }}>{totalItems}</div>
            <div style={{ fontSize: 12, color: '#65676B', marginTop: 4 }}>{mandatoryItems} {t('assessmentDashboard.mandatory')}</div>
          </div>
        </div>

        {/* 충족 - 녹색 */}
        <div style={{
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
            color: 'white'
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.9 }}>{t('assessmentDashboard.met')} ✓</div>
          </div>
          <div style={{ padding: '16px', background: 'white' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#42B883' }}>{metItems}</div>
            <div style={{ fontSize: 12, color: '#65676B', marginTop: 4 }}>
              {totalItems > 0 ? Math.round((metItems / totalItems) * 100) : 0}% {t('assessmentDashboard.complete')}
            </div>
          </div>
        </div>

        {/* 미충족 - 빨간색 */}
        <div style={{
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
            color: 'white'
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.9 }}>{t('assessmentDashboard.notMet')} ✗</div>
          </div>
          <div style={{ padding: '16px', background: 'white' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#EF4444' }}>{notMetItems}</div>
            <div style={{ fontSize: 12, color: '#65676B', marginTop: 4 }}>
              {totalItems > 0 ? Math.round((notMetItems / totalItems) * 100) : 0}% {t('assessmentDashboard.needWork')}
            </div>
          </div>
        </div>

        {/* 대기 중 - 주황색 */}
        <div style={{
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
            color: 'white'
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.9 }}>{t('assessmentDashboard.pending')} ⏳</div>
          </div>
          <div style={{ padding: '16px', background: 'white' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#F59E0B' }}>{pendingItems}</div>
            <div style={{ fontSize: 12, color: '#65676B', marginTop: 4 }}>
              {totalItems > 0 ? Math.round((pendingItems / totalItems) * 100) : 0}% {t('assessmentDashboard.toReview')}
            </div>
          </div>
        </div>

        {/* 전체 진행률 - 보라색 */}
        <div style={{
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
            color: 'white'
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.9 }}>{t('assessmentDashboard.overallProgress')}</div>
          </div>
          <div style={{ padding: '16px', background: 'white' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#8B5CF6' }}>{overallProgress}%</div>
            <div style={{ height: 8, background: '#E4E6EB', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
              <div style={{
                height: '100%',
                width: `${overallProgress}%`,
                background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                borderRadius: 4,
                transition: 'width 0.3s'
              }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('assessmentDashboard.categoryBreakdown')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(categoryStats).map(([category, stats], index) => {
            const percentage = stats.total > 0 ? Math.round((stats.met / stats.total) * 100) : 0;
            // 카테고리별 색상 스킴
            const colors = [
              { bg: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', light: '#E7F3FF', accent: '#1877F2' },
              { bg: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', light: '#E8F5E9', accent: '#42B883' },
              { bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', light: '#FEF3C7', accent: '#F59E0B' },
              { bg: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', light: '#EDE9FE', accent: '#8B5CF6' },
              { bg: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', light: '#FCE7F3', accent: '#EC4899' },
              { bg: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)', light: '#CCFBF1', accent: '#14B8A6' },
              { bg: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', light: '#FEE2E2', accent: '#EF4444' },
              { bg: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', light: '#E0E7FF', accent: '#6366F1' },
            ];
            const colorScheme = colors[index % colors.length];
            
            return (
              <div 
                key={category} 
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: 'none',
                  minHeight: 140
                }}
              >
                {/* 카드 헤더 */}
                <div style={{
                  padding: '14px 16px',
                  background: colorScheme.bg,
                  color: 'white'
                }}>
                  <div style={{ fontWeight: 700, fontSize: 16, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                    {category}
                  </div>
                </div>
                {/* 카드 바디 */}
                <div style={{ padding: '14px 16px', background: 'white' }}>
                  <div style={{ fontSize: 13, color: '#65676B', marginBottom: 12 }}>
                    {stats.total} {t('assessmentDashboard.items')} • {stats.met} {t('assessmentDashboard.met')} • {stats.notMet} {t('assessmentDashboard.notMet')} • {stats.pending} {t('assessmentDashboard.pending')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 8, background: '#E4E6EB', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: colorScheme.bg,
                        borderRadius: 4,
                        transition: 'width 0.3s'
                      }}></div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: colorScheme.accent, minWidth: 45, textAlign: 'right' }}>
                      {percentage}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
