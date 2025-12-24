import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack 완전 비활성화
  experimental: {
    turbo: undefined,
    // serverExternalPackages 제거 (Next.js 14 호환성)
  },
  
  // 빌드 최적화
  swcMinify: true,
  
  // 정적 생성 최적화
  output: 'standalone',
  
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
  
  // 웹팩 설정
  webpack: (config: any) => {
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

export default nextConfig
