/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable transpilation of workspace packages
  transpilePackages: ['@keystone/database', '@keystone/ui'],
  
  // Environment variables
  env: {
    // Add any custom environment variables here
  },

  // Experimental features
  experimental: {
    // Enable modern features as needed
  },

  // Output configuration
  output: 'standalone',
};

module.exports = nextConfig;