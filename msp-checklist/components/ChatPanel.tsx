'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
}

type LLMProvider = 'bedrock' | 'claude' | 'openai' | 'gemini';

const PROVIDERS: { key: LLMProvider; label: string; icon: string; needsKey: boolean }[] = [
  { key: 'bedrock', label: 'AWS Bedrock', icon: '☁️', needsKey: false },
  { key: 'claude', label: 'Claude', icon: '🟣', needsKey: true },
  { key: 'openai', label: 'OpenAI', icon: '🟢', needsKey: true },
  { key: 'gemini', label: 'Gemini', icon: '🔵', needsKey: true },
];

interface ChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  assessmentType?: 'prerequisites' | 'technical';
  context?: { id?: string; category?: string; title?: string; met?: boolean | null };
}

export default function ChatPanel({ isOpen, onToggle, assessmentType, context }: ChatPanelProps) {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<LLMProvider>('bedrock');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Hydration guard + load saved settings
  useEffect(() => {
    setIsHydrated(true);
    try {
      const saved = localStorage.getItem('chat-api-keys');
      if (saved) setApiKeys(JSON.parse(saved));
      const savedProvider = localStorage.getItem('chat-provider') as LLMProvider;
      if (savedProvider) setProvider(savedProvider);
    } catch {}
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !showSettings) inputRef.current?.focus();
  }, [isOpen, showSettings]);

  const saveApiKey = (p: string, key: string) => {
    const updated = { ...apiKeys, [p]: key };
    setApiKeys(updated);
    localStorage.setItem('chat-api-keys', JSON.stringify(updated));
  };

  const selectProvider = (p: LLMProvider) => {
    setProvider(p);
    localStorage.setItem('chat-provider', p);
  };

  const currentProvider = PROVIDERS.find(p => p.key === provider)!;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // Check API key for non-bedrock providers
    if (currentProvider.needsKey && !apiKeys[provider]) {
      setShowSettings(true);
      return;
    }

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context,
          provider,
          language,
          apiKey: currentProvider.needsKey ? apiKeys[provider] : undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages([...newMessages, {
        role: 'assistant', content: data.content,
        provider: data.provider, model: data.model,
      }]);
    } catch (e: any) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: `⚠️ ${e.message}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Settings Panel
  const renderSettings = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--theme-text-primary)' }}>
        {language === 'ko' ? '⚙️ LLM 설정' : '⚙️ LLM Settings'}
      </h3>

      {PROVIDERS.map(p => (
        <div key={p.key} style={{
          padding: 14,
          marginBottom: 10,
          borderRadius: 12,
          border: provider === p.key ? '2px solid #1877F2' : '1px solid var(--theme-border, #e4e6eb)',
          background: provider === p.key ? 'var(--fb-active-bg, #E7F3FF)' : 'transparent',
          cursor: 'pointer',
        }}
          onClick={() => selectProvider(p.key)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: p.needsKey ? 10 : 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {p.icon} {p.label}
              {!p.needsKey && <span style={{ fontSize: 11, color: '#1877F2', marginLeft: 8 }}>
                {language === 'ko' ? '(서버 설정)' : '(Server config)'}
              </span>}
            </span>
            {provider === p.key && <span style={{ color: '#1877F2', fontWeight: 700 }}>✓</span>}
          </div>

          {p.needsKey && (
            <div onClick={e => e.stopPropagation()}>
              <input
                type="password"
                value={apiKeys[p.key] || ''}
                onChange={e => saveApiKey(p.key, e.target.value)}
                placeholder={language === 'ko' ? `${p.label} API 키 입력` : `Enter ${p.label} API key`}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 13,
                  border: '1px solid var(--theme-border, #e4e6eb)',
                  borderRadius: 8,
                  background: 'var(--fb-background, #F0F2F5)',
                  color: 'var(--theme-text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {apiKeys[p.key] && (
                <div style={{ fontSize: 11, color: '#10B981', marginTop: 4 }}>
                  ✓ {language === 'ko' ? '키 저장됨 (브라우저 로컬)' : 'Key saved (browser local)'}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <p style={{ fontSize: 11, color: 'var(--theme-text-secondary)', marginTop: 12, lineHeight: 1.5 }}>
        {language === 'ko'
          ? '💡 API 키는 브라우저에만 저장되며 서버에 저장되지 않습니다. Bedrock은 서버 설정을 사용합니다.'
          : '💡 API keys are stored only in your browser. Bedrock uses server-side configuration.'}
      </p>

      <button
        onClick={() => setShowSettings(false)}
        style={{
          width: '100%', marginTop: 16, padding: '10px 0',
          background: 'linear-gradient(135deg, #1877F2, #42A5F5)',
          color: 'white', border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {language === 'ko' ? '✓ 완료' : '✓ Done'}
      </button>
    </div>
  );

  if (!isHydrated) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          position: 'fixed', left: isOpen ? 379 : 0, top: '50%',
          transform: 'translateY(-50%)', zIndex: 1001,
          width: 28, height: 64,
          background: 'linear-gradient(135deg, #1877F2, #42A5F5)',
          border: 'none', borderRadius: '0 8px 8px 0',
          cursor: 'pointer', color: 'white', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          transition: 'left 0.3s ease',
        }}
      >
        {isOpen ? '◀' : '💬'}
      </button>

      {/* Panel */}
      <div style={{
        position: 'fixed', left: isOpen ? 0 : -380, top: 0,
        width: 380, height: '100vh',
        background: 'var(--theme-surface, #fff)',
        borderRight: '1px solid var(--theme-border, #e4e6eb)',
        boxShadow: isOpen ? '4px 0 20px rgba(0,0,0,0.1)' : 'none',
        transition: 'left 0.3s ease', zIndex: 1000,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #1877F2, #42A5F5)',
          color: 'white', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {language === 'ko' ? 'MSP 어드바이저' : 'MSP Advisor'}
                </div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>
                  {currentProvider.icon} {currentProvider.label}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowSettings(!showSettings)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: 'white', padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
                ⚙️
              </button>
              <button onClick={() => { setMessages([]); }}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: 'white', padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>
                🗑️
              </button>
            </div>
          </div>
        </div>

        {/* Context Breadcrumb */}
        {!showSettings && (
          <div style={{
            padding: '8px 16px', background: 'var(--fb-active-bg, #E7F3FF)',
            fontSize: 12, color: 'var(--fb-primary, #1877F2)',
            borderBottom: '1px solid var(--theme-border, #e4e6eb)', flexShrink: 0,
            lineHeight: 1.5,
          }}>
            📋 {assessmentType === 'prerequisites'
              ? (language === 'ko' ? '사전 요구사항 (15개 항목)' : 'Prerequisites (15 items)')
              : (language === 'ko' ? '기술 검증 (46개 항목)' : 'Technical Validation (46 items)')
            }
            {context?.category && <span> &gt; <b>{context.category}</b></span>}
            {context?.id && <span> &gt; <b>{context.id}</b></span>}
          </div>
        )}

        {showSettings ? renderSettings() : (
          <>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--theme-text-secondary)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                  <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                    {language === 'ko'
                      ? 'MSP 요구사항, 증빙 준비, 평가 절차에 대해 질문하세요.'
                      : 'Ask about MSP requirements, evidence preparation, or assessment process.'}
                  </p>
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(context?.id
                      ? (language === 'ko'
                        ? [`${context.id} 항목의 증빙은 어떻게 준비하나요?`, `${context.title || context.id}에서 가장 중요한 포인트는?`, `이 항목의 모범 사례를 알려주세요`]
                        : [`How to prepare evidence for ${context.id}?`, `Key points for ${context.title || context.id}?`, `Best practices for this item?`])
                      : (language === 'ko'
                        ? ['MSP 프로그램 요구사항을 요약해주세요', '사전 요구사항과 기술 검증의 차이는?', '가장 중요한 평가 항목은?']
                        : ['Summarize MSP program requirements', 'Difference between prerequisites and technical?', 'Most important assessment items?'])
                    ).map((q, i) => (
                      <button key={i} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                        style={{
                          padding: '8px 12px', fontSize: 13,
                          background: 'var(--fb-background, #F0F2F5)',
                          border: '1px solid var(--theme-border, #e4e6eb)',
                          borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                          color: 'var(--theme-text-primary)',
                        }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                  <div style={{ maxWidth: '85%' }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg, #1877F2, #42A5F5)' : 'var(--fb-background, #F0F2F5)',
                      color: msg.role === 'user' ? 'white' : 'var(--theme-text-primary)',
                      fontSize: 14, lineHeight: 1.6, wordBreak: 'break-word',
                    }}>
                      {msg.role === 'assistant' ? (
                        <div className="chat-markdown"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                      ) : msg.content}
                    </div>
                    {msg.role === 'assistant' && msg.model && (
                      <div style={{ fontSize: 10, color: 'var(--theme-text-secondary)', marginTop: 3, paddingLeft: 4 }}>
                        {PROVIDERS.find(p => p.key === msg.provider)?.icon} {msg.model}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div style={{ display: 'flex', marginBottom: 12 }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
                    background: 'var(--fb-background, #F0F2F5)', fontSize: 14,
                    color: 'var(--theme-text-secondary)',
                  }}>
                    <span className="chat-typing">●●●</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '12px 16px', borderTop: '1px solid var(--theme-border, #e4e6eb)',
              flexShrink: 0, display: 'flex', gap: 8, alignItems: 'flex-end',
            }}>
              <textarea
                ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={language === 'ko' ? '질문을 입력하세요...' : 'Type your question...'}
                rows={1}
                style={{
                  flex: 1, padding: '10px 14px', fontSize: 14,
                  border: '1px solid var(--theme-border, #e4e6eb)',
                  borderRadius: 12, resize: 'none', outline: 'none',
                  fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 100,
                  background: 'var(--fb-background, #F0F2F5)',
                  color: 'var(--theme-text-primary)',
                }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 100) + 'px';
                }}
              />
              <button onClick={sendMessage} disabled={!input.trim() || isLoading}
                style={{
                  width: 40, height: 40, borderRadius: '50%', border: 'none',
                  background: input.trim() && !isLoading ? 'linear-gradient(135deg, #1877F2, #42A5F5)' : '#E4E6EB',
                  color: 'white', fontSize: 18,
                  cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                ▶
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
