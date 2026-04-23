import { useState } from 'react';
import { MSPChecklistData, FilterStatus, FilterPriority, ChecklistItem } from '@/types';
import ChecklistItemComponent from './ChecklistItemComponent';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChecklistViewProps {
  data: MSPChecklistData;
  setData: (data: MSPChecklistData) => void;
  filterStatus: FilterStatus;
  filterPriority: FilterPriority;
  searchTerm: string;
}

export default function ChecklistView({
  data,
  setData,
  filterStatus,
  filterPriority,
  searchTerm
}: ChecklistViewProps) {
  const { language, t } = useLanguage();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const updateItem = (categoryId: string, itemId: string, updates: Partial<ChecklistItem>) => {
    const newData = { ...data };
    const category = newData.categories.find(c => c.id === categoryId);
    if (!category) return;

    const item = category.items.find(i => i.id === itemId);
    if (!item) return;

    Object.assign(item, { ...updates, lastUpdated: new Date() });

    // 진행률 재계산
    recalculateProgress(newData);
    setData(newData);
  };

  const recalculateProgress = (checklistData: MSPChecklistData) => {
    let totalCompleted = 0;
    let totalInProgress = 0;
    let totalItems = 0;

    checklistData.categories.forEach(category => {
      const completed = category.items.filter(i => i.status === 'completed').length;
      const inProgress = category.items.filter(i => i.status === 'in-progress').length;
      const total = category.items.length;

      category.progress = {
        total,
        completed,
        inProgress,
        percentage: total > 0 ? (completed / total) * 100 : 0
      };

      totalCompleted += completed;
      totalInProgress += inProgress;
      totalItems += total;
    });

    checklistData.overallProgress = {
      total: totalItems,
      completed: totalCompleted,
      inProgress: totalInProgress,
      percentage: totalItems > 0 ? (totalCompleted / totalItems) * 100 : 0
    };
  };

  const filterItems = (items: ChecklistItem[]) => {
    return items.filter(item => {
      // 상태 필터
      if (filterStatus !== 'all' && item.status !== filterStatus) {
        return false;
      }

      // 우선순위 필터
      if (filterPriority === 'prerequisite' && !item.isPrerequisite) {
        return false;
      }
      if (filterPriority === 'technical' && item.isPrerequisite) {
        return false;
      }

      // 검색어 필터
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const description = language === 'ko' && item.descriptionKo ? item.descriptionKo : item.description;
        return (
          item.control.toLowerCase().includes(search) ||
          description.toLowerCase().includes(search) ||
          item.notes.toLowerCase().includes(search)
        );
      }

      return true;
    });
  };

  return (
    <div className="space-y-6">
      {data.categories.map(category => {
        const filteredItems = filterItems(category.items);
        if (filteredItems.length === 0) return null;

        const isExpanded = expandedCategories.has(category.id);

        return (
          <div key={category.id} className="fb-checklist-category">
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full fb-checklist-category-header text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <h3 className="fb-checklist-category-title">
                      {language === 'ko' && category.nameKo ? category.nameKo : category.name}
                    </h3>
                    <span className="fb-checklist-item-count">
                      {filteredItems.length} {t('checklist.items')}
                    </span>
                  </div>
                  <p className="fb-checklist-category-description">
                    {language === 'ko' && category.descriptionKo ? category.descriptionKo : category.description}
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="fb-checklist-progress">
                    <div className="fb-checklist-progress-header">
                      <span className="fb-checklist-progress-label">진행률</span>
                      <span className="fb-checklist-progress-value">
                        {category.progress.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="fb-checklist-progress-bar">
                      <div
                        className="fb-checklist-progress-fill"
                        style={{ width: `${category.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="fb-checklist-category-stats">
                    <div className="fb-checklist-category-stat">
                      <div className="fb-checklist-category-stat-dot fb-checklist-category-stat-dot-completed"></div>
                      <span className="fb-checklist-category-stat-label">
                        {t('dashboard.completed')}: <span className="fb-checklist-category-stat-value">{category.progress.completed}</span>
                      </span>
                    </div>
                    <div className="fb-checklist-category-stat">
                      <div className="fb-checklist-category-stat-dot fb-checklist-category-stat-dot-in-progress"></div>
                      <span className="fb-checklist-category-stat-label">
                        진행중: <span className="fb-checklist-category-stat-value">{category.progress.inProgress}</span>
                      </span>
                    </div>
                    <div className="fb-checklist-category-stat">
                      <div className="fb-checklist-category-stat-dot fb-checklist-category-stat-dot-total"></div>
                      <span className="fb-checklist-category-stat-label">
                        전체: <span className="fb-checklist-category-stat-value">{category.progress.total}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ml-6">
                  <svg
                    className={`fb-checklist-expand-icon ${isExpanded ? 'fb-checklist-expand-icon-expanded' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="fb-checklist-category-content">
                <div className="fb-checklist-category-items">
                  {filteredItems.map(item => (
                    <ChecklistItemComponent
                      key={item.id}
                      item={item}
                      categoryId={category.id}
                      onUpdate={(updates) => updateItem(category.id, item.id, updates)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {data.categories.every(cat => filterItems(cat.items).length === 0) && (
        <div className="fb-card text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="fb-checklist-category-title mb-2">검색 결과가 없습니다</h3>
          <p className="fb-checklist-category-description">{t('checklist.noItems')}</p>
        </div>
      )}
    </div>
  );
}
