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
          <div key={category.id} className="checklist-category">
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full checklist-category-header text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <h3 className="text-xl font-bold text-gray-900">
                      {language === 'ko' && category.nameKo ? category.nameKo : category.name}
                    </h3>
                    <span className="px-3 py-1 text-sm font-semibold bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-full border border-blue-200">
                      {filteredItems.length} {t('checklist.items')}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {language === 'ko' && category.descriptionKo ? category.descriptionKo : category.description}
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">진행률</span>
                      <span className="text-sm font-bold text-purple-600">
                        {category.progress.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${category.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="text-gray-600">
                        {t('dashboard.completed')}: <span className="font-semibold text-green-600">{category.progress.completed}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      <span className="text-gray-600">
                        진행중: <span className="font-semibold text-blue-600">{category.progress.inProgress}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                      <span className="text-gray-600">
                        전체: <span className="font-semibold text-gray-700">{category.progress.total}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ml-6">
                  <svg
                    className={`w-7 h-7 text-gray-400 transition-transform duration-300 ${isExpanded ? 'transform rotate-180' : ''}`}
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
              <div className="checklist-category-content border-t border-gray-100">
                <div className="divide-y divide-gray-100">
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
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
          <p className="text-gray-500">{t('checklist.noItems')}</p>
        </div>
      )}
    </div>
  );
}
