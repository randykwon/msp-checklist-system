'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { AdminAnnouncement } from '@/lib/db';

interface AnnouncementFormData {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

// 공지사항 내용 포맷팅 함수
const formatAnnouncementContent = (content: string): string => {
  return content
    // 줄바꿈을 <br>로 변환하되, 연속된 줄바꿈은 단락으로 처리
    .replace(/\n\n+/g, '</p><p class="mt-3 mb-2">')
    .replace(/\n/g, '<br>')
    // 전체를 p 태그로 감싸기
    .replace(/^(.*)$/, '<p class="mb-2">$1</p>')
    // **굵은 글씨** 처리
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 bg-yellow-50 px-1 rounded">$1</strong>')
    // *기울임* 처리
    .replace(/\*(.*?)\*/g, '<em class="italic text-gray-600">$1</em>')
    // 중요한 키워드들 강조 (예: 중요, 주의, 알림 등)
    .replace(/(중요|주의|알림|공지|안내|필수|긴급|마감|종료|시작|오픈|업데이트|변경|수정)/g, '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mx-0.5">🔔 $1</span>')
    // 긍정적 키워드 강조
    .replace(/(완료|성공|승인|확정|개선|추가|신규|오픈)/g, '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mx-0.5">✅ $1</span>')
    // 날짜 패턴 강조 (YYYY-MM-DD, YYYY.MM.DD, MM/DD 등)
    .replace(/(\d{4}[-\.\/]\d{1,2}[-\.\/]\d{1,2}|\d{1,2}[-\.\/]\d{1,2})/g, '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mx-0.5">📅 $1</span>')
    // 시간 패턴 강조 (HH:MM)
    .replace(/(\d{1,2}:\d{2})/g, '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mx-0.5">🕐 $1</span>')
    // URL 링크 처리
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2">🔗 링크</a>')
    // 이메일 주소 강조
    .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" class="inline-flex items-center text-blue-600 hover:text-blue-800 underline decoration-2 underline-offset-2">📧 $1</a>')
    // 전화번호 패턴 강조
    .replace(/(\d{2,3}-\d{3,4}-\d{4})/g, '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mx-0.5">📞 $1</span>')
    // 숫자 + 단위 강조 (예: 30일, 100%, 5개 등)
    .replace(/(\d+)(일|개월|년|시간|분|초|개|명|건|회|번|%)/g, '<span class="font-semibold text-indigo-600 bg-indigo-50 px-1 rounded">$1$2</span>')
    // 목록 항목 처리 (- 또는 * 로 시작하는 줄)
    .replace(/^[\-\*]\s(.+)$/gm, '<div class="flex items-start my-2 pl-2"><span class="text-blue-500 mr-3 mt-1">•</span><span class="flex-1">$1</span></div>')
    // 번호 목록 처리 (1. 2. 3. 등)
    .replace(/^(\d+)\.\s(.+)$/gm, '<div class="flex items-start my-2 pl-2"><span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium mr-3 mt-0.5 flex-shrink-0">$1</span><span class="flex-1">$2</span></div>')
    // 구분선 처리 (--- 또는 ***)
    .replace(/^(---|\*\*\*)$/gm, '<hr class="my-4 border-gray-300">')
    // 인용문 처리 (> 로 시작하는 줄)
    .replace(/^>\s(.+)$/gm, '<blockquote class="border-l-4 border-blue-300 pl-4 py-2 my-3 bg-blue-50 italic text-gray-700">$1</blockquote>');
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showFormattingGuide, setShowFormattingGuide] = useState(false);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    content: '',
    type: 'info',
    priority: 1,
    isActive: true,
    startDate: '',
    endDate: ''
  });

  // 공지사항 목록 가져오기
  const fetchAnnouncements = async () => {
    try {
      console.log('=== FETCHING ANNOUNCEMENTS ===');
      const response = await fetch('/api/announcements', {
        credentials: 'include'
      });
      
      console.log('Fetch Response Status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched announcements:', data);
        setAnnouncements(data.announcements || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch announcements:', errorData);
      }
    } catch (error) {
      console.error('Exception during fetch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'info',
      priority: 1,
      isActive: true,
      startDate: '',
      endDate: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  // 공지사항 저장
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (saving) {
      console.log('Already saving, ignoring duplicate submission');
      return;
    }
    
    // 폼 데이터 검증
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    
    if (!formData.content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }
    
    setSaving(true);
    
    try {
      const url = editingId ? `/api/announcements/${editingId}` : '/api/announcements';
      const method = editingId ? 'PUT' : 'POST';
      
      console.log('=== ANNOUNCEMENT SAVE DEBUG ===');
      console.log('URL:', url);
      console.log('Method:', method);
      console.log('Form Data:', formData);
      console.log('Editing ID:', editingId);
      
      // Clean up form data - convert empty strings to null for optional fields
      const cleanFormData = {
        ...formData,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null
      };
      
      const requestBody = JSON.stringify(cleanFormData);
      console.log('Request Body:', requestBody);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: requestBody
      });
      
      console.log('Response Status:', response.status);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Raw Response Text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('Parsed Response:', result);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(`서버 응답을 파싱할 수 없습니다: ${responseText}`);
      }
      
      if (response.ok) {
        console.log('✅ Save successful:', result);
        alert('공지사항이 성공적으로 저장되었습니다.');
        await fetchAnnouncements();
        resetForm();
      } else {
        console.error('❌ Save failed:', result);
        alert(`저장 실패: ${result.error || '알 수 없는 오류가 발생했습니다.'}`);
      }
    } catch (error) {
      console.error('💥 Exception during save:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      alert(`저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setSaving(false);
    }
  };

  // 공지사항 활성화/비활성화 토글
  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/announcements/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      
      if (response.ok) {
        // 목록을 다시 불러오지 않고 로컬 상태만 업데이트
        setAnnouncements(prev => 
          prev.map(announcement => 
            announcement.id === id 
              ? { ...announcement, isActive: !currentStatus }
              : announcement
          )
        );
      } else {
        const error = await response.json();
        alert(`상태 변경 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('Toggle error:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 공지사항 삭제
  const handleDelete = async (id: number) => {
    if (!confirm('이 공지사항을 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        await fetchAnnouncements();
      } else {
        const error = await response.json();
        alert(`삭제 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 모든 공지사항 활성화/비활성화 토글
  const handleToggleAll = async () => {
    const activeCount = announcements.filter(a => a.isActive).length;
    const shouldActivate = activeCount < announcements.length / 2; // 절반 미만이 활성화되어 있으면 모두 활성화
    
    const confirmMessage = shouldActivate 
      ? '모든 공지사항을 활성화하시겠습니까?' 
      : '모든 공지사항을 비활성화하시겠습니까?';
      
    if (!confirm(confirmMessage)) return;
    
    try {
      // 모든 공지사항의 상태를 변경
      const promises = announcements.map(announcement => 
        fetch(`/api/announcements/${announcement.id}/toggle`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ isActive: shouldActivate })
        })
      );
      
      await Promise.all(promises);
      
      // 로컬 상태 업데이트
      setAnnouncements(prev => 
        prev.map(announcement => ({ ...announcement, isActive: shouldActivate }))
      );
      
      alert(`모든 공지사항이 ${shouldActivate ? '활성화' : '비활성화'}되었습니다.`);
    } catch (error) {
      console.error('Bulk toggle error:', error);
      alert('일괄 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 편집 시작
  const handleEdit = (announcement: AdminAnnouncement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      isActive: announcement.isActive,
      startDate: announcement.startDate ? announcement.startDate.split('T')[0] : '',
      endDate: announcement.endDate ? announcement.endDate.split('T')[0] : ''
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  // 타입별 스타일
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // 우선순위 표시
  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 3: return '높음';
      case 2: return '보통';
      default: return '낮음';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">공지사항 관리</h1>
              <p className="text-gray-600">사용자에게 표시될 공지사항을 작성하고 관리합니다</p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={fetchAnnouncements}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                새로고침
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                새 공지사항 작성
              </button>
            </div>
          </div>
        </div>

        {/* 공지사항 폼 */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? '공지사항 수정' : '새 공지사항 작성'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {editingId ? '기존 공지사항의 내용을 수정합니다' : '새로운 공지사항을 작성합니다'}
                </p>
              </div>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    제목 *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    타입
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">정보</option>
                    <option value="warning">경고</option>
                    <option value="success">성공</option>
                    <option value="error">오류</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    내용 *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFormattingGuide(!showFormattingGuide)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <svg className={`w-3 h-3 mr-1 transition-transform ${showFormattingGuide ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    서식 가이드
                  </button>
                </div>
                
                {showFormattingGuide && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <h4 className="font-medium text-blue-900 mb-2">텍스트 서식</h4>
                        <div className="space-y-1 text-blue-800">
                          <div><code>**굵은 글씨**</code> → <strong>굵은 글씨</strong></div>
                          <div><code>*기울임*</code> → <em>기울임</em></div>
                          <div><code>중요, 주의, 알림</code> → 🔔 뱃지</div>
                          <div><code>완료, 성공</code> → ✅ 뱃지</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-900 mb-2">목록 & 기타</h4>
                        <div className="space-y-1 text-blue-800">
                          <div><code>- 목록 항목</code> → • 불릿</div>
                          <div><code>1. 번호 목록</code> → ① 번호</div>
                          <div><code>&gt; 인용문</code> → 인용 박스</div>
                          <div><code>---</code> → 구분선</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="공지사항 내용을 입력하세요...

💡 자동 스타일링 기능:
• **굵은 글씨** - 중요한 내용 강조
• *기울임* - 부가 설명
• 중요, 주의, 알림, 긴급 → 🔔 빨간 뱃지
• 완료, 성공, 승인 → ✅ 초록 뱃지  
• 2024-12-19 → 📅 날짜 뱃지
• 14:30 → 🕐 시간 뱃지
• 02-1234-5678 → 📞 전화번호 뱃지
• 30일, 100% → 숫자 강조
• - 목록 항목 → • 불릿 포인트
• 1. 번호 목록 → ① 번호 뱃지
• > 인용문 → 파란색 인용 박스
• --- → 구분선"
                    required
                  />
                  
                  {formData.content && (
                    <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
                      <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        미리보기
                      </div>
                      <div 
                        className="prose prose-sm max-w-none text-gray-700"
                        style={{
                          fontSize: '0.9rem',
                          lineHeight: '1.6'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: formatAnnouncementContent(formData.content)
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    우선순위
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>낮음</option>
                    <option value={2}>보통</option>
                    <option value={3}>높음</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  활성화
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      저장 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {editingId ? '수정 완료' : '저장'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 공지사항 목록 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900">공지사항 목록</h2>
                <span className="text-sm text-gray-500">
                  {announcements.length}개의 공지사항 
                  ({announcements.filter(a => a.isActive).length}개 활성)
                </span>
              </div>
              <div className="flex items-center space-x-3">
                {announcements.length > 0 && (
                  <button
                    onClick={handleToggleAll}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                    title="모든 공지사항의 활성화 상태를 일괄 변경합니다"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    일괄 토글
                  </button>
                )}
                <div className="text-xs text-gray-400">
                  💡 체크박스를 클릭하여 개별 활성화/비활성화
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">로딩 중...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 공지사항이 없습니다</h3>
              <p className="text-gray-500">새 공지사항을 작성해보세요.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {announcements.map((announcement) => (
                <div key={announcement.id} className={`p-6 hover:bg-gray-50 transition-colors duration-200 ${!announcement.isActive ? 'bg-gray-50 border-l-4 border-gray-300' : 'border-l-4 border-transparent'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        {/* 활성화/비활성화 체크박스 */}
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`active-${announcement.id}`}
                            checked={announcement.isActive}
                            onChange={() => handleToggleActive(announcement.id, announcement.isActive)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            title={announcement.isActive ? '활성화됨 - 클릭하여 비활성화' : '비활성화됨 - 클릭하여 활성화'}
                          />
                          <label 
                            htmlFor={`active-${announcement.id}`} 
                            className={`ml-2 text-sm font-medium cursor-pointer ${
                              announcement.isActive 
                                ? 'text-green-700' 
                                : 'text-gray-500'
                            }`}
                            title={announcement.isActive ? '활성화됨 - 클릭하여 비활성화' : '비활성화됨 - 클릭하여 활성화'}
                          >
                            {announcement.isActive ? '🟢 활성' : '⚫ 비활성'}
                          </label>
                        </div>
                        <h3 className={`text-lg font-semibold ${announcement.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                          {announcement.title}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeStyles(announcement.type)}`}>
                          {announcement.type === 'info' && '📢'}
                          {announcement.type === 'warning' && '⚠️'}
                          {announcement.type === 'success' && '✅'}
                          {announcement.type === 'error' && '❌'}
                          <span className="ml-1">
                            {announcement.type === 'info' && '정보'}
                            {announcement.type === 'warning' && '경고'}
                            {announcement.type === 'success' && '성공'}
                            {announcement.type === 'error' && '오류'}
                          </span>
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          announcement.priority === 3 ? 'bg-red-100 text-red-800 border border-red-200' :
                          announcement.priority === 2 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {announcement.priority === 3 && '🔴 높음'}
                          {announcement.priority === 2 && '🟡 보통'}
                          {announcement.priority === 1 && '⚪ 낮음'}
                        </span>

                      </div>
                      
                      <div className={`mb-4 p-4 rounded-lg border ${
                        announcement.isActive 
                          ? 'bg-white border-gray-200' 
                          : 'bg-gray-50 border-gray-300'
                      }`}>
                        <div 
                          className={`prose prose-sm max-w-none leading-relaxed ${
                            announcement.isActive ? 'text-gray-700' : 'text-gray-500'
                          }`}
                          style={{
                            fontSize: '0.95rem',
                            lineHeight: '1.7'
                          }}
                          dangerouslySetInnerHTML={{
                            __html: formatAnnouncementContent(announcement.content)
                          }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            작성자: {announcement.createdByName}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            작성일: {new Date(announcement.createdAt).toLocaleString('ko-KR')}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {announcement.startDate && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              시작일: {new Date(announcement.startDate).toLocaleDateString('ko-KR')}
                            </div>
                          )}
                          {announcement.endDate && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              종료일: {new Date(announcement.endDate).toLocaleDateString('ko-KR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-6">
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="inline-flex items-center px-3 py-1.5 border border-blue-300 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors duration-200"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}