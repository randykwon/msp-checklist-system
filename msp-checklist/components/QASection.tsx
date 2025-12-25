'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { isValidItemId } from '@/lib/assessment-validator';

interface QAItem {
  id: number;
  itemId: string;
  assessmentType: string;
  question: string;
  answer?: string;
  questionUserId: number;
  answerUserId?: number;
  questionCreatedAt: string;
  answerCreatedAt?: string;
  questionUserName: string;
  answerUserName?: string;
}

interface QASectionProps {
  itemId: string;
  assessmentType: 'prerequisites' | 'technical';
}

export default function QASection({ itemId, assessmentType }: QASectionProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [answeringQuestionId, setAnsweringQuestionId] = useState<number | null>(null);
  const [newAnswer, setNewAnswer] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [error, setError] = useState<string>('');
  const [isValidItem, setIsValidItem] = useState<boolean>(true);

  // Validate itemId on component mount
  useEffect(() => {
    const valid = isValidItemId(itemId, assessmentType);
    setIsValidItem(valid);
    if (!valid) {
      console.warn(`Invalid itemId '${itemId}' for assessment type '${assessmentType}'`);
      setError(`Invalid assessment item: ${itemId}`);
    }
  }, [itemId, assessmentType]);

  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`파일 "${file.name}"이 너무 큽니다. 10MB 이하의 파일만 첨부 가능합니다.`);
        return false;
      }
      return true;
    });
    
    setAttachedFiles(prev => [...prev, ...validFiles]);
    // 입력 필드 초기화
    if (event.target) {
      event.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Load questions on component mount
  useEffect(() => {
    loadQuestions();
  }, [itemId, assessmentType]);

  const loadQuestions = async () => {
    // Don't load questions for invalid items
    if (!isValidItem) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/qa?itemId=${itemId}&assessmentType=${assessmentType}`);
      
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions);
        setError(''); // Clear any previous errors
      } else {
        const errorData = await response.json();
        console.error('Failed to load questions:', errorData);
        setError(errorData.error || 'Failed to load questions');
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      setError('An error occurred while loading questions');
    } finally {
      setLoading(false);
    }
  };

  const submitQuestion = async () => {
    if (!newQuestion.trim() || !user || !isValidItem) return;

    try {
      setSubmittingQuestion(true);
      setError('');

      // FormData를 사용하여 파일과 텍스트를 함께 전송
      const formData = new FormData();
      formData.append('action', 'create_question');
      formData.append('itemId', itemId);
      formData.append('assessmentType', assessmentType);
      formData.append('question', newQuestion.trim());
      
      // 첨부 파일들 추가
      attachedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/qa', {
        method: 'POST',
        body: formData, // JSON 대신 FormData 사용 (Content-Type 헤더 제거)
      });

      if (response.ok) {
        setNewQuestion('');
        setAttachedFiles([]);
        setShowQuestionForm(false);
        await loadQuestions(); // Reload questions
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit question');
      }
    } catch (error) {
      console.error('Error submitting question:', error);
      setError('An error occurred while submitting the question');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const submitAnswer = async (questionId: number) => {
    if (!newAnswer.trim() || !user) return;

    try {
      setSubmittingAnswer(true);
      setError('');

      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'answer_question',
          questionId,
          answer: newAnswer.trim(),
        }),
      });

      if (response.ok) {
        setNewAnswer('');
        setAnsweringQuestionId(null);
        await loadQuestions(); // Reload questions
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('An error occurred while submitting the answer');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const deleteQuestion = async (questionId: number) => {
    if (!confirm(language === 'ko' ? '이 질문을 삭제하시겠습니까?' : 'Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_question',
          questionId,
        }),
      });

      if (response.ok) {
        await loadQuestions(); // Reload questions
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      setError('An error occurred while deleting the question');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US');
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  // Show warning for invalid items
  if (!isValidItem) {
    return (
      <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-yellow-600 text-lg mr-2">⚠️</span>
          <div>
            <h5 className="text-sm font-semibold text-yellow-800">
              {language === 'ko' ? '유효하지 않은 평가 항목' : 'Invalid Assessment Item'}
            </h5>
            <p className="text-xs text-yellow-700 mt-1">
              {language === 'ko' 
                ? `항목 ID '${itemId}'는 ${assessmentType} 평가에 존재하지 않습니다.`
                : `Item ID '${itemId}' does not exist in ${assessmentType} assessment.`
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500">
          {questions.length} {language === 'ko' ? '개 질문' : 'questions'}
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-800">{error}</div>
          <button
            onClick={() => setError('')}
            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
          >
            {language === 'ko' ? '닫기' : 'Close'}
          </button>
        </div>
      )}

      {/* Question Form Toggle Button */}
      {user && isValidItem && !showQuestionForm && (
        <div className="mb-6 text-center">
          <button
            onClick={() => setShowQuestionForm(true)}
            className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {language === 'ko' ? '질문하기' : 'Ask Question'}
          </button>
        </div>
      )}

      {/* New Question Form */}
      {user && isValidItem && showQuestionForm && (
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('qa.askQuestion')}
            </h3>
            <button
              onClick={() => {
                setShowQuestionForm(false);
                setNewQuestion('');
                setAttachedFiles([]);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mb-4">
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="w-full min-h-[160px] p-4 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-sm leading-relaxed bg-white shadow-sm"
              placeholder={t('qa.questionPlaceholder')}
            />
          </div>

          {/* 파일 첨부 섹션 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-blue-900">
                {language === 'ko' ? '파일 첨부 (선택사항)' : 'File Attachments (Optional)'}
              </label>
              <span className="text-xs text-gray-500">
                {language === 'ko' ? '최대 10MB, 여러 파일 가능' : 'Max 10MB, multiple files allowed'}
              </span>
            </div>
            
            {/* 파일 선택 버튼 */}
            <div className="relative">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.zip,.rar"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 border-2 border-dashed border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 cursor-pointer transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {language === 'ko' ? '파일 선택' : 'Choose Files'}
              </label>
            </div>

            {/* 첨부된 파일 목록 */}
            {attachedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-gray-700">
                  {language === 'ko' ? '첨부된 파일:' : 'Attached Files:'}
                </p>
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title={language === 'ko' ? '파일 제거' : 'Remove file'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs text-blue-700">
              {language === 'ko' 
                ? '관리자가 답변을 제공할 예정입니다. 구체적이고 명확한 질문을 작성해주세요.' 
                : 'Administrators will provide answers. Please write specific and clear questions.'}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowQuestionForm(false);
                  setNewQuestion('');
                  setAttachedFiles([]);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {language === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                onClick={submitQuestion}
                disabled={!newQuestion.trim() || submittingQuestion || !isValidItem}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {submittingQuestion ? 
                  (language === 'ko' ? '등록 중...' : 'Submitting...') : 
                  t('qa.submitQuestion')
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">💭</div>
            <div className="text-sm">{t('qa.noQuestions')}</div>
          </div>
        ) : (
          questions.map((qa) => (
            <div key={qa.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              {/* Question */}
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-medium text-sm">❓ {t('qa.questionBy')}</span>
                    <span className="text-sm text-gray-700 font-medium">{qa.questionUserName}</span>
                    <span className="text-xs text-gray-500">{formatDate(qa.questionCreatedAt)}</span>
                  </div>
                  {(user?.userId === qa.questionUserId || user?.role === 'admin') && (
                    <button
                      onClick={() => deleteQuestion(qa.id)}
                      className="text-xs text-red-600 hover:text-red-800 underline"
                    >
                      {t('qa.delete')}
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-800 bg-blue-50 p-3 rounded-lg">
                  {qa.question}
                </div>
              </div>

              {/* Answer */}
              {qa.answer ? (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-600 font-medium text-sm">✅ {t('qa.answeredBy')}</span>
                    <span className="text-sm text-gray-700 font-medium">{qa.answerUserName}</span>
                    <span className="text-xs text-gray-500">{qa.answerCreatedAt && formatDate(qa.answerCreatedAt)}</span>
                  </div>
                  <div className="text-sm text-gray-800 bg-green-50 p-3 rounded-lg">
                    {qa.answer}
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-4">
                  {user?.role === 'admin' ? (
                    answeringQuestionId === qa.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={newAnswer}
                          onChange={(e) => setNewAnswer(e.target.value)}
                          className="w-full min-h-[80px] p-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
                          placeholder={t('qa.answerPlaceholder')}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setAnsweringQuestionId(null);
                              setNewAnswer('');
                            }}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                          >
                            {language === 'ko' ? '취소' : 'Cancel'}
                          </button>
                          <button
                            onClick={() => submitAnswer(qa.id)}
                            disabled={!newAnswer.trim() || submittingAnswer}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                          >
                            {submittingAnswer ? 
                              (language === 'ko' ? '등록 중...' : 'Submitting...') : 
                              t('qa.submitAnswer')
                            }
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-orange-600 font-medium">
                          ⏳ {t('qa.unanswered')}
                        </span>
                        <button
                          onClick={() => setAnsweringQuestionId(qa.id)}
                          className="px-3 py-1 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          {t('qa.answer')}
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="text-sm text-orange-600 font-medium">
                      ⏳ {t('qa.unanswered')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!user && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <div className="text-sm text-gray-600">
            {language === 'ko' ? 
              '질문을 하려면 로그인이 필요합니다.' : 
              'Please log in to ask questions.'
            }
          </div>
        </div>
      )}
    </div>
  );
}