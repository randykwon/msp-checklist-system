/** @type {import('next').NextConfig} */
const nextConfig = {
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
  },
  
  // 웹팩 설정
  webpack: (config) => {
    // 외부 패키지 설정
    if (config.externals) {
      config.externals.push('better-sqlite3');
    }
    
    return config
  }
}

module.exports = nextConfig
