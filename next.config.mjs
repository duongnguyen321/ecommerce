import bundle from '@next/bundle-analyzer';
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  env: {
    MAIN_URL: process.env.MAIN_URL,
    SERVER_URL: process.env.SERVER_URL,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
  experimental: {
    nextScriptWorkers: true,
    cssChunking: 'strict',
    middlewarePrefetch: 'strict',
    optimisticClientCache: true,
    optimizePackageImports: [
      '@heroicons/react',
      '@heroui/react',
      'framer-motion',
      'highlight.js',
      'aos',
      'clsx',
      'tailwind-variants',
    ],
  },
};

const withBundleAnalyzer = bundle({
  enabled: process.env.ANALYZE === 'true',
  analyzerMode: 'static',
  logLevel: 'info',
  openAnalyzer: false,
});

export default withBundleAnalyzer(nextConfig);
