import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Never bundle these on the server — they rely on native bindings or
  // load files from disk at require-time which breaks under Next.js bundling.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  // Increase body size limit for file uploads (default is 1MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
