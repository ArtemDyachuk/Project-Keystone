/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Basic optimizations
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;