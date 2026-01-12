/**
 * 간단한 마크다운 파서 - HTML로 변환
 * 지원: 굵은글씨, 이탤릭, 목록, 번호목록, 코드블록, 인라인코드, 헤더, 링크
 * 라이트/다크 모드 모두 지원: inherit 사용으로 부모 요소 색상 상속
 */

export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown;
  
  // 코드 블록 (```...```) - 먼저 처리하여 내부 내용 보호
  // 코드 블록은 항상 어두운 배경 + 밝은 글씨 유지 (가독성)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre style="background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.6; margin: 12px 0; border: 1px solid #475569;"><code style="color: #e2e8f0;">${escapeHtml(code.trim())}</code></pre>`;
  });
  
  // 인라인 코드 (`...`) - 어두운 배경 + 밝은 글씨
  html = html.replace(/`([^`]+)`/g, '<code style="background: #334155; color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; border: 1px solid #475569;">$1</code>');
  
  // 헤더 (## 또는 **헤더**) - inherit 사용
  html = html.replace(/^### (.+)$/gm, '<h4 style="font-size: 16px; font-weight: 700; color: inherit; margin: 20px 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid rgba(128,128,128,0.3);">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="font-size: 18px; font-weight: 700; color: inherit; margin: 24px 0 14px 0; padding-bottom: 10px; border-bottom: 2px solid rgba(128,128,128,0.3);">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 style="font-size: 20px; font-weight: 700; color: inherit; margin: 28px 0 16px 0; padding-bottom: 12px; border-bottom: 3px solid rgba(128,128,128,0.3);">$1</h2>');
  
  // 굵은 글씨 (**text** 또는 __text__) - inherit 사용
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight: 700; color: inherit;">$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong style="font-weight: 700; color: inherit;">$1</strong>');
  
  // 이탤릭 (*text* 또는 _text_)
  html = html.replace(/\*([^*]+)\*/g, '<em style="font-style: italic; color: inherit;">$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em style="font-style: italic; color: inherit;">$1</em>');
  
  // 이모지 헤더 스타일 (🔹, 📋, 💡 등으로 시작하는 굵은 텍스트) - inherit 사용
  html = html.replace(/^((?:🔹|📋|💡|🎯|📊|✅|⚠️|📝|🔍|📁|🗂️|📄|🔧|⚙️|🚀|💾|📌|🎨|🌐|☁️|🔐|🛡️|📈|📉|🔗|📎|🏷️|🔔|💬|📢|🎉|✨|🌟|⭐|🔥|💪|👉|👆|👇|☑️|🔸|🔺|🔻|▶️|◀️|⏩|⏪|🔄|♻️|🔀|🔁|🔂|⏯️|⏸️|⏹️|⏺️|⏭️|⏮️|🎵|🎶|🔊|🔉|🔈|🔇|📻|🎙️|🎚️|🎛️|🎤|🎧|📱|💻|🖥️|🖨️|⌨️|🖱️|🖲️|💽|💾|💿|📀|🧮|🎥|🎬|📹|📼|🔍|🔎|🕯️|💡|🔦|🏮|📔|📕|📖|📗|📘|📙|📚|📓|📒|📃|📜|📄|📰|🗞️|📑|🔖|🏷️|💰|💴|💵|💶|💷|💸|💳|🧾|💹|✉️|📧|📨|📩|📤|📥|📦|📫|📪|📬|📭|📮|🗳️|✏️|✒️|🖋️|🖊️|🖌️|🖍️|📝|💼|📁|📂|🗂️|📅|📆|🗒️|🗓️|📇|📈|📉|📊|📋|📌|📍|📎|🖇️|📏|📐|✂️|🗃️|🗄️|🗑️|🔒|🔓|🔏|🔐|🔑|🗝️|🔨|🪓|⛏️|⚒️|🛠️|🗡️|⚔️|🔫|🪃|🏹|🛡️|🪚|🔧|🪛|🔩|⚙️|🗜️|⚖️|🦯|🔗|⛓️|🪝|🧰|🧲|🪜|⚗️|🧪|🧫|🧬|🔬|🔭|📡|💉|🩸|💊|🩹|🩺|🚪|🛗|🪞|🪟|🛏️|🛋️|🪑|🚽|🪠|🚿|🛁|🪤|🪒|🧴|🧷|🧹|🧺|🧻|🪣|🧼|🪥|🧽|🧯|🛒|🚬|⚰️|🪦|⚱️|🗿|🪧|🏧|🚮|🚰|♿|🚹|🚺|🚻|🚼|🚾|🛂|🛃|🛄|🛅|⚠️|🚸|⛔|🚫|🚳|🚭|🚯|🚱|🚷|📵|🔞|☢️|☣️|⬆️|↗️|➡️|↘️|⬇️|↙️|⬅️|↖️|↕️|↔️|↩️|↪️|⤴️|⤵️|🔃|🔄|🔙|🔚|🔛|🔜|🔝)[^\n]*<strong[^>]*>([^<]+)<\/strong>)/gm, 
    '<div style="font-size: 15px; font-weight: 700; color: inherit; margin: 16px 0 8px 0; display: flex; align-items: center; gap: 6px;">$1</div>');
  
  // 번호 목록 (1. 2. 3. ...)
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display: flex; gap: 10px; margin: 8px 0 8px 8px; align-items: flex-start;"><span style="min-width: 24px; height: 24px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0;">$1</span><span style="flex: 1; line-height: 1.6; color: inherit;">$2</span></div>');
  
  // 불릿 목록 (- 또는 *)
  html = html.replace(/^[-*]\s+(.+)$/gm, '<div style="display: flex; gap: 10px; margin: 6px 0 6px 12px; align-items: flex-start;"><span style="color: #6366f1; font-size: 8px; margin-top: 6px;">●</span><span style="flex: 1; line-height: 1.6; color: inherit;">$1</span></div>');
  
  // 링크 [text](url) - 링크는 항상 파란색 유지
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">$1</a>');
  
  // 수평선 (--- 또는 ***)
  html = html.replace(/^(---|\*\*\*)$/gm, '<hr style="border: none; border-top: 1px solid rgba(128,128,128,0.3); margin: 16px 0;" />');
  
  // 빈 줄을 단락 구분으로 처리
  html = html.replace(/\n\n+/g, '</p><p style="margin: 12px 0; line-height: 1.7; color: inherit;">');
  
  // 단일 줄바꿈은 <br>로
  html = html.replace(/\n/g, '<br />');
  
  // 전체를 p 태그로 감싸기
  html = `<p style="margin: 12px 0; line-height: 1.7; color: inherit;">${html}</p>`;
  
  // 빈 p 태그 제거
  html = html.replace(/<p[^>]*>\s*<\/p>/g, '');
  
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * React 컴포넌트에서 사용할 수 있도록 dangerouslySetInnerHTML용 객체 반환
 */
export function createMarkdownHtml(markdown: string): { __html: string } {
  return { __html: parseMarkdownToHtml(markdown) };
}
