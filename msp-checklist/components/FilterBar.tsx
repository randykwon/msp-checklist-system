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
    <div className="filter-bar">
      <div className="filter-grid">
        {/* 상태 필터 */}
        <div className="filter-group">
          <label className="filter-label">
            📊 {t('filter.status')}
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          >
            <option value="all">{t('filter.all')}</option>
            <option value="not-started">{t('filter.notStarted')}</option>
            <option value="in-progress">{t('filter.inProgress')}</option>
            <option value="completed">{t('filter.completed')}</option>
            <option value="not-applicable">{t('filter.notApplicable')}</option>
          </select>
        </div>

        {/* 우선순위 필터 */}
        <div className="filter-group">
          <label className="filter-label">
            🎯 {t('filter.type')}
          </label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
          >
            <option value="all">{t('filter.all')}</option>
            <option value="prerequisite">{t('filter.prerequisite')}</option>
            <option value="technical">{t('filter.technical')}</option>
          </select>
        </div>

        {/* 검색 */}
        <div className="filter-group">
          <label className="filter-label">
            🔍 {t('filter.search')}
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('filter.searchPlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}
