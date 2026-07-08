import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: resolve(__dirname, '..'),
  },
  reactStrictMode: true,
  compress: true,
  typescript: {
    tsconfigPath: './tsconfig.typecheck.json',
  },
  // Never bundle these on the server — they rely on native bindings or
  // load files from disk at require-time which breaks under Next.js bundling.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  // Increase body size limit for file uploads (default is 1MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
    // Tree-shake heavy libraries automatically
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-tabs',
      '@radix-ui/react-popover',
      '@radix-ui/react-slot',
      'recharts',
      'date-fns',
      'framer-motion',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.desmos.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com",
              "font-src 'self' data: https:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https: wss:",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
