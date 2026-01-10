'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/AdminLayout';

interface EvidenceFile {
  id: string;
  userId: number;
  userName?: string;
  userEmail?: string;
  itemId: string;
  assessmentType: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  fileSize: number;
  localPath: string;
  s3Key?: string;
  s3Uploaded: boolean;
  uploadedAt: string;
  evaluation?: {
    score: number;
    feedback: string;
    evaluatedAt: string;
    llmProvider?: string;
    llmModel?: string;
  };
}

interface UserSummary {
  userId: number;
  userName: string;
  userEmail: string;
  totalEvaluations: number;
  averageScore: number;
  lastEvaluatedAt: string;
  evaluatedItems: string[];
  totalFiles: number;
  totalFileSize: number;
}

interface UserEvaluation {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  itemId: string;
  assessmentType: string;
  score: number;
  feedback: string;
  evaluatedAt: string;
  llmProvider: string;
  llmModel: string;
  fileCount: number;
  totalFileSize: number;
}

interface EvidenceStats {
  pending: { count: number; size: number; sizeFormatted: string };
  uploaded: { count: number; size: number; sizeFormatted: string };
}

interface EvalStats {
  totalEvaluations: number;
  totalUsers: number;
  averageScore: number;
  totalFiles: number;
}

interface LLMModel {
  id: string;
  name: string;
  provider: string;
}

const LLM_MODELS: LLMModel[] = [
  { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet v2', provider: 'bedrock' },
  { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku', provider: 'bedrock' },
  { id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', name: 'Claude Sonnet 4.5', provider: 'bedrock' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
];

type ViewMode = 'files' | 'users' | 'evaluations';

export default function EvidenceManagementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  
  // 파일 관련 상태
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [stats, setStats] = useState<EvidenceStats | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(true);
  
  // 사용자/평가 관련 상태
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [userEvaluations, setUserEvaluations] = useState<UserEvaluation[]>([]);
  const [evalStats, setEvalStats] = useState<EvalStats | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // UI 상태
  const [viewMode, setViewMode] = useState<ViewMode>('users');
  const [selectedModel, setSelectedModel] = useState(LLM_MODELS[0].id);
  const [selectedProvider, setSelectedProvider] = useState(LLM_MODELS[0].provider);
  const [evidenceUploadEnabled, setEvidenceUploadEnabled] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [selectedFile, setSelectedFile] = useState<EvidenceFile | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<UserEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'evaluated'>('all');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchEvidenceFiles();
      fetchStats();
      fetchSettings();
      fetchUserEvaluations();
    }
  }, [user]);

  const fetchEvidenceFiles = async () => {
    try {
      setLoadingFiles(true);
      const response = await fetch('/api/evidence/list');
      if (response.ok) {
        const data = await response.json();
        setEvidenceFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to fetch evidence files:', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/evidence/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/system/settings');
      if (response.ok) {
        const data = await response.json();
        setEvidenceUploadEnabled(data.evidenceUploadEnabled || false);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchUserEvaluations = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch('/api/evidence/user-evaluations?view=summary');
      if (response.ok) {
        const data = await response.json();
        setUserSummaries(data.users || []);
        setEvalStats(data.stats || null);
      }
    } catch (error) {
      console.error('Failed to fetch user evaluations:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUserDetail = async (userId: number) => {
    try {
      const response = await fetch(`/api/evidence/user-evaluations?view=user&userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserEvaluations(data.evaluations || []);
      }
    } catch (error) {
      console.error('Failed to fetch user detail:', error);
    }
  };

  const handleToggleUpload = async () => {
    setUpdatingSettings(true);
    try {
      const newValue = !evidenceUploadEnabled;
      const response = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'evidenceUploadEnabled', value: newValue })
      });
      
      if (response.ok) {
        setEvidenceUploadEnabled(newValue);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const model = LLM_MODELS.find(m => m.id === modelId);
    if (model) {
      setSelectedProvider(model.provider);
    }
  };

  const handleEvaluate = async (file: EvidenceFile) => {
    setEvaluating(true);
    try {
      const response = await fetch('/api/evidence/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: file.id,
          itemId: file.itemId,
          llmConfig: {
            provider: selectedProvider,
            model: selectedModel
          }
        })
      });
      
      if (response.ok) {
        fetchEvidenceFiles();
        fetchUserEvaluations();
        alert('평가가 완료되었습니다.');
      } else {
        const error = await response.json();
        alert(`평가 실패: ${error.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Failed to evaluate:', error);
      alert('평가 중 오류가 발생했습니다.');
    } finally {
      setEvaluating(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const filteredFiles = evidenceFiles.filter(file => {
    if (filter === 'pending') return !file.evaluation;
    if (filter === 'evaluated') return !!file.evaluation;
    return true;
  });

  if (!isHydrated || loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F2F5' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">📎 증빙 자료 관리</h1>
              <p className="text-gray-600">사용자별 증빙 자료 업로드 및 평가 현황을 확인합니다</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center gap-3">
              <button
                onClick={() => {
                  fetchEvidenceFiles();
                  fetchUserEvaluations();
                }}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                새로고침
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{evalStats?.totalUsers || 0}</p>
              <p className="text-sm text-gray-600 mt-1">👥 평가 사용자</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{evalStats?.totalEvaluations || 0}</p>
              <p className="text-sm text-gray-600 mt-1">📊 총 평가 수</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <p className={`text-3xl font-bold ${getScoreColor(evalStats?.averageScore || 0).split(' ')[0]}`}>
                {evalStats?.averageScore || 0}점
              </p>
              <p className="text-sm text-gray-600 mt-1">📈 평균 점수</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats?.pending.count || 0}</p>
              <p className="text-sm text-gray-600 mt-1">⏳ 대기 파일</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats?.uploaded.count || 0}</p>
              <p className="text-sm text-gray-600 mt-1">✅ 업로드 완료</p>
            </div>
          </div>
        </div>

        {/* Settings Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Toggle */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ 업로드 설정</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">증빙 자료 업로드</p>
                <p className="text-xs text-gray-500 mt-1">
                  {evidenceUploadEnabled ? '✅ 사용자가 증빙 자료를 업로드할 수 있습니다' : '🚫 업로드 기능이 비활성화되어 있습니다'}
                </p>
              </div>
              <button
                onClick={handleToggleUpload}
                disabled={updatingSettings}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  evidenceUploadEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  evidenceUploadEnabled ? 'left-8' : 'left-1'
                }`} />
              </button>
            </div>
          </div>

          {/* LLM Model Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 검증 LLM 모델</h3>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {LLM_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex gap-2">
            {[
              { key: 'users', label: '👥 사용자별 현황', count: userSummaries.length },
              { key: 'evaluations', label: '📊 평가 기록', count: evalStats?.totalEvaluations || 0 },
              { key: 'files', label: '📁 업로드 파일', count: evidenceFiles.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key as ViewMode)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === tab.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Users View */}
        {viewMode === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">👥 사용자별 평가 현황</h3>
            </div>
            
            {loadingUsers ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">로딩 중...</p>
              </div>
            ) : userSummaries.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">👥</span>
                </div>
                <p className="text-gray-500">아직 평가된 사용자가 없습니다</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용자</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">평가 수</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">평균 점수</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">파일 수</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">마지막 평가</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {userSummaries.map(userSum => (
                      <tr key={userSum.userId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-600 font-semibold">
                                {userSum.userName?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{userSum.userName || `User ${userSum.userId}`}</p>
                              <p className="text-sm text-gray-500">{userSum.userEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            {userSum.totalEvaluations}개
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(userSum.averageScore)}`}>
                            {userSum.averageScore}점
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">
                          {userSum.totalFiles}개 ({formatFileSize(userSum.totalFileSize)})
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-500">
                          {new Date(userSum.lastEvaluatedAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedUser(userSum);
                              fetchUserDetail(userSum.userId);
                            }}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            상세보기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Evaluations View */}
        {viewMode === 'evaluations' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">📊 전체 평가 기록</h3>
            </div>
            
            {userSummaries.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">📊</span>
                </div>
                <p className="text-gray-500">아직 평가 기록이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {userSummaries.flatMap(userSum => 
                  userSum.evaluatedItems.map((itemId, idx) => (
                    <div key={`${userSum.userId}-${itemId}-${idx}`} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {userSum.userName?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{userSum.userName}</p>
                            <p className="text-sm text-gray-500">{itemId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(userSum.averageScore)}`}>
                            평균 {userSum.averageScore}점
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(userSum.lastEvaluatedAt).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Files View */}
        {viewMode === 'files' && (
          <>
            {/* Filter Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex gap-2">
                {[
                  { key: 'all', label: '전체', count: evidenceFiles.length },
                  { key: 'pending', label: '미검증', count: evidenceFiles.filter(f => !f.evaluation).length },
                  { key: 'evaluated', label: '검증완료', count: evidenceFiles.filter(f => f.evaluation).length },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === tab.key
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Files List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">📁 업로드된 증빙 자료</h3>
              </div>
              
              {loadingFiles ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">로딩 중...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">업로드된 증빙 자료가 없습니다</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredFiles.map(file => (
                    <div key={file.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              file.fileType === 'image' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {file.fileType === 'image' ? '🖼️ 이미지' : '📄 PDF'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {file.itemId}
                            </span>
                            {file.evaluation && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getScoreColor(file.evaluation.score)}`}>
                                ✅ {file.evaluation.score}점
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-gray-900">{file.fileName}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span>👤 {file.userEmail || `User ${file.userId}`}</span>
                            <span>📁 {formatFileSize(file.fileSize)}</span>
                            <span>📅 {new Date(file.uploadedAt).toLocaleString('ko-KR')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => setSelectedFile(file)}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            상세보기
                          </button>
                          {!file.evaluation && (
                            <button
                              onClick={() => handleEvaluate(file)}
                              disabled={evaluating}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {evaluating ? '검증 중...' : '🤖 AI 검증'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* User Detail Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-xl">
                      {selectedUser.userName?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedUser.userName}</h3>
                    <p className="text-sm text-gray-500">{selectedUser.userEmail}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setUserEvaluations([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* User Stats */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{selectedUser.totalEvaluations}</p>
                    <p className="text-xs text-gray-500">총 평가</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${getScoreColor(selectedUser.averageScore).split(' ')[0]}`}>
                      {selectedUser.averageScore}점
                    </p>
                    <p className="text-xs text-gray-500">평균 점수</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{selectedUser.totalFiles}</p>
                    <p className="text-xs text-gray-500">총 파일</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-600">{formatFileSize(selectedUser.totalFileSize)}</p>
                    <p className="text-xs text-gray-500">총 용량</p>
                  </div>
                </div>
              </div>

              {/* User Evaluations */}
              <div className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4">📊 평가 기록</h4>
                {userEvaluations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">평가 기록을 불러오는 중...</p>
                ) : (
                  <div className="space-y-4">
                    {userEvaluations.map(eval_ => (
                      <div key={eval_.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">
                              {eval_.itemId}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(eval_.score)}`}>
                              {eval_.score}점
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(eval_.evaluatedAt).toLocaleString('ko-KR')}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="text-gray-400">모델:</span> {eval_.llmProvider}/{eval_.llmModel}
                        </div>
                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                          {eval_.feedback.split('\n').slice(0, 5).join('\n')}
                          {eval_.feedback.split('\n').length > 5 && (
                            <button
                              onClick={() => setSelectedEvaluation(eval_)}
                              className="text-blue-600 hover:underline ml-2"
                            >
                              더보기...
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* File Detail Modal */}
        {selectedFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">📎 증빙 자료 상세</h3>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">파일명</p>
                    <p className="font-medium">{selectedFile.fileName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">항목 ID</p>
                    <p className="font-medium">{selectedFile.itemId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">사용자</p>
                    <p className="font-medium">{selectedFile.userEmail || `User ${selectedFile.userId}`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">파일 크기</p>
                    <p className="font-medium">{formatFileSize(selectedFile.fileSize)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">업로드 일시</p>
                    <p className="font-medium">{new Date(selectedFile.uploadedAt).toLocaleString('ko-KR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">파일 타입</p>
                    <p className="font-medium">{selectedFile.fileType === 'image' ? '🖼️ 이미지' : '📄 PDF'}</p>
                  </div>
                </div>
                
                {selectedFile.evaluation && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-green-800">🤖 AI 검증 결과</h4>
                      <span className={`text-2xl font-bold ${getScoreColor(selectedFile.evaluation.score).split(' ')[0]}`}>
                        {selectedFile.evaluation.score}점
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedFile.evaluation.feedback}</p>
                    <p className="text-xs text-gray-500 mt-3">
                      {selectedFile.evaluation.llmProvider}/{selectedFile.evaluation.llmModel} • {new Date(selectedFile.evaluation.evaluatedAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                )}
                
                {!selectedFile.evaluation && (
                  <div className="mt-6">
                    <button
                      onClick={() => {
                        handleEvaluate(selectedFile);
                        setSelectedFile(null);
                      }}
                      disabled={evaluating}
                      className="w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {evaluating ? '검증 중...' : '🤖 AI로 검증하기'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Evaluation Detail Modal */}
        {selectedEvaluation && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">📊 평가 상세</h3>
                  <p className="text-sm text-gray-500">{selectedEvaluation.itemId}</p>
                </div>
                <button
                  onClick={() => setSelectedEvaluation(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-4 py-2 rounded-full text-lg font-bold ${getScoreColor(selectedEvaluation.score)}`}>
                    {selectedEvaluation.score}점
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(selectedEvaluation.evaluatedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  <span className="text-gray-400">모델:</span> {selectedEvaluation.llmProvider}/{selectedEvaluation.llmModel}
                </div>
                <div className="prose prose-sm max-w-none">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {selectedEvaluation.feedback}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
