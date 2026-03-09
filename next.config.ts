import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // EdgeOne Pages 使用默认输出模式
  // output: "standalone", // 移除，EdgeOne不支持standalone

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // 实验性功能 - 支持Edge Runtime
  experimental: {
    serverComponentsExternalPackages: ['@libsql/client'],
  },
};

export default nextConfig;
