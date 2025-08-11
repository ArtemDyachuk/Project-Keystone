const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@keystone/database', '@keystone/ui'],
  outputFileTracingRoot: path.join(__dirname, "../../../"),
};

module.exports = nextConfig;