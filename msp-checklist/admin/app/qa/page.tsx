'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/AdminLayout';
import PermissionGuard from '@/components/PermissionGuard';

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

interface QAStats {
  total: number;
  answered: number;
  unanswered: number;
  byType: {
    prerequisite: number;
    technical: number;
  };
}

export default function QAPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [allQuestions, setAllQuestions] = useState<QAItem[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<QAItem[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered'>('unanswered');
  const [typeFilter, setTypeFilter] = useState<'all' | 'prerequisite' | 'technical'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedQuestion, setSelectedQuestion] = useState<QAItem | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QAItem | null>(null);
  const [answer, setAnswer] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [generatingAnswer, setGeneratingAnswer] = useState(false);
  const [stats, setStats] = useState<QAStats | null>(null);
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [validationStats, setValidationStats] = useState<any>(null);
  const [cleaningUp, setCleaningUp] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchQuestions();
    }
  }, [user]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [allQuestions, filter, typeFilter, searchTerm, sortBy, sortOrder]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/qa/all');
      if (response.ok) {
        const data = await response.json();
        setAllQuestions(data.questions);
        calculateStats(data.questions);
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const calculateStats = (questions: QAItem[]) => {
    const stats: QAStats = {
      total: questions.length,
      answered: questions.filter(q => q.answer).length,
      unanswered: questions.filter(q => !q.answer).length,
      byType: {
        prerequisite: questions.filter(q => q.assessmentType === 'prerequisite').length,
        technical: questions.filter(q => q.assessmentType === 'technical').length,
      }
    };
    setStats(stats);
  };

  const applyFiltersAndSort = () => {
    let filtered = [...allQuestions];

    // 상태 필터
    if (filter === 'answered') {
      filtered = filtered.filter(q => q.answer);
    } else if (filter === 'unanswered') {
      filtered = filtered.filter(q => !q.answer);
    }

    // 유형 필터
    if (typeFilter !== 'all') {
      filtered = filtered.filter(q => q.assessmentType === typeFilter);
    }

    // 검색 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(term) ||
        q.itemId.toLowerCase().includes(term) ||
        q.questionUserName.toLowerCase().includes(term) ||
        (q.answer && q.answer.toLowerCase().includes(term))
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.questionCreatedAt).getTime() - new Date(b.questionCreatedAt).getTime();
          break;
        case 'status':
          comparison = (a.answer ? 1 : 0) - (b.answer ? 1 : 0);
          break;
        case 'type':
          comparison = a.assessmentType.localeCompare(b.assessmentType);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredQuestions(filtered);
  };

  const handleAnswerSubmit = async (questionId: number) => {
    if (!answer.trim()) {
      alert('답변을 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/qa/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          answer: answer.trim(),
        }),
      });

      if (response.ok) {
        setAnswer('');
        setSelectedQuestion(null);
        await fetchQuestions();
      } else {
        const error = await response.json();
        alert(error.error || '답변 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('답변 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateAnswer = async (qa: QAItem, isEditing = false) => {
    setGeneratingAnswer(true);
    try {
      const response = await fetch('/api/qa/generate-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: qa.question,
          itemId: qa.itemId,
          assessmentType: qa.assessmentType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (isEditing) {
          setEditAnswer(data.answer);
        } else {
          setAnswer(data.answer);
        }

        // 컨텍스트 사용 정보 표시
        if (data.contextUsed) {
          const contextInfo = [];
          if (data.contextUsed.hasItemDetails) contextInfo.push('평가 항목 정보');
          if (data.contextUsed.hasAdvice) contextInfo.push('AI 조언');
          if (data.contextUsed.hasVirtualEvidence) contextInfo.push('가상증빙예제');
          
          if (contextInfo.length > 0) {
            console.log(`AI 답변 생성 시 참고한 컨텍스트: ${contextInfo.join(', ')}`);
            // 사용자에게도 알림 표시
            alert(`✅ AI 답변이 생성되었습니다!\n\n참고한 컨텍스트:\n• ${contextInfo.join('\n• ')}\n\n생성된 답변을 검토하고 필요에 따라 수정하세요.`);
          }
        }
      } else {
        const error = await response.json();
        alert(error.error || 'AI 답변 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to generate answer:', error);
      alert('AI 답변 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingAnswer(false);
    }
  };

  const handleAnswerUpdate = async (questionId: number) => {
    if (!editAnswer.trim()) {
      alert('수정할 답변을 입력해주세요.');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch('/api/qa/update-answer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          answer: editAnswer.trim(),
        }),
      });

      if (response.ok) {
        setEditAnswer('');
        setEditingQuestion(null);
        await fetchQuestions();
      } else {
        const error = await response.json();
        alert(error.error || '답변 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update answer:', error);
      alert('답변 수정 중 오류가 발생했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const startEditAnswer = (qa: QAItem) => {
    setEditingQuestion(qa);
    setEditAnswer(qa.answer || '');
  };

  const cancelEdit = () => {
    setEditingQuestion(null);
    setEditAnswer('');
  };

  const validateQAItems = async () => {
    try {
      const response = await fetch('/api/qa/validate');
      if (response.ok) {
        const data = await response.json();
        setValidationStats(data);
        setShowValidationPanel(true);
      } else {
        const error = await response.json();
        alert(error.error || 'Q&A 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to validate Q&A items:', error);
      alert('Q&A 검증 중 오류가 발생했습니다.');
    }
  };

  const cleanupInvalidItems = async () => {
    if (!confirm('유효하지 않은 Q&A 항목들을 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setCleaningUp(true);
    try {
      const response = await fetch('/api/qa/cleanup', {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${result.deletedCount}개의 유효하지 않은 Q&A 항목이 삭제되었습니다.`);
        await fetchQuestions();
        await validateQAItems(); // 검증 결과 업데이트
      } else {
        const error = await response.json();
        alert(error.error || 'Q&A 정리에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to cleanup Q&A items:', error);
      alert('Q&A 정리 중 오류가 발생했습니다.');
    } finally {
      setCleaningUp(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <PermissionGuard requiredRoute="/qa">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">질의응답 관리</h1>
              <p className="text-gray-600">사용자 질문에 답변하고 Q&A 데이터를 관리합니다</p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={validateQAItems}
                className="inline-flex items-center px-4 py-2 border border-purple-300 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                데이터 검증
              </button>
              <button
                onClick={fetchQuestions}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                새로고침
              </button>
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">전체 질문</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">답변 완료</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.answered}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">미답변</h3>
                    <p className="text-2xl font-bold text-gray-900">{stats.unanswered}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">답변률</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 필터 및 검색 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">필터 및 검색</h2>
            <span className="text-sm text-gray-500">{filteredQuestions.length}개의 질문</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* 상태 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | 'unanswered' | 'answered')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체</option>
                  <option value="unanswered">미답변</option>
                  <option value="answered">답변완료</option>
                </select>
              </div>

              {/* 유형 필터 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | 'prerequisite' | 'technical')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체</option>
                  <option value="prerequisite">사전요구사항</option>
                  <option value="technical">기술검증</option>
                </select>
              </div>

              {/* 정렬 기준 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">정렬</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'status' | 'type')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="date">날짜순</option>
                  <option value="status">상태순</option>
                  <option value="type">유형순</option>
                </select>
              </div>

              {/* 정렬 순서 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">순서</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="desc">내림차순</option>
                  <option value="asc">오름차순</option>
                </select>
              </div>

              {/* 검색 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="질문, 항목ID, 사용자명..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

          {/* 필터 결과 요약 */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              총 {filteredQuestions.length}개의 질문이 표시됩니다
              {searchTerm && ` (검색: "${searchTerm}")`}
            </span>
            {(filter !== 'all' || typeFilter !== 'all' || searchTerm) && (
              <button
                onClick={() => {
                  setFilter('all');
                  setTypeFilter('all');
                  setSearchTerm('');
                  setSortBy('date');
                  setSortOrder('desc');
                }}
                className="inline-flex items-center px-3 py-1.5 border border-blue-300 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                필터 초기화
              </button>
            )}
          </div>
        </div>

        {/* Q&A 목록 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">질문 목록</h2>
              <span className="text-sm text-gray-500">{filteredQuestions.length}개의 질문</span>
            </div>
          </div>

          {questionsLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">질문 목록 로딩 중...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? '검색 결과가 없습니다' : 
                 filter === 'unanswered' ? '미답변 질문이 없습니다' : 
                 filter === 'answered' ? '답변완료된 질문이 없습니다' : 
                 '질문이 없습니다'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? '다른 검색어를 시도해보세요.' : 
                 filter === 'unanswered' ? '모든 질문에 답변이 완료되었습니다.' : 
                 '사용자가 질문을 등록하면 여기에 표시됩니다.'}
              </p>
              {(filter !== 'all' || typeFilter !== 'all' || searchTerm) && (
                <button
                  onClick={() => {
                    setFilter('all');
                    setTypeFilter('all');
                    setSearchTerm('');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  모든 질문 보기
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredQuestions.map((qa) => (
                <div key={qa.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  {/* 질문 정보 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600 font-medium text-sm">❓ 질문 #{qa.id}</span>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {qa.itemId}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          {qa.assessmentType === 'prerequisite' ? '사전요구사항' : '기술검증'}
                        </span>
                        {qa.answer ? (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            답변완료
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                            미답변
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {qa.questionUserName} • {formatDate(qa.questionCreatedAt)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-800 bg-blue-50 p-3 rounded-lg">
                      {qa.question}
                    </div>
                  </div>

                  {/* 답변 */}
                  {qa.answer ? (
                    <div className="border-t border-gray-100 pt-4">
                      {editingQuestion?.id === qa.id ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">
                              답변 수정
                            </label>
                            <button
                              onClick={() => handleGenerateAnswer(qa, true)}
                              disabled={generatingAnswer}
                              className="flex items-center px-3 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md border border-purple-200"
                            >
                              {generatingAnswer ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-600 mr-1"></div>
                                  AI 생성 중...
                                </>
                              ) : (
                                <>
                                  🤖 AI로 다시 생성 (조언+예제 참고)
                                </>
                              )}
                            </button>
                          </div>
                          <textarea
                            value={editAnswer}
                            onChange={(e) => setEditAnswer(e.target.value)}
                            className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                            placeholder="수정할 답변을 입력하세요..."
                          />
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                              💡 팁: 기존 답변을 개선하거나 AI로 해당 항목의 조언과 가상증빙예제를 참고한 새로운 답변을 생성할 수 있습니다
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={cancelEdit}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleAnswerUpdate(qa.id)}
                                disabled={updating || !editAnswer.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg"
                              >
                                {updating ? '수정 중...' : '답변 수정'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-green-600 font-medium text-sm">✅ 답변</span>
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => startEditAnswer(qa)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                ✏️ 수정
                              </button>
                              <div className="text-xs text-gray-500">
                                {qa.answerUserName} • {qa.answerCreatedAt && formatDate(qa.answerCreatedAt)}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-800 bg-green-50 p-3 rounded-lg">
                            {qa.answer}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="border-t border-gray-100 pt-4">
                      {selectedQuestion?.id === qa.id ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700">
                              답변 작성
                            </label>
                            <button
                              onClick={() => handleGenerateAnswer(qa)}
                              disabled={generatingAnswer}
                              className="flex items-center px-3 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-md border border-purple-200"
                            >
                              {generatingAnswer ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-600 mr-1"></div>
                                  AI 생성 중...
                                </>
                              ) : (
                                <>
                                  🤖 AI 답변 생성 (조언+예제 참고)
                                </>
                              )}
                            </button>
                          </div>
                          <textarea
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-y"
                            placeholder="직접 답변을 입력하거나 'AI 답변 생성' 버튼을 클릭하여 자동 생성된 답변을 사용하세요."
                          />
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-gray-500">
                              💡 팁: AI가 해당 항목의 조언과 가상증빙예제를 참고하여 생성한 답변을 검토하고 필요에 따라 수정하세요
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedQuestion(null);
                                  setAnswer('');
                                }}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleAnswerSubmit(qa.id)}
                                disabled={submitting || !answer.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg"
                              >
                                {submitting ? '등록 중...' : '답변 등록'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-orange-600 font-medium">
                            ⏳ 미답변
                          </span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setSelectedQuestion(qa);
                                setAnswer(''); // 답변 필드를 비워둠
                              }}
                              className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg"
                            >
                              답변 작성
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Q&A 데이터 검증 패널 */}
        {showValidationPanel && validationStats && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Q&A 데이터 검증 결과
              </h3>
              
              {/* 검증 통계 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">{validationStats.stats.totalQuestions}</div>
                    <div className="text-sm text-blue-600">전체 질문</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-900">{validationStats.stats.validQuestions}</div>
                    <div className="text-sm text-green-600">유효한 질문</div>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-900">{validationStats.stats.invalidQuestions}</div>
                    <div className="text-sm text-red-600">유효하지 않은 질문</div>
                  </div>
                </div>
              </div>

              {/* 유효하지 않은 항목들 */}
              {validationStats.invalidItems.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-red-900 mb-3">
                    ⚠️ 유효하지 않은 Q&A 항목들
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {validationStats.invalidItems.map((item: any) => (
                      <div key={item.id} className="mb-3 p-3 bg-white border border-red-300 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-red-800">
                            {item.itemId} ({item.assessmentType})
                          </span>
                          <span className="text-xs text-red-600">
                            ID: {item.id}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 mb-1">
                          <strong>질문:</strong> {item.question.substring(0, 100)}...
                        </div>
                        <div className="text-xs text-gray-500">
                          질문자: {item.questionUserName} | 
                          생성일: {new Date(item.questionCreatedAt).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={cleanupInvalidItems}
                      disabled={cleaningUp}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md text-sm font-medium"
                    >
                      {cleaningUp ? '정리 중...' : '🗑️ 유효하지 않은 항목들 삭제'}
                    </button>
                  </div>
                </div>
              )}

              {/* 유효한 항목 ID 목록 */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  📋 유효한 평가 항목 ID 목록
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-blue-700 mb-2">사전요구사항 ({validationStats.stats.validItemIds.prerequisites.length}개)</h5>
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 max-h-40 overflow-y-auto">
                      <div className="text-xs text-blue-800 space-x-2">
                        {validationStats.stats.validItemIds.prerequisites.map((id: string) => (
                          <span key={id} className="inline-block bg-blue-100 px-2 py-1 rounded mb-1">{id}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-green-700 mb-2">기술검증 ({validationStats.stats.validItemIds.technical.length}개)</h5>
                    <div className="bg-green-50 border border-green-200 rounded p-3 max-h-40 overflow-y-auto">
                      <div className="text-xs text-green-800 space-x-2">
                        {validationStats.stats.validItemIds.technical.map((id: string) => (
                          <span key={id} className="inline-block bg-green-100 px-2 py-1 rounded mb-1">{id}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowValidationPanel(false);
                    setValidationStats(null);
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
      </PermissionGuard>
    </AdminLayout>
  );
}