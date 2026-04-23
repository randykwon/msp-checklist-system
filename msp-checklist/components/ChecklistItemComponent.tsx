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

  // Facebook-style status classes
  const fbStatusClasses = {
    'not-started': 'fb-checklist-item-status-not-started',
    'in-progress': 'fb-checklist-item-status-in-progress',
    'completed': 'fb-checklist-item-status-completed',
    'not-applicable': 'fb-checklist-item-status-not-applicable'
  };

  // Determine if item is completed for background styling
  const isCompleted = item.status === 'completed';

  return (
    <div className={`fb-checklist-item ${isCompleted ? 'fb-checklist-item-completed' : ''}`}>
      <div className="fb-checklist-item-header">
        <div className="fb-checklist-item-content">
          <div className="fb-checklist-item-control">
            <span className="fb-checklist-item-control-number">{item.control}</span>
            {item.isPrerequisite && (
              <span className="fb-checklist-item-prerequisite">
                {t('filter.prerequisite')}
              </span>
            )}
            <span className={`fb-checklist-item-status ${fbStatusClasses[item.status]}`}>
              {statusLabels[item.status]}
            </span>
          </div>

          <h4 className="fb-checklist-item-title">
            {language === 'ko' && item.descriptionKo ? item.descriptionKo : item.description}
          </h4>

          {item.subcategory && (
            <p className="fb-checklist-item-description">{t('checklist.category')}: {item.subcategory}</p>
          )}

          <div className="fb-checklist-item-evidence">
            <p className="fb-checklist-item-evidence-title">{t('checklist.evidenceRequired')}:</p>
            <ul className="fb-checklist-item-evidence-list">
              {(language === 'ko' && item.evidenceRequiredKo ? item.evidenceRequiredKo : item.evidenceRequired).map((evidence, index) => (
                <li key={index}>{evidence}</li>
              ))}
            </ul>
          </div>

          {(item.notes || item.assignee || isEditing) && (
            <div className="fb-checklist-item-edit-form">
              {isEditing ? (
                <div>
                  <div className="fb-checklist-item-edit-form-field">
                    <label className="fb-checklist-item-edit-form-label">{t('checklist.assignee')}</label>
                    <input
                      type="text"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      placeholder={t('checklist.assigneePlaceholder')}
                      className="fb-checklist-item-edit-form-input"
                    />
                  </div>
                  <div className="fb-checklist-item-edit-form-field">
                    <label className="fb-checklist-item-edit-form-label">{t('checklist.notes')}</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder={t('checklist.notesPlaceholder')}
                      className="fb-checklist-item-edit-form-textarea"
                    />
                  </div>
                  <div className="fb-checklist-item-edit-form-actions">
                    <button
                      onClick={handleSaveNotes}
                      className="fb-btn fb-btn-primary"
                    >
                      {t('checklist.save')}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setNotes(item.notes);
                        setAssignee(item.assignee || '');
                      }}
                      className="fb-btn fb-btn-secondary"
                    >
                      {t('checklist.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="fb-checklist-item-notes">
                  {item.assignee && (
                    <p className="fb-checklist-item-notes-text">
                      <span className="fb-checklist-item-notes-label">{t('checklist.assignee')}:</span> {item.assignee}
                    </p>
                  )}
                  {item.notes && (
                    <p className="fb-checklist-item-notes-text">
                      <span className="fb-checklist-item-notes-label">{t('checklist.notes')}:</span> {item.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="fb-checklist-item-timestamp">
            {t('checklist.lastUpdated')}: {item.lastUpdated.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US')} {item.lastUpdated.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US')}
          </div>
        </div>

        <div className="fb-checklist-item-actions">
          <select
            value={item.status}
            onChange={(e) => handleStatusChange(e.target.value as ChecklistItem['status'])}
            className="fb-checklist-item-select"
          >
            <option value="not-started">{t('filter.notStarted')}</option>
            <option value="in-progress">{t('filter.inProgress')}</option>
            <option value="completed">{t('filter.completed')}</option>
            <option value="not-applicable">{t('filter.notApplicable')}</option>
          </select>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="fb-checklist-item-edit-btn"
            >
              {t('checklist.editNotes')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
