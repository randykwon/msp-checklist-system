'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

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

  // Load questions on component mount
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError('');
        const url = `/api/qa?itemId=${encodeURIComponent(itemId)}&assessmentType=${assessmentType}`;
        console.log('[QASection] Loading questions:', { itemId, assessmentType, url });
        
        const response = await fetch(url, { 
          signal: abortController.signal,
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (!isMounted) return;
        
        if (response.ok) {
          const data = await response.json();
          console.log('[QASection] Questions loaded:', { itemId, count: data.questions?.length || 0 });
          setQuestions(data.questions || []);
          setError('');
        } else {
          const errorData = await response.json();
          console.error('[QASection] Failed to load questions:', errorData);
          setError(errorData.error || 'Failed to load questions');
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('[QASection] Request aborted');
          return;
        }
        console.error('[QASection] Error loading questions:', error);
        if (isMounted) {
          setError('An error occurred while loading questions');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchQuestions();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
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

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError(''); // 로딩 시작 시 에러 클리어
      const url = `/api/qa?itemId=${encodeURIComponent(itemId)}&assessmentType=${assessmentType}`;
      console.log('[QASection] Loading questions:', { itemId, assessmentType, url });
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[QASection] Questions loaded:', { itemId, count: data.questions?.length || 0 });
        setQuestions(data.questions || []);
        setError(''); // 성공 시 에러 클리어
      } else {
        const errorData = await response.json();
        console.error('[QASection] Failed to load questions:', errorData);
        setError(errorData.error || 'Failed to load questions');
      }
    } catch (error) {
      console.error('[QASection] Error loading questions:', error);
      setError('An error occurred while loading questions');
    } finally {
      setLoading(false);
    }
  };

  const submitQuestion = async () => {
    if (!newQuestion.trim() || !user) return;

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

  return (
    <div style={{ padding: 16 }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-500">
          {questions.length} {language === 'ko' ? '개 질문' : 'questions'}
        </span>
      </div>

      {/* Question Form Toggle Button */}
      {user && !showQuestionForm && (
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <button
            onClick={() => setShowQuestionForm(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              color: 'white',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            ❓ {language === 'ko' ? '질문하기' : 'Ask Question'}
          </button>
        </div>
      )}

      {/* New Question Form */}
      {user && showQuestionForm && (
        <div style={{
          marginBottom: 24,
          padding: 24,
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
          border: '2px solid #F59E0B',
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
              ❓ {t('qa.askQuestion')}
            </h3>
            <button
              onClick={() => {
                setShowQuestionForm(false);
                setNewQuestion('');
                setAttachedFiles([]);
              }}
              style={{
                background: 'rgba(146, 64, 14, 0.1)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                color: '#92400E',
                fontSize: 16,
                fontWeight: 600
              }}
            >
              ✕ 닫기
            </button>
          </div>
          
          {/* 질문 입력 텍스트 영역 */}
          <div style={{ marginBottom: 20 }}>
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              style={{
                width: '100%',
                minHeight: 200,
                padding: 16,
                fontSize: 15,
                lineHeight: 1.6,
                border: '2px solid #F59E0B',
                borderRadius: 12,
                resize: 'vertical',
                background: 'white',
                color: '#1C1E21',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder={t('qa.questionPlaceholder')}
            />
          </div>

          {/* 파일 첨부 섹션 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#92400E' }}>
                📎 {language === 'ko' ? '파일 첨부 (선택사항)' : 'File Attachments (Optional)'}
              </label>
              <span style={{ fontSize: 12, color: '#B45309' }}>
                {language === 'ko' ? '최대 10MB, 여러 파일 가능' : 'Max 10MB, multiple files allowed'}
              </span>
            </div>
            
            {/* 파일 선택 버튼 */}
            <div>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-upload"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.zip,.rar"
              />
              <label
                htmlFor="file-upload"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#92400E',
                  background: 'white',
                  border: '2px dashed #F59E0B',
                  borderRadius: 10,
                  cursor: 'pointer'
                }}
              >
                📁 {language === 'ko' ? '파일 선택' : 'Choose Files'}
              </label>
              <span style={{ marginLeft: 12, fontSize: 13, color: '#B45309' }}>
                {attachedFiles.length > 0 
                  ? `${attachedFiles.length}개 파일 선택됨` 
                  : '선택된 파일 없음'}
              </span>
            </div>

            {/* 첨부된 파일 목록 */}
            {attachedFiles.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {attachedFiles.map((file, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'white',
                    borderRadius: 8,
                    marginBottom: 8,
                    border: '1px solid #FCD34D'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📄</span>
                      <span style={{ fontSize: 13, color: '#1C1E21' }}>{file.name}</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      style={{
                        background: '#FEE2E2',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        color: '#DC2626',
                        fontSize: 12
                      }}
                    >
                      ✕ 제거
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 안내 메시지 및 버튼 */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingTop: 16,
            borderTop: '1px solid #FCD34D'
          }}>
            <p style={{ fontSize: 13, color: '#92400E', margin: 0, maxWidth: '60%' }}>
              💡 {language === 'ko' 
                ? '관리자가 답변을 제공할 예정입니다. 구체적이고 명확한 질문을 작성해주세요.' 
                : 'Administrators will provide answers. Please write specific and clear questions.'}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setShowQuestionForm(false);
                  setNewQuestion('');
                  setAttachedFiles([]);
                }}
                style={{
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#92400E',
                  background: 'white',
                  border: '2px solid #F59E0B',
                  borderRadius: 10,
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={submitQuestion}
                disabled={!newQuestion.trim() || submittingQuestion}
                style={{
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'white',
                  background: !newQuestion.trim() || submittingQuestion 
                    ? '#D1D5DB' 
                    : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  border: 'none',
                  borderRadius: 10,
                  cursor: !newQuestion.trim() || submittingQuestion ? 'not-allowed' : 'pointer',
                  boxShadow: !newQuestion.trim() || submittingQuestion 
                    ? 'none' 
                    : '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}
              >
                {submittingQuestion 
                  ? (language === 'ko' ? '등록 중...' : 'Submitting...') 
                  : (language === 'ko' ? '질문 등록' : 'Submit Question')}
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
                <div className="text-sm text-gray-800 bg-blue-50 p-3 rounded-lg whitespace-pre-line" style={{ lineHeight: 1.8 }}>
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
                  <div className="text-sm text-gray-800 bg-green-50 p-3 rounded-lg prose prose-sm max-w-none prose-headings:text-green-800 prose-strong:text-green-900 prose-ul:my-2 prose-li:my-0.5">
                    <ReactMarkdown>{qa.answer}</ReactMarkdown>
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