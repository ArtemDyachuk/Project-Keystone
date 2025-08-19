/**
 * Simple configuration for the CMS frontend
 */
export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  mongodbUri: process.env.MONGODB_URI,
};