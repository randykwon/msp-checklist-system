/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack 완전 비활성화
  experimental: {
    // Turbopack 관련 모든 설정 제거
  },
  
  // 빌드 최적화
  swcMinify: true,
  
  // 이미지 최적화 비활성화 (빌드 속도 향상)
  images: {
    unoptimized: true
  },
  
  // TypeScript 오류 무시
  typescript: {
    ignoreBuildErrors: true
  },
  
  // ESLint 오류 무시
  eslint: {
    ignoreDuringBuilds: true
  },
  
  // 정적 생성 비활성화 (동적 렌더링 강제)
  output: 'standalone',
  
  // 모든 페이지를 동적으로 렌더링
  generateStaticParams: false,
  
  // 웹팩 설정 (Turbopack 대신 Webpack 강제 사용)
  webpack: (config, { dev, isServer }) => {
    // 개발 모드에서 Webpack 사용 강제
    if (dev) {
      config.cache = false;
    }
    
    // PDF.js 워커 파일 처리
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    // PDF.js 관련 설정
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });
    
    // CSS 관련 최적화
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          styles: {
            name: 'styles',
            test: /\.(css|scss|sass)$/,
            chunks: 'all',
            enforce: true,
          },
        },
      },
    }
    
    return config
  }
}

module.exports = nextConfig