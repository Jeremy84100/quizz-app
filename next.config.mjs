/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  // Configuration pour supporter les gros fichiers
  serverRuntimeConfig: {
    maxFileSize: 20 * 1024 * 1024, // 20MB
  },
  // Configuration pour les API routes
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
}

export default nextConfig
