import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 기본 설정
  reactStrictMode: true,
  swcMinify: true,
  
  // 프로덕션 최적화
  output: 'standalone',
  trailingSlash: false,
  
  // 이미지 최적화 (AWS 환경 호환)
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
  
  // 압축 및 최적화
  compress: true,
  poweredByHeader: false,
  
  // 실험적 기능 (CSS 관련 제외)
  experimental: {
    optimizePackageImports: ['lucide-react'],
    turbo: {
      rules: {
        '*.css': {
          loaders: ['css-loader'],
          as: '*.css',
        },
      },
    },
  },
  
  // Webpack 설정 (완전히 새로 작성)
  webpack: (config: any, { isServer, dev }: any) => {
    // CSS 처리를 기본 CSS 로더로만 제한
    config.module.rules.push({
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader'
      ],
    });
    
    // 클라이언트 사이드에서 서버 전용 모듈 제외
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
        os: false,
        events: false,
        url: false,
        querystring: false,
        http: false,
        https: false,
        zlib: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        cluster: false,
        module: false,
        readline: false,
        repl: false,
        vm: false,
        constants: false,
        domain: false,
        punycode: false,
        string_decoder: false,
        sys: false,
        timers: false,
        tty: false,
        dgram: false,
        assert: false,
      };
    }
    
    // 외부 패키지 설정
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    
    // 문제가 있는 모듈들 완전 차단
    config.resolve.alias = {
      ...config.resolve.alias,
      'lightningcss': false,
      '@tailwindcss/postcss': false,
      '@tailwindcss/node': false,
      'tailwindcss': false,
      'postcss': false,
      'autoprefixer': false,
    };
    
    // 네이티브 모듈 무시
    config.module.rules.push({
      test: /\.node$/,
      use: 'ignore-loader'
    });
    
    return config;
  },
  
  // 서버 외부 패키지
  serverExternalPackages: ['better-sqlite3'],
  
  // 헤더 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // TypeScript 설정
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint 설정
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
