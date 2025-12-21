import { useState } from 'react';
import { ChecklistItem } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChecklistItemProps {
  item: ChecklistItem;
  categoryId: string;
  onUpdate: (updates: Partial<ChecklistItem>) => void;
}

export default function ChecklistItemComponent({ item, onUpdate }: ChecklistItemProps) {
  const { language, t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(item.notes);
  const [assignee, setAssignee] = useState(item.assignee || '');

  const statusColors = {
    'not-started': 'bg-gray-100 text-gray-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    'completed': 'bg-green-100 text-green-700',
    'not-applicable': 'bg-gray-100 text-gray-500'
  };

  const statusLabels = {
    'not-started': t('filter.notStarted'),
    'in-progress': t('filter.inProgress'),
    'completed': t('filter.completed'),
    'not-applicable': t('filter.notApplicable')
  };

  const handleStatusChange = (newStatus: ChecklistItem['status']) => {
    onUpdate({ status: newStatus });
  };

  const handleSaveNotes = () => {
    onUpdate({ notes, assignee: assignee || undefined });
    setIsEditing(false);
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-sm font-semibold text-gray-700">{item.control}</span>
            {item.isPrerequisite && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                {t('filter.prerequisite')}
              </span>
            )}
            <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[item.status]}`}>
              {statusLabels[item.status]}
            </span>
          </div>

          <h4 className="text-base font-medium text-gray-900 mb-2">
            {language === 'ko' && item.descriptionKo ? item.descriptionKo : item.description}
          </h4>

          {item.subcategory && (
            <p className="text-sm text-gray-600 mb-2">{t('checklist.category')}: {item.subcategory}</p>
          )}

          <div className="mt-3">
            <p className="text-sm font-medium text-gray-700 mb-1">{t('checklist.evidenceRequired')}:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {(language === 'ko' && item.evidenceRequiredKo ? item.evidenceRequiredKo : item.evidenceRequired).map((evidence, index) => (
                <li key={index}>{evidence}</li>
              ))}
            </ul>
          </div>

          {(item.notes || item.assignee || isEditing) && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('checklist.assignee')}</label>
                    <input
                      type="text"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      placeholder={t('checklist.assigneePlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('checklist.notes')}</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder={t('checklist.notesPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNotes}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      {t('checklist.save')}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setNotes(item.notes);
                        setAssignee(item.assignee || '');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
                    >
                      {t('checklist.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {item.assignee && (
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">{t('checklist.assignee')}:</span> {item.assignee}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{t('checklist.notes')}:</span> {item.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500">
            {t('checklist.lastUpdated')}: {item.lastUpdated.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US')} {item.lastUpdated.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US')}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <select
            value={item.status}
            onChange={(e) => handleStatusChange(e.target.value as ChecklistItem['status'])}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="not-started">{t('filter.notStarted')}</option>
            <option value="in-progress">{t('filter.inProgress')}</option>
            <option value="completed">{t('filter.completed')}</option>
            <option value="not-applicable">{t('filter.notApplicable')}</option>
          </select>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('checklist.editNotes')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
