import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable Gzip and Brotli compression for all text/html/js/css responses
  compress: true,

  // Strip x-powered-by header to save bandwidth and improve security
  poweredByHeader: false,

  // Modern lightweight image optimization (AVIF / WebP)
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache for optimized images
  },

  // Tree-shake large client libraries (reduces JS bundle size significantly)
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'clsx', 'tailwind-merge'],
  },

  // Aggressive HTTP caching headers for immutable assets and DNS prefetching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
