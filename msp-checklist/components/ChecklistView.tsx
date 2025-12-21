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
    <div className="space-y-4">
      {data.categories.map(category => {
        const filteredItems = filterItems(category.items);
        if (filteredItems.length === 0) return null;

        const isExpanded = expandedCategories.has(category.id);

        return (
          <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 text-left">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {language === 'ko' && category.nameKo ? category.nameKo : category.name}
                  </h3>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    {filteredItems.length} {t('checklist.items')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {language === 'ko' && category.descriptionKo ? category.descriptionKo : category.description}
                </p>
                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <span>{t('dashboard.completed')}: {category.progress.completed}/{category.progress.total}</span>
                  <span>{t('dashboard.progress')}: {category.progress.percentage.toFixed(1)}%</span>
                </div>
              </div>
              <svg
                className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-200 divide-y divide-gray-200">
                {filteredItems.map(item => (
                  <ChecklistItemComponent
                    key={item.id}
                    item={item}
                    categoryId={category.id}
                    onUpdate={(updates) => updateItem(category.id, item.id, updates)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {data.categories.every(cat => filterItems(cat.items).length === 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">{t('checklist.noItems')}</p>
        </div>
      )}
    </div>
  );
}
