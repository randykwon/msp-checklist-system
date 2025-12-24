import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Turbopack 완전 비활성화
  experimental: {
    turbo: undefined,
  },
  
  // 빌드 최적화
  swcMinify: true,
  output: 'standalone',
  
  // 이미지 최적화 비활성화
  images: {
    unoptimized: true
  },
  
  // TypeScript/ESLint 오류 무시
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
}

export default nextConfig
