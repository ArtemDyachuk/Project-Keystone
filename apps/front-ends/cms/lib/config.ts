/**
 * Environment-based configuration for the CMS frontend
 */

export const config = {
  // API Base URL - backend service URL
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  
  // MongoDB connection (direct database access for simple operations)
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/keystone',
  
  // Environment flags
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Server port
  port: process.env.PORT || 3000,
};

/**
 * Get full API URL for a specific endpoint
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = config.apiBaseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Get health check URL
 */
export function getHealthCheckUrl(): string {
  return getApiUrl('/api/health');
}

/**
 * Get database status URL  
 */
export function getDatabaseStatusUrl(): string {
  return getApiUrl('/api/database/status');
}

/**
 * Debug configuration (development only)
 */
export function debugConfig() {
  if (config.isDevelopment) {
    console.log('🔍 CMS Configuration Debug:');
    console.log('  Environment:', process.env.NODE_ENV);
    console.log('  API Base URL:', config.apiBaseUrl);
    console.log('  Is Production:', config.isProduction);
    console.log('  MongoDB URI:', config.mongodbUri ? 'Set' : 'Not set');
  }
}