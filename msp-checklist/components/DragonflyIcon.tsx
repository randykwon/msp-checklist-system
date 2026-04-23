interface DragonflyIconProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function DragonflyIcon({ 
  width = 40, 
  height = 40, 
  className = "text-blue-600" 
}: DragonflyIconProps) {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 100 100" 
      className={className}
      fill="currentColor"
    >
      {/* 잠자리 몸통 - 더 자연스러운 형태 */}
      <ellipse cx="50" cy="50" rx="2.5" ry="28" fill="currentColor" />
      
      {/* 상단 날개 - 더 큰 날개 */}
      <ellipse 
        cx="32" 
        cy="32" 
        rx="15" 
        ry="10" 
        fill="currentColor" 
        opacity="0.8" 
        transform="rotate(-25 32 32)" 
      />
      <ellipse 
        cx="68" 
        cy="32" 
        rx="15" 
        ry="10" 
        fill="currentColor" 
        opacity="0.8" 
        transform="rotate(25 68 32)" 
      />
      
      {/* 하단 날개 - 작은 날개 */}
      <ellipse 
        cx="35" 
        cy="58" 
        rx="12" 
        ry="7" 
        fill="currentColor" 
        opacity="0.6" 
        transform="rotate(-20 35 58)" 
      />
      <ellipse 
        cx="65" 
        cy="58" 
        rx="12" 
        ry="7" 
        fill="currentColor" 
        opacity="0.6" 
        transform="rotate(20 65 58)" 
      />
      
      {/* 머리 - 더 큰 머리 */}
      <circle cx="50" cy="22" r="5" fill="currentColor" />
      
      {/* 눈 */}
      <circle cx="48" cy="20" r="1.5" fill="white" opacity="0.9" />
      <circle cx="52" cy="20" r="1.5" fill="white" opacity="0.9" />
      
      {/* 더듬이 */}
      <line x1="47" y1="18" x2="45" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="53" y1="18" x2="55" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* 꼬리 끝 */}
      <circle cx="50" cy="78" r="2" fill="currentColor" opacity="0.8" />
      
      {/* 날개 무늬 */}
      <ellipse cx="32" cy="32" rx="8" ry="4" fill="white" opacity="0.2" transform="rotate(-25 32 32)" />
      <ellipse cx="68" cy="32" rx="8" ry="4" fill="white" opacity="0.2" transform="rotate(25 68 32)" />
    </svg>
  );
}