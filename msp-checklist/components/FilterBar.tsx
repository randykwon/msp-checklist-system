import { FilterStatus, FilterPriority } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface FilterBarProps {
  filterStatus: FilterStatus;
  setFilterStatus: (status: FilterStatus) => void;
  filterPriority: FilterPriority;
  setFilterPriority: (priority: FilterPriority) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export default function FilterBar({
  filterStatus,
  setFilterStatus,
  filterPriority,
  setFilterPriority,
  searchTerm,
  setSearchTerm
}: FilterBarProps) {
  const { t } = useLanguage();
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 상태 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('filter.status')}
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('filter.all')}</option>
            <option value="not-started">{t('filter.notStarted')}</option>
            <option value="in-progress">{t('filter.inProgress')}</option>
            <option value="completed">{t('filter.completed')}</option>
            <option value="not-applicable">{t('filter.notApplicable')}</option>
          </select>
        </div>

        {/* 우선순위 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('filter.type')}
          </label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('filter.all')}</option>
            <option value="prerequisite">{t('filter.prerequisite')}</option>
            <option value="technical">{t('filter.technical')}</option>
          </select>
        </div>

        {/* 검색 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('filter.search')}
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('filter.searchPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
