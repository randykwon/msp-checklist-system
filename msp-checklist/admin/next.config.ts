import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  turbopack: {
    // Empty turbopack config to silence the warning
  }
}

export default nextConfig