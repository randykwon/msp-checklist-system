/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router만 사용
  experimental: {
    // Turbopack 비활성화
    turbo: undefined,
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
  
  // standalone 출력
  output: 'standalone',
  
  // 웹팩 설정
  webpack: (config, { dev, isServer }) => {
    // 개발 모드에서 Webpack 사용 강제
    if (dev) {
      config.cache = false;
    }
    
    // 클라이언트 사이드 폴백 설정
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    return config
  }
}

module.exports = nextConfig