// next.config.js
const withNextIntl = require('next-intl/plugin')('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // ✅ New format (Next.js 14+)
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
    ],
    // For local dev with unoptimized images
    unoptimized: true,
  },
  // Silence Turbopack root warning (optional)
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Silence deprecation warning
    middleware: true,
  },
};

module.exports = withNextIntl(nextConfig);