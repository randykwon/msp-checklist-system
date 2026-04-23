import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
  webpack: (config: any, { isServer }: any) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false, path: false, crypto: false, stream: false, util: false,
        buffer: false, process: false, os: false, events: false, url: false,
        querystring: false, http: false, https: false, zlib: false, net: false,
        tls: false, child_process: false, dns: false, cluster: false,
        module: false, readline: false, repl: false, vm: false, constants: false,
        domain: false, punycode: false, string_decoder: false, sys: false,
        timers: false, tty: false, dgram: false, assert: false,
      };
    }
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    return config;
  },
  serverExternalPackages: ['better-sqlite3']
};

export default nextConfig;
