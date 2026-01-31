/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  // Tree-shake wagmi/viem so dev server and bundle stay light
  experimental: {
    optimizePackageImports: ['wagmi', 'viem', '@tanstack/react-query'],
  },
  webpack: (config, { dev }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      // Stub optional deps so wagmi/connectors don't pull in React Native or pino-pretty (stops build warnings + OOM)
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    // Frontend no longer imports from contracts/ — ignore entire contracts dir (stops dev server from dying)
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules/**', path.join(__dirname, '../contracts/**')],
      };
    }
    return config;
  },
};

module.exports = nextConfig;
