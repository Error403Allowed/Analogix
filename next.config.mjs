import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Increase body size limit for file uploads (default is 1MB)
  // This affects server actions
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  turbopack: {
    // Tell Next.js the project root is here, not the home directory.
    // Fixes: "detected multiple lockfiles" warning.
    root: __dirname,
  },
};

export default nextConfig;
