'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import PermissionGuard from '@/components/PermissionGuard';
import { createMarkdownHtml } from '@/lib/markdown-parser';

interface CacheVersion {
  version: string;
  createdAt: string;
  totalItems: number;
  description: string;
}

interface CacheStats {
  total: number;
  korean: number;
  english: number;
  unique_items: number;
}

interface CachedVirtualEvidenceItem {
  id: string;
  itemId: string;
  category: string;
  title: string;
  virtualEvidence: string;
  language: 'ko' | 'en';
  createdAt: string;
  version: string;
}

// LLM 설정 인터페이스
interface LLMConfig {
  provider: 'openai' | 'gemini' | 'claude' | 'bedrock';
  model: string;
  apiKey?: string;
  // Bedrock 전용
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  inferenceProfileArn?: string; // Claude 4.5+ 모델용 inference profile ARN
  autoCreateInferenceProfile?: boolean; // 시스템 정의 Inference Profile 자동 찾기
  // LLM 파라미터
  temperature?: number;
  maxTokens?: number;
}

// 생성 옵션 인터페이스
interface GenerationOptions {
  includeKorean: boolean;
  includeEnglish: boolean;
}

// Inference Profile이 필요한 모델 목록
const INFERENCE_PROFILE_REQUIRED_MODELS = [
  'anthropic.claude-opus-4-5-20251101-v1:0',
  'anthropic.claude-sonnet-4-5-20250929-v1:0',
  'anthropic.claude-haiku-4-5-20251001-v1:0',
];

const LLM_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (추천)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
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
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ],
    color: '#D97706',
  },
  gemini: {
    name: 'Google Gemini',
    icon: '✨',
    models: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (추천)' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { id: 'gemini-pro', name: 'Gemini Pro' },
    ],
    color: '#4285F4',
  },
  bedrock: {
    name: 'AWS Bedrock',
    icon: '☁️',
    models: [
      // Claude 4.5 모델 (Inference Profile 필요)
      { id: 'anthropic.claude-opus-4-5-20251101-v1:0', name: '🔐 Claude 4.5 Opus (Inference Profile 필요)' },
      { id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', name: '🔐 Claude 4.5 Sonnet (Inference Profile 필요)' },
      { id: 'anthropic.claude-haiku-4-5-20251001-v1:0', name: '🔐 Claude 4.5 Haiku (Inference Profile 필요)' },
      // Claude 3.5 모델 (On-Demand 지원)
      { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet v2 (추천)' },
      { id: 'anthropic.claude-3-5-sonnet-20240620-v1:0', name: 'Claude 3.5 Sonnet v1' },
      { id: 'anthropic.claude-3-5-haiku-20241022-v1:0', name: 'Claude 3.5 Haiku (빠름)' },
      // Claude 3 모델
      { id: 'anthropic.claude-3-opus-20240229-v1:0', name: 'Claude 3 Opus (고성능)' },
      { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet' },
      { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku (경제적)' },
      // Amazon Titan 모델
      { id: 'amazon.titan-text-premier-v1:0', name: 'Amazon Titan Text Premier' },
      { id: 'amazon.titan-text-express-v1', name: 'Amazon Titan Text Express' },
      { id: 'amazon.titan-text-lite-v1', name: 'Amazon Titan Text Lite (경제적)' },
      // Meta Llama 모델
      { id: 'meta.llama3-2-90b-instruct-v1:0', name: 'Llama 3.2 90B Instruct' },
      { id: 'meta.llama3-2-11b-instruct-v1:0', name: 'Llama 3.2 11B Instruct' },
      { id: 'meta.llama3-1-70b-instruct-v1:0', name: 'Llama 3.1 70B Instruct' },
      { id: 'meta.llama3-1-8b-instruct-v1:0', name: 'Llama 3.1 8B Instruct (경제적)' },
      // Mistral 모델
      { id: 'mistral.mistral-large-2407-v1:0', name: 'Mistral Large (2407)' },
      { id: 'mistral.mixtral-8x7b-instruct-v0:1', name: 'Mixtral 8x7B Instruct' },
      { id: 'mistral.mistral-7b-instruct-v0:2', name: 'Mistral 7B Instruct (경제적)' },
      // Cohere 모델
      { id: 'cohere.command-r-plus-v1:0', name: 'Cohere Command R+' },
      { id: 'cohere.command-r-v1:0', name: 'Cohere Command R' },
      // AI21 모델
      { id: 'ai21.jamba-1-5-large-v1:0', name: 'AI21 Jamba 1.5 Large' },
      { id: 'ai21.jamba-1-5-mini-v1:0', name: 'AI21 Jamba 1.5 Mini (경제적)' },
    ],
    color: '#FF9900',
  },
};

export default function VirtualEvidencePage() {
  const [versions, setVersions] = useState<CacheVersion[]>([]);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [viewingVersion, setViewingVersion] = useState<string>(''); // 캐시 뷰어에서 보고 있는 버전
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [isMounted, setIsMounted] = useState(false);
  const [showCacheViewer, setShowCacheViewer] = useState(false);
  const [cacheItems, setCacheItems] = useState<CachedVirtualEvidenceItem[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<'ko' | 'en'>('ko');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<CachedVirtualEvidenceItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeVersions, setActiveVersions] = useState<{advice: string | null, virtualEvidence: string | null}>({
    advice: null,
    virtualEvidence: null
  });
  const [isSettingActiveVersion, setIsSettingActiveVersion] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSelectedVersion, setExportSelectedVersion] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailVersion, setDetailVersion] = useState<CacheVersion | null>(null);
  const [detailStats, setDetailStats] = useState<CacheStats | null>(null);
  
  // LLM 설정 관련 state
  const [showLLMConfigModal, setShowLLMConfigModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAwsSecretKey, setShowAwsSecretKey] = useState(false);
  const [llmConfig, setLLMConfig] = useState<LLMConfig>({
    provider: 'bedrock',
    model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    apiKey: '',
    awsRegion: 'ap-northeast-2',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    inferenceProfileArn: '',
    temperature: 0.8,
    maxTokens: 8192,
  });
  const [generationOptions, setGenerationOptions] = useState<GenerationOptions>({
    includeKorean: true,
    includeEnglish: true,
  });
  const [envConfigLoaded, setEnvConfigLoaded] = useState(false);

  // 요약 생성 관련 state
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSummaryLLMModal, setShowSummaryLLMModal] = useState(false);
  const [showSummaryListModal, setShowSummaryListModal] = useState(false);
  const [summaryList, setSummaryList] = useState<Array<{filename: string; type: string; version: string; createdAt: string; size: number}>>([]);
  const [isLoadingSummaryList, setIsLoadingSummaryList] = useState(false);
  const [summaryContent, setSummaryContent] = useState<string>('');
  const [summaryInfo, setSummaryInfo] = useState<{version: string; itemCount: number; provider: string; model: string} | null>(null);

  // 선택된 모델이 Inference Profile이 필요한지 확인
  const needsInferenceProfile = INFERENCE_PROFILE_REQUIRED_MODELS.includes(llmConfig.model);

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
            // Bedrock 설정
            awsAccessKeyId: config.bedrock.awsAccessKeyId || prev.awsAccessKeyId,
            awsSecretAccessKey: config.bedrock.awsSecretAccessKey || prev.awsSecretAccessKey,
            awsRegion: config.bedrock.awsRegion || prev.awsRegion,
            // OpenAI 설정
            apiKey: prev.provider === 'openai' ? (config.openai.apiKey || prev.apiKey) :
                    prev.provider === 'gemini' ? (config.gemini.apiKey || prev.apiKey) :
                    prev.provider === 'claude' ? (config.claude.apiKey || prev.apiKey) : prev.apiKey,
          }));
          setEnvConfigLoaded(true);
          console.log('✅ LLM config loaded from .env.local');
        }
      }
    } catch (error) {
      console.error('Failed to load LLM config:', error);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadCacheData();
    loadEnvConfig();
  }, []);

  const loadCacheData = async () => {
    try {
      setIsLoading(true);
      const versionsResponse = await fetch('/api/virtual-evidence-cache?action=versions');
      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        setVersions(versionsData.versions || []);
        // 버전이 있고 현재 선택된 버전이 없거나 삭제된 경우 첫 번째 버전 선택
        if (versionsData.versions && versionsData.versions.length > 0) {
          const versionExists = versionsData.versions.some((v: CacheVersion) => v.version === selectedVersion);
          if (!selectedVersion || !versionExists) {
            setSelectedVersion(versionsData.versions[0].version);
          }
        } else {
          setSelectedVersion('');
        }
      }
      const statsResponse = await fetch('/api/virtual-evidence-cache?action=stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
      const activeVersionsResponse = await fetch('/api/cache-version');
      if (activeVersionsResponse.ok) {
        const activeVersionsData = await activeVersionsResponse.json();
        setActiveVersions(activeVersionsData.activeVersions);
      }
    } catch (error) {
      console.error('Failed to load cache data:', error);
      showMessage('캐시 데이터 로드에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCache = async () => {
    if (!generationOptions.includeKorean && !generationOptions.includeEnglish) {
      showMessage('최소 하나의 언어를 선택해주세요.', 'error');
      return;
    }
    
    try {
      setIsGenerating(true);
      setShowLLMConfigModal(false);
      const languages = [];
      if (generationOptions.includeKorean) languages.push('한국어');
      if (generationOptions.includeEnglish) languages.push('영어');
      showMessage(`${LLM_PROVIDERS[llmConfig.provider].name} (${llmConfig.model})로 ${languages.join(', ')} 가상증빙예제 캐시 생성을 시작합니다...`, 'info');
      
      const response = await fetch('/api/virtual-evidence-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'generate', 
          options: { 
            includeAdvice: false, 
            forceRegenerate: true,
            includeKorean: generationOptions.includeKorean,
            includeEnglish: generationOptions.includeEnglish,
          },
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
        const result = await response.json();
        showMessage(`캐시 생성 완료! 버전: ${result.version}, 총 ${result.totalItems}개 항목 처리`, 'success');
        // 새로 생성된 버전을 선택하도록 selectedVersion 초기화
        setSelectedVersion('');
        await loadCacheData();
        // 새로 생성된 버전을 선택
        setSelectedVersion(result.version);
      } else {
        const error = await response.json();
        showMessage(`캐시 생성 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to generate cache:', error);
      showMessage('캐시 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // 요약 생성 함수
  const generateSummary = async () => {
    if (!activeVersions.virtualEvidence) {
      showMessage('활성화된 가상증빙 캐시 버전이 없습니다. 먼저 버전을 활성화해주세요.', 'error');
      return;
    }
    
    try {
      setIsGeneratingSummary(true);
      setShowSummaryLLMModal(false);
      showMessage(`${LLM_PROVIDERS[llmConfig.provider].name} (${llmConfig.model})로 가상증빙 요약을 생성 중입니다...`, 'info');
      
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'virtual_evidence',
          llmConfig: {
            provider: llmConfig.provider,
            model: llmConfig.model,
            apiKey: llmConfig.apiKey,
            awsRegion: llmConfig.awsRegion,
            awsAccessKeyId: llmConfig.awsAccessKeyId,
            awsSecretAccessKey: llmConfig.awsSecretAccessKey,
            inferenceProfileArn: llmConfig.inferenceProfileArn,
            autoCreateInferenceProfile: llmConfig.autoCreateInferenceProfile,
            temperature: 0.5,
            maxTokens: 2000,
          }
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setSummaryContent(result.summary);
        setSummaryInfo({
          version: result.version,
          itemCount: result.itemCount,
          provider: result.provider,
          model: result.model
        });
        setShowSummaryModal(true);
        showMessage('요약 생성 완료!', 'success');
      } else {
        const error = await response.json();
        showMessage(`요약 생성 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
      showMessage('요약 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // 요약 LLM 선택 모달 열기
  const openSummaryLLMModal = () => {
    if (!activeVersions.virtualEvidence) {
      showMessage('활성화된 가상증빙 캐시 버전이 없습니다. 먼저 버전을 활성화해주세요.', 'error');
      return;
    }
    setShowSummaryLLMModal(true);
  };

  // 요약 목록 불러오기
  const loadSummaryList = async () => {
    try {
      setIsLoadingSummaryList(true);
      const response = await fetch('/api/generate-summary?type=virtual_evidence');
      if (response.ok) {
        const data = await response.json();
        setSummaryList(data.summaries || []);
        setShowSummaryListModal(true);
      } else {
        showMessage('요약 목록을 불러오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Failed to load summary list:', error);
      showMessage('요약 목록 로드 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoadingSummaryList(false);
    }
  };

  // 특정 요약 내용 불러오기
  const loadSummaryContent = async (filename: string) => {
    try {
      const response = await fetch(`/api/generate-summary?filename=${encodeURIComponent(filename)}`);
      if (response.ok) {
        const data = await response.json();
        setSummaryContent(data.content);
        setSummaryInfo({
          version: filename.split('_summary_')[1]?.split('_')[0] || 'unknown',
          itemCount: 0,
          provider: '저장된 요약',
          model: ''
        });
        setShowSummaryListModal(false);
        setShowSummaryModal(true);
      } else {
        showMessage('요약 내용을 불러오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Failed to load summary content:', error);
      showMessage('요약 내용 로드 중 오류가 발생했습니다.', 'error');
    }
  };

  const openLLMConfigModal = () => {
    setShowLLMConfigModal(true);
  };

  const handleProviderChange = async (provider: 'openai' | 'gemini' | 'claude' | 'bedrock') => {
    // 먼저 provider와 model 변경
    const newConfig: LLMConfig = {
      ...llmConfig,
      provider,
      model: LLM_PROVIDERS[provider].models[0].id,
    };
    
    // .env.local에서 해당 provider의 API 키 불러오기
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

  const setActiveVersion = async (cacheType: 'advice' | 'virtual_evidence', version: string) => {
    try {
      setIsSettingActiveVersion(true);
      showMessage(`${cacheType === 'advice' ? '조언' : '가상증빙예제'} 캐시의 활성 버전을 설정 중...`, 'info');
      const response = await fetch('/api/cache-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cacheType, version }),
      });
      if (response.ok) {
        showMessage(`${cacheType === 'advice' ? '조언' : '가상증빙예제'} 캐시의 활성 버전이 ${version}으로 설정되었습니다.`, 'success');
        await loadCacheData();
      } else {
        const error = await response.json();
        showMessage(`활성 버전 설정 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to set active version:', error);
      showMessage('활성 버전 설정 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSettingActiveVersion(false);
    }
  };

  const showMessageFunc = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };
  const showMessage = showMessageFunc;

  // 내보내기 모달 열기
  const openExportModal = () => {
    // 기본값: 활성 버전 또는 첫 번째 버전
    setExportSelectedVersion(activeVersions.virtualEvidence || (versions.length > 0 ? versions[0].version : ''));
    setShowExportModal(true);
  };

  // Export 캐시 기능 - 선택된 버전으로 내보내기
  const handleExportCache = async (versionToExport?: string) => {
    const exportVersion = versionToExport || exportSelectedVersion;
    
    if (!exportVersion) {
      showMessage('내보낼 버전을 선택해주세요.', 'error');
      return;
    }
    
    try {
      setIsExporting(true);
      setShowExportModal(false);
      const isActive = exportVersion === activeVersions.virtualEvidence;
      const versionLabel = isActive ? `${exportVersion} (활성)` : exportVersion;
      showMessage(`캐시 데이터를 내보내는 중... (버전: ${versionLabel})`, 'info');
      
      const response = await fetch(`/api/virtual-evidence-cache?action=export&version=${exportVersion}`);
      if (response.ok) {
        const data = await response.json();
        
        // JSON 파일로 다운로드
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `virtual_evidence_cache_${exportVersion}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage(`캐시 버전 ${versionLabel}을 성공적으로 내보냈습니다.`, 'success');
      } else {
        const error = await response.json();
        showMessage(`내보내기 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to export cache:', error);
      showMessage('캐시 내보내기 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Import 캐시 기능
  const handleImportCache = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setIsImporting(true);
      showMessage('캐시 데이터를 가져오는 중...', 'info');
      
      const fileContent = await file.text();
      const cacheData = JSON.parse(fileContent);
      
      // 데이터 유효성 검사
      if (!cacheData.version || !cacheData.koEvidence || !cacheData.enEvidence) {
        showMessage('유효하지 않은 캐시 파일 형식입니다.', 'error');
        return;
      }
      
      const response = await fetch('/api/virtual-evidence-cache', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', cacheData }),
      });
      
      if (response.ok) {
        const result = await response.json();
        showMessage(`캐시 가져오기 완료! 버전: ${result.version}, ${result.totalItems}개 항목`, 'success');
        setShowImportModal(false);
        await loadCacheData();
      } else {
        const error = await response.json();
        showMessage(`가져오기 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to import cache:', error);
      showMessage('캐시 가져오기 중 오류가 발생했습니다. 파일 형식을 확인해주세요.', 'error');
    } finally {
      setIsImporting(false);
      // 파일 입력 초기화
      event.target.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };

  // 버전 삭제 기능
  const handleDeleteVersion = async (version: string) => {
    if (!confirm(`버전 "${version}"을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }
    
    try {
      setIsDeleting(true);
      showMessage(`버전 ${version} 삭제 중...`, 'info');
      
      const response = await fetch(`/api/virtual-evidence-cache?version=${version}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        showMessage(`버전 ${version}이 성공적으로 삭제되었습니다.`, 'success');
        // 삭제된 버전이 선택된 버전이면 초기화
        if (selectedVersion === version) {
          setSelectedVersion('');
        }
        await loadCacheData();
      } else {
        const error = await response.json();
        showMessage(`삭제 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to delete version:', error);
      showMessage('버전 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // 버전 상세보기 기능
  const handleViewDetail = async (version: CacheVersion) => {
    console.log('handleViewDetail called with:', version);
    try {
      setDetailVersion(version);
      setShowDetailModal(true);
      
      // 해당 버전의 통계 조회
      const statsResponse = await fetch(`/api/virtual-evidence-cache?action=stats&version=${version.version}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Stats data:', statsData);
        setDetailStats(statsData.stats);
      }
    } catch (error) {
      console.error('Failed to load version details:', error);
      showMessage('버전 상세 정보 로드에 실패했습니다.', 'error');
    }
  };

  const loadCacheItems = async (version?: string, language: 'ko' | 'en' = 'ko') => {
    try {
      const versionParam = version || selectedVersion || (versions.length > 0 ? versions[0].version : '');
      if (!versionParam) {
        showMessage('선택된 버전이 없습니다.', 'error');
        return;
      }
      setViewingVersion(versionParam); // 현재 보고 있는 버전 저장
      const response = await fetch(`/api/virtual-evidence-cache?action=list&version=${versionParam}&language=${language}`);
      if (response.ok) {
        const data = await response.json();
        setCacheItems(data.evidence || []);
        setShowCacheViewer(true);
      } else {
        showMessage('캐시 항목 로드에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Failed to load cache items:', error);
      showMessage('캐시 항목 로드 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleEditItem = (item: CachedVirtualEvidenceItem) => {
    setEditingItem({ ...item });
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    setIsUpdating(true);
    try {
      const response = await fetch('/api/virtual-evidence-cache', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingItem.id, virtualEvidence: editingItem.virtualEvidence }),
      });
      if (response.ok) {
        showMessage('가상증빙예제가 성공적으로 업데이트되었습니다.', 'success');
        setEditingItem(null);
        await loadCacheItems(viewingVersion, selectedLanguage);
      } else {
        const error = await response.json();
        showMessage(`업데이트 실패: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      showMessage('업데이트 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredCacheItems = cacheItems.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return item.itemId.toLowerCase().includes(query) || item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
  });

  if (!isMounted) {
    return null;
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <PermissionGuard requiredRoute="/cache">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 256 }}>
            <div style={{ 
              width: 48, height: 48, border: '4px solid #E4E6EB', 
              borderTopColor: '#8B5CF6', borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </PermissionGuard>
      </AdminLayout>
    );
  }


  return (
    <AdminLayout>
      <PermissionGuard requiredRoute="/cache">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* 헤더 카드 */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📋 가상증빙예제 캐시 관리</h1>
                  <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>평가 항목별 AI 가상증빙예제 캐시를 독립적으로 관리합니다</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={openSummaryLLMModal}
                    disabled={isGeneratingSummary || !activeVersions.virtualEvidence}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#F59E0B',
                      background: 'white', border: 'none', borderRadius: 8, 
                      cursor: isGeneratingSummary || !activeVersions.virtualEvidence ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      opacity: isGeneratingSummary || !activeVersions.virtualEvidence ? 0.7 : 1
                    }}
                  >
                    {isGeneratingSummary ? '⏳ 요약 중...' : '📋 요약 생성'}
                  </button>
                  <button
                    onClick={loadSummaryList}
                    disabled={isLoadingSummaryList}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#6366F1',
                      background: 'white', border: 'none', borderRadius: 8, 
                      cursor: isLoadingSummaryList ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      opacity: isLoadingSummaryList ? 0.7 : 1
                    }}
                  >
                    {isLoadingSummaryList ? '⏳ 로딩...' : '👁️ 요약 보기'}
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#42B883',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    📥 가져오기
                  </button>
                  <button
                    onClick={openExportModal}
                    disabled={isExporting || versions.length === 0}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#F59E0B',
                      background: 'white', border: 'none', borderRadius: 8, 
                      cursor: isExporting || versions.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      opacity: isExporting || versions.length === 0 ? 0.7 : 1
                    }}
                  >
                    {isExporting ? '⏳ 내보내는 중...' : '📤 내보내기'}
                  </button>
                  <button
                    onClick={loadCacheData}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#8B5CF6',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    🔄 새로고침
                  </button>
                  <button
                    onClick={openLLMConfigModal}
                    disabled={isGenerating}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'white',
                      background: isGenerating ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                      border: '2px solid white', borderRadius: 8, cursor: isGenerating ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, opacity: isGenerating ? 0.7 : 1
                    }}
                  >
                    {isGenerating ? '⏳ 생성 중...' : '➕ 새 캐시 생성'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 메시지 */}
          {message && (
            <div style={{
              padding: 16, borderRadius: 12,
              background: messageType === 'success' ? '#E8F5E9' : messageType === 'error' ? '#FEE2E2' : '#EDE9FE',
              color: messageType === 'success' ? '#2E7D32' : messageType === 'error' ? '#DC2626' : '#8B5CF6',
              border: `1px solid ${messageType === 'success' ? '#A5D6A7' : messageType === 'error' ? '#FECACA' : '#C4B5FD'}`
            }}>
              {message}
            </div>
          )}

          {/* 통계 카드 그리드 */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>📄 총 캐시 항목</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#8B5CF6' }}>{stats.total}</div>
                </div>
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>🇰🇷 한국어 예제</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#42B883' }}>{stats.korean}</div>
                </div>
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>🌐 영어 예제</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#1877F2' }}>{stats.english}</div>
                </div>
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: 'white' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>📋 고유 평가 항목</div>
                </div>
                <div style={{ padding: 16, background: 'white' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B' }}>{stats.unique_items}</div>
                </div>
              </div>
            </div>
          )}

          {/* 활성 버전 정보 */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🎯 활성 캐시 버전</h3>
            </div>
            <div style={{ padding: 24, background: 'white' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {/* 가상증빙예제 캐시 활성 버전 */}
                <div style={{ padding: 20, borderRadius: 12, border: '2px solid #8B5CF6', background: '#EDE9FE' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#5B21B6' }}>📋 가상증빙예제 캐시</span>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: activeVersions.virtualEvidence ? '#8B5CF6' : '#9CA3AF', color: 'white'
                    }}>
                      {activeVersions.virtualEvidence ? '활성' : '미설정'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#65676B', marginBottom: 12 }}>
                    현재 활성 버전: <strong>{activeVersions.virtualEvidence || '없음'}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      value={selectedVersion}
                      onChange={(e) => setSelectedVersion(e.target.value)}
                      style={{ flex: 1, padding: '10px 14px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10, boxSizing: 'border-box' }}
                    >
                      <option value="">버전 선택</option>
                      {versions.map((version) => (
                        <option key={version.version} value={version.version}>
                          {version.version} ({version.totalItems}개 항목)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => selectedVersion && setActiveVersion('virtual_evidence', selectedVersion)}
                      disabled={!selectedVersion || isSettingActiveVersion}
                      style={{
                        padding: '10px 20px', fontSize: 13, fontWeight: 600, color: 'white',
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                        border: 'none', borderRadius: 10, cursor: !selectedVersion || isSettingActiveVersion ? 'not-allowed' : 'pointer',
                        opacity: !selectedVersion || isSettingActiveVersion ? 0.7 : 1
                      }}
                    >
                      {isSettingActiveVersion ? '설정 중...' : '활성화'}
                    </button>
                  </div>
                </div>
                {/* 조언 캐시 */}
                <div style={{ padding: 20, borderRadius: 12, border: '2px solid #1877F2', background: '#E7F3FF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1565C0' }}>🎯 조언 캐시</span>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: activeVersions.advice ? '#1877F2' : '#9CA3AF', color: 'white'
                    }}>
                      {activeVersions.advice ? '활성' : '미설정'}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#65676B', marginBottom: 12 }}>
                    현재 활성 버전: <strong>{activeVersions.advice || '없음'}</strong>
                  </div>
                  <button
                    onClick={() => window.location.href = '/cache'}
                    style={{
                      width: '100%', padding: '10px 20px', fontSize: 13, fontWeight: 600, color: '#1877F2',
                      background: 'white', border: '2px solid #1877F2', borderRadius: 10, cursor: 'pointer'
                    }}
                  >
                    조언 캐시 관리로 이동 →
                  </button>
                </div>
              </div>
            </div>
          </div>


          {/* 캐시 버전 관리 */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📦 캐시 버전 관리</h3>
                <span style={{ fontSize: 14, opacity: 0.9 }}>{versions.length}개의 버전</span>
              </div>
            </div>
            <div style={{ padding: 24, background: 'white' }}>
              {versions.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                  <p style={{ color: '#65676B', fontSize: 16 }}>생성된 캐시 버전이 없습니다.</p>
                  <p style={{ color: '#8B8D91', fontSize: 14, marginTop: 8 }}>"새 캐시 생성" 버튼을 클릭하여 첫 번째 캐시를 생성해보세요.</p>
                </div>
              ) : (
                <>
                  {/* 버전 선택 및 캐시 내용 보기 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: '#F0F2F5', borderRadius: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21' }}>버전 선택:</label>
                      <select
                        value={selectedVersion}
                        onChange={(e) => setSelectedVersion(e.target.value)}
                        style={{ padding: '10px 14px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10, fontWeight: 600 }}
                      >
                        <option value="">전체 통계</option>
                        {versions.map((version) => (
                          <option key={version.version} value={version.version}>
                            {version.version} ({formatDate(version.createdAt)})
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedVersion && (
                      <button
                        onClick={() => loadCacheItems(selectedVersion, selectedLanguage)}
                        style={{
                          padding: '12px 24px', fontSize: 14, fontWeight: 600, color: 'white',
                          background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                          border: 'none', borderRadius: 10, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8
                        }}
                      >
                        👁️ 캐시 내용 보기
                      </button>
                    )}
                  </div>
                  {/* 버전 목록 테이블 */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F0F2F5' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>버전</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>생성일시</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>항목 수</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>설명</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#65676B' }}>상태</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#65676B' }}>액션</th>
                        </tr>
                      </thead>
                      <tbody>
                        {versions.map((version, index) => (
                          <tr key={version.version} style={{ background: index === 0 ? '#EDE9FE' : 'white', borderBottom: '1px solid #E4E6EB' }}>
                            <td style={{ padding: '12px 16px', fontSize: 14, fontFamily: 'monospace', color: '#1C1E21' }}>
                              {version.version}
                              {index === 0 && (
                                <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#8B5CF6', color: 'white' }}>
                                  최신
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 14, color: '#1C1E21' }}>{formatDate(version.createdAt)}</td>
                            <td style={{ padding: '12px 16px', fontSize: 14, color: '#1C1E21' }}>{version.totalItems}개</td>
                            <td style={{ padding: '12px 16px', fontSize: 14, color: '#1C1E21' }}>{version.description}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#E8F5E9', color: '#2E7D32' }}>
                                완료
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => handleViewDetail(version)}
                                  style={{
                                    padding: '6px 12px', fontSize: 12, fontWeight: 600,
                                    color: '#8B5CF6', background: '#EDE9FE',
                                    border: 'none', borderRadius: 6, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    position: 'relative', zIndex: 1
                                  }}
                                >
                                  🔍 상세
                                </button>
                                <button
                                  onClick={() => { setSelectedVersion(version.version); loadCacheItems(version.version, selectedLanguage); }}
                                  style={{
                                    padding: '6px 12px', fontSize: 12, fontWeight: 600,
                                    color: '#42B883', background: '#E8F5E9',
                                    border: 'none', borderRadius: 6, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    position: 'relative', zIndex: 1
                                  }}
                                >
                                  👁️ 내용
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteVersion(version.version); }}
                                  disabled={isDeleting || activeVersions.virtualEvidence === version.version}
                                  style={{
                                    padding: '6px 12px', fontSize: 12, fontWeight: 600,
                                    color: activeVersions.virtualEvidence === version.version ? '#9CA3AF' : '#DC2626',
                                    background: activeVersions.virtualEvidence === version.version ? '#F3F4F6' : '#FEE2E2',
                                    border: 'none', borderRadius: 6,
                                    cursor: isDeleting || activeVersions.virtualEvidence === version.version ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                    opacity: isDeleting ? 0.7 : 1,
                                    position: 'relative', zIndex: 1
                                  }}
                                  title={activeVersions.virtualEvidence === version.version ? '활성 버전은 삭제할 수 없습니다' : '버전 삭제'}
                                >
                                  🗑️ 삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 사용 가이드 */}
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '16px 24px', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', color: 'white' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>📖 가상증빙예제 캐시 시스템 가이드</h3>
            </div>
            <div style={{ padding: 24, background: 'white' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
                <div style={{ padding: 20, borderRadius: 12, background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#8B5CF6' }}>📝 캐시 생성</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#1C1E21', lineHeight: 1.8 }}>
                    <li>모든 평가 항목에 대한 AI 가상증빙예제 생성</li>
                    <li>한국어/영어 버전 모두 생성</li>
                    <li>항목별 맞춤형 증빙자료 예제</li>
                    <li>날짜 기반 버전 관리</li>
                  </ul>
                </div>
                <div style={{ padding: 20, borderRadius: 12, background: '#E8F5E9', border: '1px solid #A5D6A7' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#2E7D32' }}>🔄 캐시 사용</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: '#1C1E21', lineHeight: 1.8 }}>
                    <li>SQLite DB에 저장되어 빠른 조회</li>
                    <li>평가 페이지에서 자동 로드</li>
                    <li>언어별 개별 캐시</li>
                    <li>조언 캐시와 독립적 관리</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>


          {/* 버전 상세보기 모달 */}
          {showDetailModal && detailVersion && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 100
            }}>
              <div style={{
                width: '90%', maxWidth: 600, borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)', background: 'white'
              }}>
                <div style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                  color: 'white', borderRadius: '16px 16px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🔍 버전 상세 정보</h3>
                  <button
                    onClick={() => { setShowDetailModal(false); setDetailVersion(null); setDetailStats(null); }}
                    style={{
                      padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#8B5CF6',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer'
                    }}
                  >
                    ✕ 닫기
                  </button>
                </div>
                <div style={{ padding: 24 }}>
                  {/* 버전 기본 정보 */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                      <div style={{ padding: 16, borderRadius: 12, background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#65676B', marginBottom: 4 }}>버전</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#8B5CF6', fontFamily: 'monospace' }}>{detailVersion.version}</div>
                      </div>
                      <div style={{ padding: 16, borderRadius: 12, background: '#E8F5E9', border: '1px solid #A5D6A7' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#65676B', marginBottom: 4 }}>생성일시</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#2E7D32' }}>{formatDate(detailVersion.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 통계 정보 */}
                  {detailStats && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1C1E21' }}>📊 캐시 통계</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        <div style={{ padding: 12, borderRadius: 10, background: '#F0F2F5', textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#8B5CF6' }}>{detailStats.total}</div>
                          <div style={{ fontSize: 11, color: '#65676B' }}>총 항목</div>
                        </div>
                        <div style={{ padding: 12, borderRadius: 10, background: '#F0F2F5', textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#42B883' }}>{detailStats.korean}</div>
                          <div style={{ fontSize: 11, color: '#65676B' }}>한국어</div>
                        </div>
                        <div style={{ padding: 12, borderRadius: 10, background: '#F0F2F5', textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#1877F2' }}>{detailStats.english}</div>
                          <div style={{ fontSize: 11, color: '#65676B' }}>영어</div>
                        </div>
                        <div style={{ padding: 12, borderRadius: 10, background: '#F0F2F5', textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B' }}>{detailStats.unique_items}</div>
                          <div style={{ fontSize: 11, color: '#65676B' }}>고유 항목</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 설명 */}
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#65676B' }}>설명</h4>
                    <div style={{ padding: 12, borderRadius: 10, background: '#F0F2F5', fontSize: 14, color: '#1C1E21' }}>
                      {detailVersion.description || '설명 없음'}
                    </div>
                  </div>
                  
                  {/* 활성 상태 */}
                  <div style={{ padding: 16, borderRadius: 12, background: activeVersions.virtualEvidence === detailVersion.version ? '#E8F5E9' : '#FEF3C7', border: `1px solid ${activeVersions.virtualEvidence === detailVersion.version ? '#A5D6A7' : '#F59E0B'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{activeVersions.virtualEvidence === detailVersion.version ? '✅' : '⚠️'}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: activeVersions.virtualEvidence === detailVersion.version ? '#2E7D32' : '#92400E' }}>
                        {activeVersions.virtualEvidence === detailVersion.version ? '현재 활성 버전입니다' : '비활성 버전입니다'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 액션 버튼 */}
                  <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button
                      onClick={() => { setSelectedVersion(detailVersion.version); loadCacheItems(detailVersion.version, selectedLanguage); setShowDetailModal(false); }}
                      style={{
                        flex: 1, padding: '12px 20px', fontSize: 14, fontWeight: 600, color: 'white',
                        background: 'linear-gradient(135deg, #42B883 0%, #35495E 100%)',
                        border: 'none', borderRadius: 10, cursor: 'pointer'
                      }}
                    >
                      👁️ 캐시 내용 보기
                    </button>
                    {activeVersions.virtualEvidence !== detailVersion.version && (
                      <button
                        onClick={() => { setActiveVersion('virtual_evidence', detailVersion.version); setShowDetailModal(false); }}
                        disabled={isSettingActiveVersion}
                        style={{
                          flex: 1, padding: '12px 20px', fontSize: 14, fontWeight: 600, color: 'white',
                          background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                          border: 'none', borderRadius: 10, cursor: isSettingActiveVersion ? 'not-allowed' : 'pointer',
                          opacity: isSettingActiveVersion ? 0.7 : 1
                        }}
                      >
                        🎯 활성화
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LLM 설정 모달 */}
          {showLLMConfigModal && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 100
            }}>
              <div style={{
                width: '90%', maxWidth: 600, borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)', background: 'white',
                maxHeight: '90vh', overflowY: 'auto'
              }}>
                <div style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                  color: 'white', borderRadius: '16px 16px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🤖 LLM 설정 및 캐시 생성</h3>
                  <button
                    onClick={() => setShowLLMConfigModal(false)}
                    style={{
                      padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#8B5CF6',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer'
                    }}
                  >
                    ✕ 닫기
                  </button>
                </div>
                <div style={{ padding: 24 }}>
                  {/* LLM 제공자 선택 */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 12 }}>
                      LLM 제공자 선택
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      {(Object.keys(LLM_PROVIDERS) as Array<keyof typeof LLM_PROVIDERS>).map((key) => {
                        const provider = LLM_PROVIDERS[key];
                        const isSelected = llmConfig.provider === key;
                        return (
                          <button
                            key={key}
                            onClick={() => handleProviderChange(key)}
                            style={{
                              padding: 16, borderRadius: 12, border: `2px solid ${isSelected ? provider.color : '#E4E6EB'}`,
                              background: isSelected ? `${provider.color}15` : 'white',
                              cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ fontSize: 32, marginBottom: 8 }}>{provider.icon}</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? provider.color : '#1C1E21' }}>
                              {provider.name}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 모델 선택 */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                      모델 선택
                    </label>
                    <select
                      value={llmConfig.model}
                      onChange={(e) => setLLMConfig({ ...llmConfig, model: e.target.value })}
                      style={{
                        width: '100%', padding: '12px 16px', fontSize: 14, border: '2px solid #E4E6EB',
                        borderRadius: 10, background: 'white', cursor: 'pointer'
                      }}
                    >
                      {LLM_PROVIDERS[llmConfig.provider].models.map((model) => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* API 키 입력 (OpenAI, Gemini, Claude) */}
                  {(llmConfig.provider === 'openai' || llmConfig.provider === 'gemini' || llmConfig.provider === 'claude') && (
                    <div style={{ marginBottom: 24 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                        {llmConfig.provider === 'openai' ? 'OpenAI API Key' : llmConfig.provider === 'gemini' ? 'Google API Key' : 'Anthropic API Key'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={llmConfig.apiKey || ''}
                          onChange={(e) => setLLMConfig({ ...llmConfig, apiKey: e.target.value })}
                          placeholder={llmConfig.provider === 'openai' ? 'sk-...' : llmConfig.provider === 'gemini' ? 'AIza...' : 'sk-ant-...'}
                          style={{
                            width: '100%', padding: '12px 44px 12px 16px', fontSize: 14, border: '2px solid #E4E6EB',
                            borderRadius: 10, boxSizing: 'border-box'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#65676B'
                          }}
                        >
                          {showApiKey ? '🙈' : '👁️'}
                        </button>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#65676B' }}>
                        {llmConfig.provider === 'openai' 
                          ? '💡 OpenAI API 키는 https://platform.openai.com/api-keys 에서 발급받을 수 있습니다.'
                          : llmConfig.provider === 'gemini'
                          ? '💡 Google API 키는 https://aistudio.google.com/app/apikey 에서 발급받을 수 있습니다.'
                          : '💡 Anthropic API 키는 https://console.anthropic.com/settings/keys 에서 발급받을 수 있습니다.'}
                      </p>
                    </div>
                  )}

                  {/* AWS 자격증명 입력 (Bedrock) */}
                  {llmConfig.provider === 'bedrock' && (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                          AWS Region
                        </label>
                        <select
                          value={llmConfig.awsRegion || 'us-east-1'}
                          onChange={(e) => setLLMConfig({ ...llmConfig, awsRegion: e.target.value })}
                          style={{
                            width: '100%', padding: '12px 16px', fontSize: 14, border: '2px solid #E4E6EB',
                            borderRadius: 10, background: 'white', cursor: 'pointer'
                          }}
                        >
                          <option value="us-east-1">US East (N. Virginia)</option>
                          <option value="us-west-2">US West (Oregon)</option>
                          <option value="eu-west-1">Europe (Ireland)</option>
                          <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                          <option value="ap-northeast-2">Asia Pacific (Seoul) 🇰🇷</option>
                          <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                          <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                          AWS Access Key ID
                        </label>
                        <input
                          type="text"
                          value={llmConfig.awsAccessKeyId || ''}
                          onChange={(e) => setLLMConfig({ ...llmConfig, awsAccessKeyId: e.target.value })}
                          placeholder="AKIA..."
                          style={{
                            width: '100%', padding: '12px 16px', fontSize: 14, border: '2px solid #E4E6EB',
                            borderRadius: 10, boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                          AWS Secret Access Key
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showAwsSecretKey ? 'text' : 'password'}
                            value={llmConfig.awsSecretAccessKey || ''}
                            onChange={(e) => setLLMConfig({ ...llmConfig, awsSecretAccessKey: e.target.value })}
                            placeholder="비밀 액세스 키 입력"
                            style={{
                              width: '100%', padding: '12px 44px 12px 16px', fontSize: 14, border: '2px solid #E4E6EB',
                              borderRadius: 10, boxSizing: 'border-box'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowAwsSecretKey(!showAwsSecretKey)}
                            style={{
                              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#65676B'
                            }}
                          >
                            {showAwsSecretKey ? '🙈' : '👁️'}
                          </button>
                        </div>
                      </div>
                      <div style={{ padding: 16, borderRadius: 12, background: '#FEF3C7', border: '1px solid #F59E0B', marginBottom: 24 }}>
                        <p style={{ margin: 0, fontSize: 13, color: '#92400E' }}>
                          ⚠️ AWS IAM 사용자에게 <code style={{ background: '#FDE68A', padding: '2px 6px', borderRadius: 4 }}>bedrock:InvokeModel</code> 권한이 필요합니다.
                        </p>
                      </div>
                      
                      {/* Inference Profile ARN 입력 (Claude 4.5+ 모델용) */}
                      {needsInferenceProfile && (
                        <div style={{ marginBottom: 24 }}>
                          <div style={{ padding: 16, borderRadius: 12, background: '#DBEAFE', border: '1px solid #3B82F6', marginBottom: 16 }}>
                            <p style={{ margin: 0, fontSize: 13, color: '#1E40AF', lineHeight: 1.6 }}>
                              🔐 <strong>Claude 4.5 모델</strong>은 Inference Profile이 필요합니다.<br/>
                              <br/>
                              <strong>옵션 1: 자동 찾기</strong> - 시스템 정의 Inference Profile을 자동으로 찾습니다.<br/>
                              <strong>옵션 2: 수동 입력</strong> - AWS Bedrock 콘솔에서 생성한 ARN을 입력합니다.
                            </p>
                          </div>
                          
                          {/* 자동 찾기 체크박스 */}
                          <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: '#F0FDF4', border: '1px solid #10B981' }}>
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
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#065F46' }}>
                                🔍 시스템 정의 Inference Profile 자동 찾기 (권장)
                              </span>
                            </label>
                            <p style={{ margin: '8px 0 0 26px', fontSize: 12, color: '#047857' }}>
                              AWS에서 제공하는 global/apac Inference Profile을 자동으로 찾아 사용합니다.
                            </p>
                          </div>
                          
                          {/* 수동 입력 (자동 찾기가 비활성화된 경우만) */}
                          {!llmConfig.autoCreateInferenceProfile && (
                            <>
                              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                                Inference Profile ARN <span style={{ color: '#EF4444' }}>*</span>
                              </label>
                              <input
                                type="text"
                                value={llmConfig.inferenceProfileArn || ''}
                                onChange={(e) => setLLMConfig({ ...llmConfig, inferenceProfileArn: e.target.value })}
                                placeholder="arn:aws:bedrock:region:account-id:inference-profile/profile-id"
                                style={{
                                  width: '100%', padding: '12px 16px', fontSize: 14, 
                                  border: `2px solid ${llmConfig.inferenceProfileArn ? '#10B981' : '#EF4444'}`,
                                  borderRadius: 10, boxSizing: 'border-box',
                                  background: llmConfig.inferenceProfileArn ? '#F0FDF4' : '#FEF2F2'
                                }}
                              />
                              <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: '#F0FDF4', border: '1px solid #10B981' }}>
                                <p style={{ margin: 0, fontSize: 12, color: '#065F46' }}>
                                  <strong>✅ 올바른 형식 (시스템 정의):</strong><br/>
                                  <code style={{ background: '#D1FAE5', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                                    arn:aws:bedrock:ap-northeast-2:ACCOUNT_ID:inference-profile/global.anthropic.claude-sonnet-4-5-20250929-v1:0
                                  </code>
                                </p>
                              </div>
                              <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: '#FEF2F2', border: '1px solid #EF4444' }}>
                                <p style={{ margin: 0, fontSize: 12, color: '#991B1B' }}>
                                  <strong>❌ 잘못된 형식 (Foundation Model ARN):</strong><br/>
                                  <code style={{ background: '#FECACA', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                                    arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5-v2:0
                                  </code>
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* LLM 파라미터 설정 */}
                  <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 16 }}>
                      ⚙️ LLM 파라미터 설정
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#65676B', marginBottom: 6 }}>
                          Temperature (창의성)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={llmConfig.temperature || 0.8}
                            onChange={(e) => setLLMConfig({ ...llmConfig, temperature: parseFloat(e.target.value) })}
                            style={{ flex: 1 }}
                          />
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21', minWidth: 36 }}>
                            {llmConfig.temperature?.toFixed(1) || '0.8'}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                          낮을수록 일관성 ↑, 높을수록 다양성 ↑
                        </p>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#65676B', marginBottom: 6 }}>
                          Max Tokens (최대 길이)
                        </label>
                        <select
                          value={llmConfig.maxTokens || 8192}
                          onChange={(e) => setLLMConfig({ ...llmConfig, maxTokens: parseInt(e.target.value) })}
                          style={{
                            width: '100%', padding: '8px 12px', fontSize: 14, border: '2px solid #E4E6EB',
                            borderRadius: 8, background: 'white', cursor: 'pointer'
                          }}
                        >
                          <option value={2048}>2,048 (짧은 응답)</option>
                          <option value={4096}>4,096 (기본)</option>
                          <option value={8192}>8,192 (상세 응답)</option>
                          <option value={16384}>16,384 (매우 상세)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 언어 선택 */}
                  <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 12 }}>
                      🌐 생성할 언어 선택
                    </label>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={generationOptions.includeKorean}
                          onChange={(e) => setGenerationOptions({ ...generationOptions, includeKorean: e.target.checked })}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>🇰🇷 한국어</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={generationOptions.includeEnglish}
                          onChange={(e) => setGenerationOptions({ ...generationOptions, includeEnglish: e.target.checked })}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>🇺🇸 영어</span>
                      </label>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#65676B' }}>
                      💡 두 언어 모두 선택하면 한국어 → 영어 순서로 생성됩니다.
                    </p>
                  </div>

                  {/* 현재 설정 요약 */}
                  <div style={{ padding: 16, borderRadius: 12, background: '#F0F2F5', marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#65676B', marginBottom: 8 }}>현재 설정</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{LLM_PROVIDERS[llmConfig.provider].icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21' }}>
                          {LLM_PROVIDERS[llmConfig.provider].name}
                        </div>
                        <div style={{ fontSize: 12, color: '#65676B' }}>
                          {LLM_PROVIDERS[llmConfig.provider].models.find(m => m.id === llmConfig.model)?.name || llmConfig.model}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 생성 버튼 */}
                  <button
                    onClick={generateCache}
                    disabled={isGenerating || 
                      (llmConfig.provider !== 'bedrock' && !llmConfig.apiKey) ||
                      (llmConfig.provider === 'bedrock' && (!llmConfig.awsAccessKeyId || !llmConfig.awsSecretAccessKey)) ||
                      (needsInferenceProfile && !llmConfig.inferenceProfileArn && !llmConfig.autoCreateInferenceProfile)
                    }
                    style={{
                      width: '100%', padding: '14px 24px', fontSize: 16, fontWeight: 600, color: 'white',
                      background: `linear-gradient(135deg, ${LLM_PROVIDERS[llmConfig.provider].color} 0%, ${LLM_PROVIDERS[llmConfig.provider].color}CC 100%)`,
                      border: 'none', borderRadius: 12, cursor: 'pointer',
                      opacity: (isGenerating || 
                        (llmConfig.provider !== 'bedrock' && !llmConfig.apiKey) ||
                        (llmConfig.provider === 'bedrock' && (!llmConfig.awsAccessKeyId || !llmConfig.awsSecretAccessKey)) ||
                        (needsInferenceProfile && !llmConfig.inferenceProfileArn && !llmConfig.autoCreateInferenceProfile)) ? 0.5 : 1
                    }}
                  >
                    {isGenerating ? '⏳ 캐시 생성 중...' : '🚀 캐시 생성 시작'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Export 모달 - 버전 선택 */}
          {showExportModal && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 50
            }}>
              <div style={{
                width: '90%', maxWidth: 500, borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)', background: 'white'
              }}>
                <div style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                  color: 'white', borderRadius: '16px 16px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📤 가상증빙예제 캐시 내보내기</h3>
                  <button
                    onClick={() => setShowExportModal(false)}
                    style={{
                      padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#F59E0B',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer'
                    }}
                  >
                    ✕ 닫기
                  </button>
                </div>
                <div style={{ padding: 24 }}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>
                      내보낼 버전 선택
                    </label>
                    <select
                      value={exportSelectedVersion}
                      onChange={(e) => setExportSelectedVersion(e.target.value)}
                      style={{
                        width: '100%', padding: '12px 16px', fontSize: 14,
                        border: '2px solid #E4E6EB', borderRadius: 10,
                        background: 'white', cursor: 'pointer'
                      }}
                    >
                      {versions.map((v) => (
                        <option key={v.version} value={v.version}>
                          {v.version} {v.version === activeVersions.virtualEvidence ? '⭐ (활성)' : ''} - {new Date(v.createdAt).toLocaleString('ko-KR')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* 선택된 버전 정보 */}
                  {exportSelectedVersion && (
                    <div style={{
                      padding: 16, borderRadius: 12, background: '#FEF3C7',
                      border: '1px solid #F59E0B', marginBottom: 20
                    }}>
                      <div style={{ fontSize: 13, color: '#92400E' }}>
                        <strong>선택된 버전:</strong> {exportSelectedVersion}
                        {exportSelectedVersion === activeVersions.virtualEvidence && (
                          <span style={{ marginLeft: 8, padding: '2px 8px', background: '#10B981', color: 'white', borderRadius: 4, fontSize: 11 }}>
                            활성 버전
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#B45309', marginTop: 4 }}>
                        생성일: {versions.find(v => v.version === exportSelectedVersion)?.createdAt 
                          ? new Date(versions.find(v => v.version === exportSelectedVersion)!.createdAt).toLocaleString('ko-KR')
                          : '-'}
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleExportCache()}
                    disabled={!exportSelectedVersion || isExporting}
                    style={{
                      width: '100%', padding: '14px 24px', fontSize: 16, fontWeight: 600,
                      color: 'white', background: !exportSelectedVersion || isExporting 
                        ? '#D1D5DB' 
                        : 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                      border: 'none', borderRadius: 12, cursor: !exportSelectedVersion || isExporting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isExporting ? '⏳ 내보내는 중...' : '📤 내보내기'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Import 모달 */}
          {showImportModal && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 50
            }}>
              <div style={{
                width: '90%', maxWidth: 500, borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)', background: 'white'
              }}>
                <div style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                  color: 'white', borderRadius: '16px 16px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📥 가상증빙예제 캐시 가져오기</h3>
                  <button
                    onClick={() => setShowImportModal(false)}
                    style={{
                      padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#8B5CF6',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer'
                    }}
                  >
                    ✕ 닫기
                  </button>
                </div>
                <div style={{ padding: 24 }}>
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ margin: '0 0 16px', fontSize: 14, color: '#65676B', lineHeight: 1.6 }}>
                      이전에 내보낸 가상증빙예제 캐시 JSON 파일을 선택하여 가져올 수 있습니다.
                      동일한 버전이 이미 존재하는 경우 덮어쓰기됩니다.
                    </p>
                    <div style={{
                      padding: 24, borderRadius: 12, border: '2px dashed #8B5CF6',
                      background: '#EDE9FE', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
                      <p style={{ margin: '0 0 16px', fontSize: 14, color: '#5B21B6' }}>
                        JSON 파일을 선택하세요
                      </p>
                      <label style={{
                        display: 'inline-block', padding: '12px 24px', fontSize: 14, fontWeight: 600,
                        color: 'white', background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                        borderRadius: 10, cursor: isImporting ? 'not-allowed' : 'pointer',
                        opacity: isImporting ? 0.7 : 1
                      }}>
                        {isImporting ? '⏳ 가져오는 중...' : '📂 파일 선택'}
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportCache}
                          disabled={isImporting}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 12, background: '#FEF3C7', border: '1px solid #F59E0B' }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#92400E' }}>
                      ⚠️ 주의: 가져온 캐시는 기존 데이터와 병합됩니다. 동일한 버전의 항목은 덮어쓰기됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 캐시 내용 뷰어 모달 */}
          {showCacheViewer && (
            <div style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
              zIndex: 50, padding: '20px 0', overflowY: 'auto'
            }}>
              <div style={{
                width: '95%', maxWidth: 1200, borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)', background: 'white'
              }}>
                {/* 모달 헤더 */}
                <div style={{
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                  color: 'white', borderRadius: '16px 16px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📋 가상증빙예제 캐시 내용 관리</h3>
                    <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>
                      버전: {viewingVersion} | 언어: {selectedLanguage === 'ko' ? '한국어' : '영어'} | 총 {filteredCacheItems.length}개 항목
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowCacheViewer(false); setCacheItems([]); setEditingItem(null); setViewingVersion(''); }}
                    style={{
                      padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#8B5CF6',
                      background: 'white', border: 'none', borderRadius: 8, cursor: 'pointer'
                    }}
                  >
                    ✕ 닫기
                  </button>
                </div>
                {/* 모달 바디 */}
                <div style={{ padding: 24 }}>
                  {/* 필터 */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => { setSelectedLanguage('ko'); loadCacheItems(viewingVersion, 'ko'); }}
                        style={{
                          padding: '10px 20px', fontSize: 14, fontWeight: 600,
                          color: selectedLanguage === 'ko' ? 'white' : '#42B883',
                          background: selectedLanguage === 'ko' ? 'linear-gradient(135deg, #42B883 0%, #35495E 100%)' : '#E8F5E9',
                          border: 'none', borderRadius: 10, cursor: 'pointer'
                        }}
                      >
                        🇰🇷 한국어
                      </button>
                      <button
                        onClick={() => { setSelectedLanguage('en'); loadCacheItems(viewingVersion, 'en'); }}
                        style={{
                          padding: '10px 20px', fontSize: 14, fontWeight: 600,
                          color: selectedLanguage === 'en' ? 'white' : '#1877F2',
                          background: selectedLanguage === 'en' ? 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)' : '#E7F3FF',
                          border: 'none', borderRadius: 10, cursor: 'pointer'
                        }}
                      >
                        🌐 영어
                      </button>
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="항목ID, 제목, 카테고리 검색..."
                      style={{ flex: 1, padding: '10px 16px', fontSize: 14, border: '2px solid #E4E6EB', borderRadius: 10 }}
                    />
                  </div>
                  {/* 캐시 항목 목록 */}
                  <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                    {filteredCacheItems.length === 0 ? (
                      <div style={{ padding: 48, textAlign: 'center' }}>
                        <p style={{ color: '#65676B' }}>캐시 항목이 없습니다.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {filteredCacheItems.map((item, index) => (
                          <div key={item.id} style={{
                            padding: 16, borderRadius: 12, border: '1px solid #E4E6EB',
                            background: editingItem?.id === item.id ? '#EDE9FE' : 'white'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#EDE9FE', color: '#8B5CF6' }}>
                                  {item.itemId}
                                </span>
                                <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#E8F5E9', color: '#2E7D32' }}>
                                  {item.category}
                                </span>
                              </div>
                              <button
                                onClick={() => editingItem?.id === item.id ? setEditingItem(null) : handleEditItem(item)}
                                style={{
                                  padding: '6px 12px', fontSize: 12, fontWeight: 600,
                                  color: editingItem?.id === item.id ? '#8B5CF6' : '#1877F2',
                                  background: editingItem?.id === item.id ? '#EDE9FE' : '#E7F3FF',
                                  border: 'none', borderRadius: 6, cursor: 'pointer'
                                }}
                              >
                                {editingItem?.id === item.id ? '취소' : '✏️ 편집'}
                              </button>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#1C1E21', marginBottom: 8 }}>{item.title}</div>
                            {editingItem?.id === item.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#65676B', marginBottom: 4 }}>가상증빙예제</label>
                                  <textarea
                                    value={editingItem.virtualEvidence}
                                    onChange={(e) => setEditingItem({ ...editingItem, virtualEvidence: e.target.value })}
                                    style={{ width: '100%', minHeight: 150, padding: 12, fontSize: 14, border: '2px solid #8B5CF6', borderRadius: 10, resize: 'vertical', boxSizing: 'border-box' }}
                                  />
                                </div>
                                <button
                                  onClick={handleUpdateItem}
                                  disabled={isUpdating}
                                  style={{
                                    padding: '12px 24px', fontSize: 14, fontWeight: 600, color: 'white',
                                    background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                                    border: 'none', borderRadius: 10, cursor: isUpdating ? 'not-allowed' : 'pointer',
                                    opacity: isUpdating ? 0.7 : 1
                                  }}
                                >
                                  {isUpdating ? '저장 중...' : '💾 저장'}
                                </button>
                              </div>
                            ) : (
                              <div style={{ fontSize: 14, color: '#1C1E21', lineHeight: 1.6 }}>
                                <div 
                                  style={{ maxHeight: 200, overflow: 'hidden' }}
                                  dangerouslySetInnerHTML={createMarkdownHtml(item.virtualEvidence.substring(0, 500) + '...')}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </PermissionGuard>

      {/* 요약 목록 모달 */}
      {showSummaryListModal && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 100, padding: 20 
          }}
          onClick={() => setShowSummaryListModal(false)}
        >
          <div 
            style={{ 
              background: 'white', borderRadius: 16, width: '100%', maxWidth: 700,
              maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div style={{ 
              padding: '20px 24px', 
              background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', 
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>👁️ 저장된 요약 목록</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                  이전에 생성된 가상증빙 요약을 확인합니다
                </p>
              </div>
              <button 
                onClick={() => setShowSummaryListModal(false)}
                style={{ 
                  width: 36, height: 36, background: 'rgba(255,255,255,0.2)', 
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 20
                }}
              >
                ✕
              </button>
            </div>
            
            {/* 모달 내용 */}
            <div style={{ padding: 24, maxHeight: 'calc(80vh - 80px)', overflowY: 'auto' }}>
              {summaryList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                  <p>저장된 요약이 없습니다.</p>
                  <p style={{ fontSize: 13 }}>요약 생성 버튼을 클릭하여 새 요약을 만들어보세요.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {summaryList.map((summary, index) => (
                    <div 
                      key={index}
                      onClick={() => loadSummaryContent(summary.filename)}
                      style={{
                        padding: 16, border: '1px solid #E5E7EB', borderRadius: 12,
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: 'white'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#6366F1';
                        e.currentTarget.style.background = '#F5F3FF';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.background = 'white';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                            📋 {summary.version}
                          </div>
                          <div style={{ fontSize: 12, color: '#6B7280' }}>
                            {new Date(summary.createdAt).toLocaleString('ko-KR')}
                          </div>
                        </div>
                        <div style={{ 
                          padding: '4px 8px', background: '#EEF2FF', 
                          borderRadius: 6, fontSize: 11, color: '#6366F1', fontWeight: 500 
                        }}>
                          {(summary.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 요약 LLM 선택 모달 */}
      {showSummaryLLMModal && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 100, padding: 20 
          }}
          onClick={() => setShowSummaryLLMModal(false)}
        >
          <div 
            style={{ 
              background: 'white', borderRadius: 16, width: '100%', maxWidth: 600,
              maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div style={{ 
              padding: '20px 24px', 
              background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', 
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📋 요약 생성 - LLM 선택</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                  요약 생성에 사용할 LLM을 선택하세요
                </p>
              </div>
              <button 
                onClick={() => setShowSummaryLLMModal(false)}
                style={{ 
                  width: 36, height: 36, background: 'rgba(255,255,255,0.2)', 
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 20
                }}
              >
                ✕
              </button>
            </div>
            
            {/* 모달 내용 */}
            <div style={{ padding: 24, maxHeight: 'calc(80vh - 140px)', overflowY: 'auto' }}>
              {/* Provider 선택 */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                  LLM Provider
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {Object.entries(LLM_PROVIDERS).map(([key, provider]) => (
                    <button
                      key={key}
                      onClick={() => handleProviderChange(key as 'openai' | 'gemini' | 'claude' | 'bedrock')}
                      style={{
                        padding: '12px 8px', border: `2px solid ${llmConfig.provider === key ? provider.color : '#E5E7EB'}`,
                        borderRadius: 8, background: llmConfig.provider === key ? `${provider.color}10` : 'white',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{provider.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: llmConfig.provider === key ? provider.color : '#6B7280' }}>
                        {provider.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Model 선택 */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                  모델 선택
                </label>
                <select
                  value={llmConfig.model}
                  onChange={(e) => setLLMConfig(prev => ({ ...prev, model: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB',
                    borderRadius: 8, fontSize: 14, background: 'white'
                  }}
                >
                  {LLM_PROVIDERS[llmConfig.provider].models.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
              </div>

              {/* Inference Profile 자동 찾기 (Bedrock Claude 4.5 모델용) */}
              {llmConfig.provider === 'bedrock' && needsInferenceProfile && (
                <div style={{ 
                  marginBottom: 20, padding: 16, background: '#FEF3C7', 
                  borderRadius: 8, border: '1px solid #F59E0B' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span>🔐</span>
                    <span style={{ fontWeight: 600, color: '#92400E' }}>Inference Profile 필요</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#92400E', margin: '0 0 12px' }}>
                    이 모델은 Inference Profile이 필요합니다. 시스템 정의 프로필을 자동으로 찾습니다.
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={llmConfig.autoCreateInferenceProfile || false}
                      onChange={(e) => setLLMConfig(prev => ({ ...prev, autoCreateInferenceProfile: e.target.checked }))}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ fontSize: 14, color: '#92400E' }}>시스템 정의 Inference Profile 자동 찾기</span>
                  </label>
                </div>
              )}

              {/* API Key 입력 (OpenAI, Gemini, Claude) */}
              {llmConfig.provider !== 'bedrock' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                    API Key
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={llmConfig.apiKey || ''}
                      onChange={(e) => setLLMConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder={`${LLM_PROVIDERS[llmConfig.provider].name} API Key`}
                      style={{
                        width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #D1D5DB',
                        borderRadius: 8, fontSize: 14
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: 18
                      }}
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              )}

              {/* AWS Bedrock 설정 */}
              {llmConfig.provider === 'bedrock' && (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                      AWS Region
                    </label>
                    <input
                      type="text"
                      value={llmConfig.awsRegion || ''}
                      onChange={(e) => setLLMConfig(prev => ({ ...prev, awsRegion: e.target.value }))}
                      placeholder="ap-northeast-2"
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB',
                        borderRadius: 8, fontSize: 14
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                      AWS Access Key ID
                    </label>
                    <input
                      type="text"
                      value={llmConfig.awsAccessKeyId || ''}
                      onChange={(e) => setLLMConfig(prev => ({ ...prev, awsAccessKeyId: e.target.value }))}
                      placeholder="AWS Access Key ID"
                      style={{
                        width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB',
                        borderRadius: 8, fontSize: 14
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                      AWS Secret Access Key
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showAwsSecretKey ? 'text' : 'password'}
                        value={llmConfig.awsSecretAccessKey || ''}
                        onChange={(e) => setLLMConfig(prev => ({ ...prev, awsSecretAccessKey: e.target.value }))}
                        placeholder="AWS Secret Access Key"
                        style={{
                          width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #D1D5DB',
                          borderRadius: 8, fontSize: 14
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAwsSecretKey(!showAwsSecretKey)}
                        style={{
                          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', fontSize: 18
                        }}
                      >
                        {showAwsSecretKey ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 모달 푸터 */}
            <div style={{ 
              padding: '16px 24px', borderTop: '1px solid #E5E7EB',
              display: 'flex', justifyContent: 'flex-end', gap: 12
            }}>
              <button
                onClick={() => setShowSummaryLLMModal(false)}
                style={{
                  padding: '10px 20px', fontSize: 14, fontWeight: 600,
                  background: '#F3F4F6', color: '#374151', border: 'none',
                  borderRadius: 8, cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={generateSummary}
                style={{
                  padding: '10px 20px', fontSize: 14, fontWeight: 600,
                  background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                  color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer'
                }}
              >
                📋 요약 생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 요약 모달 */}
      {showSummaryModal && (
        <div 
          style={{ 
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 100, padding: 20 
          }}
          onClick={() => setShowSummaryModal(false)}
        >
          <div 
            style={{ 
              width: '100%', maxWidth: 800, maxHeight: '90vh', background: 'white', 
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
                <div style={{ fontSize: 18, fontWeight: 700 }}>📋 가상증빙예제 요약</div>
                {summaryInfo && (
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                    버전: {summaryInfo.version} | {summaryInfo.itemCount}개 항목 | {summaryInfo.provider}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowSummaryModal(false)}
                style={{ 
                  width: 36, height: 36, background: 'rgba(255,255,255,0.2)', 
                  border: 'none', borderRadius: '50%', color: 'white', 
                  fontSize: 20, cursor: 'pointer', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center' 
                }}
              >×</button>
            </div>
            
            {/* 콘텐츠 */}
            <div style={{ padding: 24, maxHeight: 'calc(90vh - 140px)', overflow: 'auto' }}>
              <div 
                style={{ 
                  fontSize: 14, 
                  color: '#1C1E21', 
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap'
                }}
                dangerouslySetInnerHTML={createMarkdownHtml(summaryContent)}
              />
            </div>
            
            {/* 푸터 */}
            <div style={{ 
              padding: '12px 20px', background: '#F0F2F5', borderTop: '1px solid #E4E6EB', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(summaryContent);
                  alert('요약 내용이 클립보드에 복사되었습니다.');
                }}
                style={{ 
                  padding: '10px 20px', fontSize: 14, fontWeight: 600, 
                  color: '#6366F1', background: 'white', 
                  border: '1px solid #6366F1', borderRadius: 8, cursor: 'pointer' 
                }}
              >
                📋 복사
              </button>
              <button 
                onClick={() => setShowSummaryModal(false)}
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
    </AdminLayout>
  );
}
