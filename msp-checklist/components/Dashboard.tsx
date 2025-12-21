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
      color: 'text-gray-600'
    },
    {
      label: t('dashboard.completed'),
      value: overallProgress.completed,
      color: 'text-green-600'
    },
    {
      label: t('dashboard.inProgress'),
      value: overallProgress.inProgress,
      color: 'text-blue-600'
    },
    {
      label: t('dashboard.progress'),
      value: `${overallProgress.percentage.toFixed(1)}%`,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('dashboard.overallProgress')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full transition-all duration-500"
          style={{ width: `${overallProgress.percentage}%` }}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.categories.map((category) => (
          <div key={category.id} className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-sm text-gray-900 mb-2">{category.name}</h3>
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>{t('dashboard.completed')}: {category.progress.completed}/{category.progress.total}</span>
              <span>{category.progress.percentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${category.progress.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
