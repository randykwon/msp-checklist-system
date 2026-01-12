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
  evidenceFiles?: EvidenceFile[];
  evaluation?: EvaluationData;
}

interface EvidenceFile {
  id: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  fileSize: number;
  base64Data: string;
  uploadedAt: string;
  extractedText?: string;
}

interface EvaluationData {
  score: number;
  feedback: string;
  evaluatedAt: string;
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

// LLM 설정 인터페이스
interface LLMConfig {
  provider: 'openai' | 'gemini' | 'claude' | 'bedrock';
  model: string;
  apiKey?: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  inferenceProfileArn?: string;
  autoCreateInferenceProfile?: boolean;
  temperature?: number;
  maxTokens?: number;
}

// Inference Profile이 필요한 모델 목록
const INFERENCE_PROFILE_REQUIRED_MODELS = [
  'anthropic.claude-opus-4-5-20251101-v1:0',
  'anthropic.claude-sonnet-4-5-20250929-v1:0',
  'anthropic.claude-haiku-4-5-20251001-v1:0',
  'anthropic.claude-3-5-sonnet-20241022-v2:0',  // Sonnet v2도 Inference Profile 필요
];

const LLM_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (추천)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    ],
    color: '#10A37F',
  },
  claude: {
    name: 'Anthropic Claude',
    icon: '🧠',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (추천)' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    ],
    color: '#D97706',
  },
  gemini: {
    name: 'Google Gemini',
    icon: '✨',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (추천)' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ],
    color: '#4285F4',
  },
  bedrock: {
    name: 'AWS Bedrock',
    icon: '☁️',
    models: [
      { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku (빠름/저렴, 추천)' },
      { id: 'anthropic.claude-3-5-haiku-20241022-v1:0', name: 'Claude 3.5 Haiku (빠름)' },
      { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: '🔐 Claude 3.5 Sonnet v2 (Inference Profile 필요)' },
      { id: 'anthropic.claude-3-opus-20240229-v1:0', name: 'Claude 3 Opus (고성능)' },
      { id: 'anthropic.claude-opus-4-5-20251101-v1:0', name: '🔐 Claude 4.5 Opus (Inference Profile)' },
      { id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', name: '🔐 Claude 4.5 Sonnet (Inference Profile)' },
      { id: 'anthropic.claude-haiku-4-5-20251001-v1:0', name: '🔐 Claude 4.5 Haiku (Inference Profile)' },
    ],
    color: '#FF9900',
  },
};

export default function QAPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
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
  const [viewingFile, setViewingFile] = useState<EvidenceFile | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<Set<number>>(new Set());
  
  // LLM 설정 관련 state
  const [showLLMConfigModal, setShowLLMConfigModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAwsSecretKey, setShowAwsSecretKey] = useState(false);
  const [llmConfig, setLLMConfig] = useState<LLMConfig>({
    provider: 'bedrock',
    model: 'anthropic.claude-3-haiku-20240307-v1:0',
    apiKey: '',
    awsRegion: 'ap-northeast-2',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    inferenceProfileArn: '',
    autoCreateInferenceProfile: false,
    temperature: 0.6,
    maxTokens: 2500,
  });
  const [envConfigLoaded, setEnvConfigLoaded] = useState(false);

  // 선택된 모델이 Inference Profile이 필요한지 확인
  const needsInferenceProfile = INFERENCE_PROFILE_REQUIRED_MODELS.includes(llmConfig.model);

  // 카드 색상 (8색 로테이션)
  const cardColors = [
    { bg: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', light: '#E7F3FF' },
    { bg: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', light: '#E8F5E9' },
    { bg: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', light: '#FEF3C7' },
    { bg: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', light: '#EDE9FE' },
    { bg: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', light: '#FCE7F3' },
    { bg: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)', light: '#CCFBF1' },
    { bg: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', light: '#FEE2E2' },
    { bg: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', light: '#E0E7FF' },
  ];

  // .env.local에서 LLM 설정 불러오기
  const loadEnvConfig = async () => {
    try {
      const response = await fetch('/api/llm-config');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          const config = data.config;
          setLLMConfig(prev => ({
            ...prev,
            awsAccessKeyId: config.bedrock.awsAccessKeyId || prev.awsAccessKeyId,
            awsSecretAccessKey: config.bedrock.awsSecretAccessKey || prev.awsSecretAccessKey,
            awsRegion: config.bedrock.awsRegion || prev.awsRegion,
            apiKey: prev.provider === 'openai' ? (config.openai.apiKey || prev.apiKey) :
                    prev.provider === 'gemini' ? (config.gemini.apiKey || prev.apiKey) :
                    prev.provider === 'claude' ? (config.claude.apiKey || prev.apiKey) : prev.apiKey,
          }));
          setEnvConfigLoaded(true);
        }
      }
    } catch (error) {
      console.error('Failed to load LLM config:', error);
    }
  };

  const handleProviderChange = async (provider: 'openai' | 'gemini' | 'claude' | 'bedrock') => {
    const newConfig: LLMConfig = {
      ...llmConfig,
      provider,
      model: LLM_PROVIDERS[provider].models[0].id,
    };
    
    try {
      const response = await fetch('/api/llm-config');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          const config = data.config;
          if (provider === 'openai' && config.openai.apiKey) {
            newConfig.apiKey = config.openai.apiKey;
          } else if (provider === 'gemini' && config.gemini.apiKey) {
            newConfig.apiKey = config.gemini.apiKey;
          } else if (provider === 'claude' && config.claude.apiKey) {
            newConfig.apiKey = config.claude.apiKey;
          } else if (provider === 'bedrock') {
            newConfig.awsAccessKeyId = config.bedrock.awsAccessKeyId || '';
            newConfig.awsSecretAccessKey = config.bedrock.awsSecretAccessKey || '';
            newConfig.awsRegion = config.bedrock.awsRegion || 'ap-northeast-2';
          }
        }
      }
    } catch (error) {
      console.error('Failed to load API key for provider:', error);
    }
    
    setLLMConfig(newConfig);
  };

  useEffect(() => {
    setIsHydrated(true);
    loadEnvConfig();
  }, []);

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
    if (filter === 'answered') {
      filtered = filtered.filter(q => q.answer);
    } else if (filter === 'unanswered') {
      filtered = filtered.filter(q => !q.answer);
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(q => q.assessmentType === typeFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(term) ||
        q.itemId.toLowerCase().includes(term) ||
        q.questionUserName.toLowerCase().includes(term) ||
        (q.answer && q.answer.toLowerCase().includes(term))
      );
    }
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer: answer.trim() }),
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: qa.question,
          itemId: qa.itemId,
          assessmentType: qa.assessmentType,
          llmConfig: {
            provider: llmConfig.provider,
            model: llmConfig.model,
            apiKey: llmConfig.apiKey,
            awsRegion: llmConfig.awsRegion,
            awsAccessKeyId: llmConfig.awsAccessKeyId,
            awsSecretAccessKey: llmConfig.awsSecretAccessKey,
            inferenceProfileArn: llmConfig.inferenceProfileArn,
            autoCreateInferenceProfile: llmConfig.autoCreateInferenceProfile,
            temperature: llmConfig.temperature,
            maxTokens: llmConfig.maxTokens,
          }
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (isEditing) {
          setEditAnswer(data.answer);
        } else {
          setAnswer(data.answer);
        }
        if (data.contextUsed) {
          const contextInfo = [];
          if (data.contextUsed.hasItemDetails) contextInfo.push('평가 항목 정보');
          if (data.contextUsed.hasAdvice) contextInfo.push('AI 조언');
          if (data.contextUsed.hasVirtualEvidence) contextInfo.push('가상증빙예제');
          const providerName = LLM_PROVIDERS[llmConfig.provider].name;
          const modelName = LLM_PROVIDERS[llmConfig.provider].models.find(m => m.id === llmConfig.model)?.name || llmConfig.model;
          if (contextInfo.length > 0) {
            alert(`✅ AI 답변이 생성되었습니다!\n\n사용된 LLM: ${providerName} - ${modelName}\n\n참고한 컨텍스트:\n• ${contextInfo.join('\n• ')}`);
          } else {
            alert(`✅ AI 답변이 생성되었습니다!\n\n사용된 LLM: ${providerName} - ${modelName}`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer: editAnswer.trim() }),
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const toggleEvidence = (qaId: number) => {
    setExpandedEvidence(prev => {
      const newSet = new Set(prev);
      if (newSet.has(qaId)) {
        newSet.delete(qaId);
      } else {
        newSet.add(qaId);
      }
      return newSet;
    });
  };

  if (!isHydrated || loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #E4E6EB', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#65676B' }}>로딩 중...</p>
        </div>
        <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }


  return (
    <AdminLayout>
      <PermissionGuard requiredRoute="/qa">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 헤더 카드 */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>💬 질의응답 관리</h1>
                  <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>사용자 질문에 답변하고 Q&A 데이터를 관리합니다</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowLLMConfigModal(true)}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'white',
                      background: LLM_PROVIDERS[llmConfig.provider].color, border: 'none', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    {LLM_PROVIDERS[llmConfig.provider].icon} {LLM_PROVIDERS[llmConfig.provider].name}
                  </button>
                  <button
                    onClick={fetchQuestions}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6366F1',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    🔄 새로고침
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 통계 카드 그리드 */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>💬 전체 질문</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#1877F2' }}>{stats.total}</div>
                </div>
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>✅ 답변 완료</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#42B883' }}>{stats.answered}</div>
                </div>
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>⏳ 미답변</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>{stats.unanswered}</div>
                </div>
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>📊 답변률</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#8B5CF6' }}>
                    {stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 필터 및 검색 */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🔍 필터 및 검색</h3>
            </div>
            <div style={{ padding: 24, background: 'white' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>상태</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box' }}
                  >
                    <option value="all">전체</option>
                    <option value="unanswered">미답변</option>
                    <option value="answered">답변완료</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>유형</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box' }}
                  >
                    <option value="all">전체</option>
                    <option value="prerequisite">사전요구사항</option>
                    <option value="technical">기술검증</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>정렬</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box' }}
                  >
                    <option value="date">날짜순</option>
                    <option value="status">상태순</option>
                    <option value="type">유형순</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>순서</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box' }}
                  >
                    <option value="desc">내림차순</option>
                    <option value="asc">오름차순</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>검색</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="질문, 항목ID..."
                    style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#65676B' }}>
                  총 {filteredQuestions.length}개의 질문이 표시됩니다
                </span>
                {(filter !== 'all' || typeFilter !== 'all' || searchTerm) && (
                  <button
                    onClick={() => { setFilter('all'); setTypeFilter('all'); setSearchTerm(''); }}
                    style={{
                      padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#1877F2',
                      background: '#E7F3FF', border: 'none', borderRadius: 8, cursor: 'pointer'
                    }}
                  >
                    🔄 필터 초기화
                  </button>
                )}
              </div>
            </div>
          </div>


          {/* Q&A 카드 그리드 */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📋 질문 목록</h3>
                <span style={{ fontSize: 14, opacity: 0.9 }}>{filteredQuestions.length}개의 질문</span>
              </div>
            </div>
            
            {questionsLoading ? (
              <div style={{ padding: 48, textAlign: 'center', background: 'white' }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-4"></div>
                <p style={{ color: '#65676B' }}>질문 목록 로딩 중...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', background: 'white' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
                <p style={{ color: '#65676B', fontSize: 16 }}>
                  {searchTerm ? '검색 결과가 없습니다' : 
                   filter === 'unanswered' ? '미답변 질문이 없습니다' : 
                   filter === 'answered' ? '답변완료된 질문이 없습니다' : 
                   '질문이 없습니다'}
                </p>
              </div>
            ) : (
              <div style={{ padding: 24, background: 'white' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {filteredQuestions.map((qa, index) => {
                    const colorScheme = cardColors[index % cardColors.length];
                    return (
                      <div key={qa.id} style={{
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        border: '1px solid #E4E6EB'
                      }}>
                        {/* 카드 헤더 */}
                        <div style={{ padding: '14px 16px', background: colorScheme.bg, color: 'white' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700 }}>❓ 질문 #{qa.id}</span>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.25)' }}>
                                {qa.itemId}
                              </span>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.25)' }}>
                                {qa.assessmentType === 'prerequisite' ? '사전요구사항' : '기술검증'}
                              </span>
                              <span style={{
                                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                background: qa.answer ? 'rgba(66, 184, 131, 0.9)' : 'rgba(245, 158, 11, 0.9)'
                              }}>
                                {qa.answer ? '✅ 답변완료' : '⏳ 미답변'}
                              </span>
                              {qa.evidenceFiles && qa.evidenceFiles.length > 0 && (
                                <span style={{
                                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                  background: 'rgba(139, 92, 246, 0.9)'
                                }}>
                                  📎 증빙 {qa.evidenceFiles.length}
                                </span>
                              )}
                              {qa.evaluation && (
                                <span style={{
                                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                  background: 'rgba(20, 184, 166, 0.9)'
                                }}>
                                  점수: {qa.evaluation.score}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.9 }}>
                              {qa.questionUserName} • {formatDate(qa.questionCreatedAt)}
                            </div>
                          </div>
                        </div>
                        {/* 카드 바디 */}
                        <div style={{ padding: 16, background: 'white' }}>
                          {/* 질문 내용 */}
                          <div style={{ padding: 16, background: '#E7F3FF', borderRadius: 10, marginBottom: 16 }}>
                            <div style={{ fontSize: 14, color: '#1C1E21', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{qa.question}</div>
                          </div>
                          
                          {/* 증빙 파일 섹션 */}
                          {qa.evidenceFiles && qa.evidenceFiles.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <button
                                onClick={() => toggleEvidence(qa.id)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                  padding: '12px 16px', background: '#EDE9FE', border: 'none',
                                  borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#5B21B6'
                                }}
                              >
                                <span>📎 증빙 자료 ({qa.evidenceFiles.length}개)</span>
                                {qa.evaluation && (
                                  <span style={{ 
                                    padding: '2px 8px', background: '#8B5CF6', color: 'white', 
                                    borderRadius: 12, fontSize: 11, marginLeft: 8 
                                  }}>
                                    AI 평가: {qa.evaluation.score}점
                                  </span>
                                )}
                                <span style={{ marginLeft: 'auto', fontSize: 16 }}>
                                  {expandedEvidence.has(qa.id) ? '▼' : '▶'}
                                </span>
                              </button>
                              
                              {expandedEvidence.has(qa.id) && (
                                <div style={{ padding: 16, background: '#F5F3FF', borderRadius: '0 0 10px 10px', marginTop: -4 }}>
                                  {/* AI 평가 결과 */}
                                  {qa.evaluation && (
                                    <div style={{ marginBottom: 16, padding: 12, background: '#CCFBF1', borderRadius: 8 }}>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0F766E', marginBottom: 4 }}>
                                        🤖 AI 평가 결과 (점수: {qa.evaluation.score}/100)
                                      </div>
                                      <div style={{ fontSize: 13, color: '#0D9488', lineHeight: 1.6 }}>
                                        {qa.evaluation.feedback}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* 파일 그리드 */}
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                                    {qa.evidenceFiles.map((file) => (
                                      <div 
                                        key={file.id}
                                        onClick={() => setViewingFile(file)}
                                        style={{
                                          padding: 10, background: 'white', borderRadius: 10, cursor: 'pointer',
                                          border: '2px solid #C4B5FD', textAlign: 'center',
                                          transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }}
                                      >
                                        {file.fileType === 'image' ? (
                                          <img 
                                            src={file.base64Data} 
                                            alt={file.fileName}
                                            style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }}
                                          />
                                        ) : (
                                          <div style={{ 
                                            height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: '#EDE9FE', borderRadius: 6
                                          }}>
                                            <span style={{ fontSize: 32 }}>📄</span>
                                          </div>
                                        )}
                                        <div style={{ 
                                          fontSize: 11, color: '#5B21B6', marginTop: 6, fontWeight: 500,
                                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                        }}>
                                          {file.fileName}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#7C3AED' }}>
                                          {formatFileSize(file.fileSize)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* 답변 영역 */}
                          {qa.answer ? (
                            editingQuestion?.id === qa.id ? (
                              <div style={{ marginTop: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                  <label style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21' }}>✏️ 답변 수정</label>
                                  <button
                                    onClick={() => handleGenerateAnswer(qa, true)}
                                    disabled={generatingAnswer}
                                    style={{
                                      padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#8B5CF6',
                                      background: '#EDE9FE', border: 'none', borderRadius: 6, cursor: generatingAnswer ? 'not-allowed' : 'pointer',
                                      opacity: generatingAnswer ? 0.7 : 1
                                    }}
                                  >
                                    {generatingAnswer ? '🤖 AI 생성 중...' : '🤖 AI로 다시 생성'}
                                  </button>
                                </div>
                                <textarea
                                  value={editAnswer}
                                  onChange={(e) => setEditAnswer(e.target.value)}
                                  style={{
                                    width: '100%', minHeight: 120, padding: 12, fontSize: 14,
                                    border: '2px solid #E4E6EB', borderRadius: 10, resize: 'vertical',
                                    boxSizing: 'border-box', lineHeight: 1.6
                                  }}
                                />
                                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={cancelEdit}
                                    style={{
                                      padding: '10px 20px', fontSize: 13, fontWeight: 600, color: '#65676B',
                                      background: '#E4E6EB', border: 'none', borderRadius: 8, cursor: 'pointer'
                                    }}
                                  >
                                    취소
                                  </button>
                                  <button
                                    onClick={() => handleAnswerUpdate(qa.id)}
                                    disabled={updating || !editAnswer.trim()}
                                    style={{
                                      padding: '10px 20px', fontSize: 13, fontWeight: 600, color: 'white',
                                      background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)',
                                      border: 'none', borderRadius: 8, cursor: updating ? 'not-allowed' : 'pointer',
                                      opacity: updating || !editAnswer.trim() ? 0.7 : 1
                                    }}
                                  >
                                    {updating ? '수정 중...' : '💾 답변 수정'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ marginTop: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: '#42B883' }}>✅ 답변</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <button
                                      onClick={() => startEditAnswer(qa)}
                                      style={{
                                        padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#1877F2',
                                        background: '#E7F3FF', border: 'none', borderRadius: 6, cursor: 'pointer'
                                      }}
                                    >
                                      ✏️ 수정
                                    </button>
                                    <span style={{ fontSize: 12, color: '#65676B' }}>
                                      {qa.answerUserName} • {qa.answerCreatedAt && formatDate(qa.answerCreatedAt)}
                                    </span>
                                  </div>
                                </div>
                                <div style={{ padding: 16, background: '#E8F5E9', borderRadius: 10 }}>
                                  <div style={{ fontSize: 14, color: '#1C1E21', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{qa.answer}</div>
                                </div>
                              </div>
                            )
                          ) : (
                            selectedQuestion?.id === qa.id ? (
                              <div style={{ marginTop: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                  <label style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21' }}>✍️ 답변 작성</label>
                                  <button
                                    onClick={() => handleGenerateAnswer(qa)}
                                    disabled={generatingAnswer}
                                    style={{
                                      padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#8B5CF6',
                                      background: '#EDE9FE', border: 'none', borderRadius: 6, cursor: generatingAnswer ? 'not-allowed' : 'pointer',
                                      opacity: generatingAnswer ? 0.7 : 1
                                    }}
                                  >
                                    {generatingAnswer ? '🤖 AI 생성 중...' : '🤖 AI로 답변 생성'}
                                  </button>
                                </div>
                                <textarea
                                  value={answer}
                                  onChange={(e) => setAnswer(e.target.value)}
                                  placeholder="답변을 입력하세요..."
                                  style={{
                                    width: '100%', minHeight: 120, padding: 12, fontSize: 14,
                                    border: '2px solid #E4E6EB', borderRadius: 10, resize: 'vertical',
                                    boxSizing: 'border-box', lineHeight: 1.6
                                  }}
                                />
                                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => { setSelectedQuestion(null); setAnswer(''); }}
                                    style={{
                                      padding: '10px 20px', fontSize: 13, fontWeight: 600, color: '#65676B',
                                      background: '#E4E6EB', border: 'none', borderRadius: 8, cursor: 'pointer'
                                    }}
                                  >
                                    취소
                                  </button>
                                  <button
                                    onClick={() => handleAnswerSubmit(qa.id)}
                                    disabled={submitting || !answer.trim()}
                                    style={{
                                      padding: '10px 20px', fontSize: 13, fontWeight: 600, color: 'white',
                                      background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
                                      border: 'none', borderRadius: 8, cursor: submitting ? 'not-allowed' : 'pointer',
                                      opacity: submitting || !answer.trim() ? 0.7 : 1
                                    }}
                                  >
                                    {submitting ? '등록 중...' : '💾 답변 등록'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setSelectedQuestion(qa)}
                                style={{
                                  marginTop: 16, padding: '12px 24px', fontSize: 14, fontWeight: 600, color: 'white',
                                  background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                                  border: 'none', borderRadius: 10, cursor: 'pointer', width: '100%'
                                }}
                              >
                                ✍️ 답변 작성하기
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </PermissionGuard>

      {/* 파일 미리보기 모달 */}
      {viewingFile && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 100, padding: 20 
          }}
          onClick={() => setViewingFile(null)}
        >
          <div 
            style={{ 
              maxWidth: '90vw', maxHeight: '90vh', background: 'white', 
              borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{ 
              padding: '16px 20px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', 
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{viewingFile.fileName}</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                  {viewingFile.fileType === 'image' ? '🖼️ 이미지' : '📄 PDF'} • {formatFileSize(viewingFile.fileSize)}
                  {viewingFile.uploadedAt && ` • ${new Date(viewingFile.uploadedAt).toLocaleDateString('ko-KR')}`}
                </div>
              </div>
              <button 
                onClick={() => setViewingFile(null)}
                style={{ 
                  width: 36, height: 36, background: 'rgba(255,255,255,0.2)', 
                  border: 'none', borderRadius: '50%', color: 'white', 
                  fontSize: 20, cursor: 'pointer', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center' 
                }}
              >×</button>
            </div>
            
            {/* 콘텐츠 */}
            <div style={{ padding: 20, maxHeight: 'calc(90vh - 120px)', overflow: 'auto' }}>
              {viewingFile.fileType === 'image' ? (
                <img 
                  src={viewingFile.base64Data} 
                  alt={viewingFile.fileName}
                  style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto', borderRadius: 8 }}
                />
              ) : (
                <div>
                  {viewingFile.base64Data.startsWith('data:application/pdf') ? (
                    <iframe
                      src={viewingFile.base64Data}
                      style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }}
                      title={viewingFile.fileName}
                    />
                  ) : (
                    <div style={{ 
                      padding: 24, background: '#F9FAFB', borderRadius: 8, 
                      textAlign: 'center', color: '#65676B' 
                    }}>
                      <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📄</span>
                      <div style={{ fontSize: 14 }}>PDF 미리보기를 지원하지 않습니다.</div>
                      {viewingFile.extractedText && (
                        <div style={{ marginTop: 16, textAlign: 'left' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>추출된 텍스트:</div>
                          <div style={{ 
                            fontSize: 13, color: '#1C1E21', background: 'white', 
                            padding: 12, borderRadius: 6, border: '1px solid #E4E6EB',
                            maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap'
                          }}>
                            {viewingFile.extractedText}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* 푸터 */}
            <div style={{ padding: '12px 20px', background: '#F0F2F5', borderTop: '1px solid #E4E6EB', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={() => {
                  try {
                    // base64 데이터에서 실제 데이터 부분 추출
                    const base64Data = viewingFile.base64Data;
                    const [header, data] = base64Data.split(',');
                    const mimeMatch = header.match(/data:([^;]+)/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
                    
                    // base64를 바이너리로 변환
                    const byteCharacters = atob(data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: mimeType });
                    
                    // 다운로드 링크 생성
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = viewingFile.fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Download error:', error);
                    alert('다운로드 중 오류가 발생했습니다.');
                  }
                }}
                style={{ 
                  padding: '10px 20px', fontSize: 14, fontWeight: 600, 
                  color: '#8B5CF6', background: 'white', 
                  border: '1px solid #8B5CF6', borderRadius: 8, cursor: 'pointer' 
                }}
              >
                📥 다운로드
              </button>
              <button 
                onClick={() => setViewingFile(null)}
                style={{ 
                  padding: '10px 20px', fontSize: 14, fontWeight: 600, 
                  color: 'white', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', 
                  border: 'none', borderRadius: 8, cursor: 'pointer' 
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LLM 설정 모달 */}
      {showLLMConfigModal && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 100, padding: 20 
          }}
          onClick={() => setShowLLMConfigModal(false)}
        >
          <div 
            style={{ 
              width: '100%', maxWidth: 600, maxHeight: '90vh', background: 'white', 
              borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{ 
              padding: '16px 20px', background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', 
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
            }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>🤖 AI 답변 생성 설정</div>
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>LLM 제공자와 모델을 선택하세요</div>
              </div>
              <button 
                onClick={() => setShowLLMConfigModal(false)}
                style={{ 
                  width: 36, height: 36, background: 'rgba(255,255,255,0.2)', 
                  border: 'none', borderRadius: '50%', color: 'white', 
                  fontSize: 20, cursor: 'pointer', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center' 
                }}
              >×</button>
            </div>
            
            {/* 콘텐츠 */}
            <div style={{ padding: 20, maxHeight: 'calc(90vh - 140px)', overflow: 'auto' }}>
              {/* Provider 선택 */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                  LLM 제공자
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {(Object.keys(LLM_PROVIDERS) as Array<keyof typeof LLM_PROVIDERS>).map((key) => {
                    const provider = LLM_PROVIDERS[key];
                    return (
                      <button
                        key={key}
                        onClick={() => handleProviderChange(key)}
                        style={{
                          padding: '12px 8px', fontSize: 12, fontWeight: 600,
                          color: llmConfig.provider === key ? 'white' : provider.color,
                          background: llmConfig.provider === key ? provider.color : 'white',
                          border: `2px solid ${provider.color}`, borderRadius: 8, cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{provider.icon}</span>
                        <span>{provider.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 모델 선택 */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                  모델
                </label>
                <select
                  value={llmConfig.model}
                  onChange={(e) => setLLMConfig({ ...llmConfig, model: e.target.value })}
                  style={{ 
                    width: '100%', padding: '10px 14px', fontSize: 14, 
                    border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box' 
                  }}
                >
                  {LLM_PROVIDERS[llmConfig.provider].models.map((model) => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>

              {/* Bedrock 전용 설정 */}
              {llmConfig.provider === 'bedrock' && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                      AWS Region
                    </label>
                    <input
                      type="text"
                      value={llmConfig.awsRegion || ''}
                      onChange={(e) => setLLMConfig({ ...llmConfig, awsRegion: e.target.value })}
                      placeholder="ap-northeast-2"
                      style={{ 
                        width: '100%', padding: '10px 14px', fontSize: 14, 
                        border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box' 
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                      AWS Access Key ID {envConfigLoaded && <span style={{ color: '#42B883', fontSize: 12 }}>(.env.local에서 로드됨)</span>}
                    </label>
                    <input
                      type="text"
                      value={llmConfig.awsAccessKeyId || ''}
                      onChange={(e) => setLLMConfig({ ...llmConfig, awsAccessKeyId: e.target.value })}
                      placeholder="AKIA..."
                      style={{ 
                        width: '100%', padding: '10px 14px', fontSize: 14, 
                        border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box' 
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                      AWS Secret Access Key {envConfigLoaded && <span style={{ color: '#42B883', fontSize: 12 }}>(.env.local에서 로드됨)</span>}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showAwsSecretKey ? 'text' : 'password'}
                        value={llmConfig.awsSecretAccessKey || ''}
                        onChange={(e) => setLLMConfig({ ...llmConfig, awsSecretAccessKey: e.target.value })}
                        placeholder="시크릿 키 입력"
                        style={{ 
                          width: '100%', padding: '10px 14px', fontSize: 14, 
                          border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box',
                          paddingRight: 50
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAwsSecretKey(!showAwsSecretKey)}
                        style={{
                          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', fontSize: 16
                        }}
                      >
                        {showAwsSecretKey ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {/* Inference Profile 설정 (Claude 4.5 모델용) */}
                  {needsInferenceProfile && (
                    <div style={{ 
                      marginBottom: 20, padding: 16, background: '#FEF3C7', 
                      borderRadius: 10, border: '2px solid #F59E0B' 
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#92400E', marginBottom: 12 }}>
                        🔐 Claude 4.5 모델은 Inference Profile이 필요합니다
                      </div>
                      
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={llmConfig.autoCreateInferenceProfile || false}
                            onChange={(e) => setLLMConfig({ 
                              ...llmConfig, 
                              autoCreateInferenceProfile: e.target.checked,
                              inferenceProfileArn: e.target.checked ? '' : llmConfig.inferenceProfileArn
                            })}
                            style={{ width: 18, height: 18 }}
                          />
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21' }}>
                            🔍 시스템 정의 Inference Profile 자동 찾기 (권장)
                          </span>
                        </label>
                        <div style={{ fontSize: 12, color: '#65676B', marginTop: 4, marginLeft: 26 }}>
                          AWS에서 제공하는 시스템 정의 Inference Profile을 자동으로 찾아 사용합니다
                        </div>
                      </div>

                      {!llmConfig.autoCreateInferenceProfile && (
                        <div>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                            Inference Profile ARN (수동 입력)
                          </label>
                          <input
                            type="text"
                            value={llmConfig.inferenceProfileArn || ''}
                            onChange={(e) => setLLMConfig({ ...llmConfig, inferenceProfileArn: e.target.value })}
                            placeholder="arn:aws:bedrock:region:account:inference-profile/..."
                            style={{ 
                              width: '100%', padding: '10px 14px', fontSize: 13, 
                              border: '2px solid #E4E6EB', borderRadius: 8, boxSizing: 'border-box' 
                            }}
                          />
                          <div style={{ fontSize: 11, color: '#65676B', marginTop: 6 }}>
                            ✅ 올바른 형식: <code style={{ background: '#E5E7EB', padding: '2px 4px', borderRadius: 4 }}>arn:aws:bedrock:region::foundation-model/...</code> 또는 시스템 정의 프로필 ID
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* OpenAI/Claude/Gemini API Key */}
              {llmConfig.provider !== 'bedrock' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                    API Key {envConfigLoaded && <span style={{ color: '#42B883', fontSize: 12 }}>(.env.local에서 로드됨)</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={llmConfig.apiKey || ''}
                      onChange={(e) => setLLMConfig({ ...llmConfig, apiKey: e.target.value })}
                      placeholder="API 키 입력"
                      style={{ 
                        width: '100%', padding: '10px 14px', fontSize: 14, 
                        border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box',
                        paddingRight: 50
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 16
                      }}
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              )}

              {/* Temperature & Max Tokens */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                    Temperature: {llmConfig.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={llmConfig.temperature || 0.6}
                    onChange={(e) => setLLMConfig({ ...llmConfig, temperature: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={llmConfig.maxTokens || 2500}
                    onChange={(e) => setLLMConfig({ ...llmConfig, maxTokens: parseInt(e.target.value) })}
                    min="100"
                    max="8192"
                    style={{ 
                      width: '100%', padding: '10px 14px', fontSize: 14, 
                      border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box' 
                    }}
                  />
                </div>
              </div>

              {/* 현재 설정 요약 */}
              <div style={{ 
                padding: 16, background: '#F0F2F5', borderRadius: 10, 
                border: '1px solid #E4E6EB' 
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                  📋 현재 설정
                </div>
                <div style={{ fontSize: 12, color: '#65676B', lineHeight: 1.8 }}>
                  <div>• 제공자: {LLM_PROVIDERS[llmConfig.provider].icon} {LLM_PROVIDERS[llmConfig.provider].name}</div>
                  <div>• 모델: {LLM_PROVIDERS[llmConfig.provider].models.find(m => m.id === llmConfig.model)?.name || llmConfig.model}</div>
                  {llmConfig.provider === 'bedrock' && <div>• 리전: {llmConfig.awsRegion}</div>}
                  {needsInferenceProfile && (
                    <div>• Inference Profile: {llmConfig.autoCreateInferenceProfile ? '자동 찾기' : (llmConfig.inferenceProfileArn || '미설정')}</div>
                  )}
                  <div>• Temperature: {llmConfig.temperature}</div>
                  <div>• Max Tokens: {llmConfig.maxTokens}</div>
                </div>
              </div>
            </div>
            
            {/* 푸터 */}
            <div style={{ 
              padding: '12px 20px', background: '#F0F2F5', borderTop: '1px solid #E4E6EB', 
              display: 'flex', justifyContent: 'flex-end', gap: 12 
            }}>
              <button 
                onClick={() => setShowLLMConfigModal(false)}
                style={{ 
                  padding: '10px 20px', fontSize: 14, fontWeight: 600, 
                  color: '#65676B', background: 'white', 
                  border: '1px solid #E4E6EB', borderRadius: 8, cursor: 'pointer' 
                }}
              >
                취소
              </button>
              <button 
                onClick={() => setShowLLMConfigModal(false)}
                style={{ 
                  padding: '10px 20px', fontSize: 14, fontWeight: 600, 
                  color: 'white', background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', 
                  border: 'none', borderRadius: 8, cursor: 'pointer' 
                }}
              >
                ✅ 설정 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
