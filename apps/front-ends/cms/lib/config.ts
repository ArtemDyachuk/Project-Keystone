/**
 * Simple configuration for the CMS frontend
 */
export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL!,
  mongodbUri: process.env.MONGODB_URI,
};