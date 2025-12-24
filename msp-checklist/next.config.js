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
  
  // 웹팩 설정 (Turbopack 대신 Webpack 강제 사용)
  webpack: (config, { dev, isServer }) => {
    // 개발 모드에서 Webpack 사용 강제
    if (dev) {
      config.cache = false;
    }
    
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