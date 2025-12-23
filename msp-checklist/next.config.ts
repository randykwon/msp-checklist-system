import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버 배포용 설정 - standalone으로 API 라우트 지원
  output: 'standalone',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // Turbopack 설정 (빈 객체로 경고 해결)
  turbopack: {},
  
  webpack: (config: any) => {
    // PDF.js 워커 파일을 위한 설정
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    
    // Node.js 모듈을 클라이언트에서 제외
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    
    return config;
  },
  
  serverExternalPackages: ['better-sqlite3']
};

export default nextConfig;
