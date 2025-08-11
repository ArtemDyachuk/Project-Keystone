/**
 * Environment-based configuration for the CMS frontend
 */

export const config = {
  // API Base URL - automatically detects Railway backend or falls back to localhost
  apiBaseUrl: (() => {
    // Priority 1: Explicit API URL (for custom configurations)
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }
    
    // Priority 2: Railway internal networking (for private services in same project)
    // This is the most reliable way for frontend to reach backend in Railway
    if (process.env.RAILWAY_STATIC_URL) {
      // Extract the project domain and construct internal backend URL
      const staticUrl = process.env.RAILWAY_STATIC_URL;
      const projectDomain = staticUrl.replace('https://', '').replace('http://', '');
      
      // Try to construct the internal backend URL
      // Railway internal networking uses .railway.internal domain
      const internalBackendUrl = `http://cms-api.${projectDomain.split('.').slice(1).join('.')}`;
      
      console.log('🔍 Constructed internal backend URL:', internalBackendUrl);
      return internalBackendUrl;
    }
    
    // Priority 3: Railway service discovery (automatic)
    if (process.env.RAILWAY_SERVICE_URL) {
      return process.env.RAILWAY_SERVICE_URL;
    }
    
    // Priority 4: Local development fallback
    return 'http://localhost:3001';
  })(),
  
  // Environment detection
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Database configuration
  mongodbUri: process.env.MONGODB_URI,
  
  // Port configuration
  port: process.env.PORT || 3000,
  
  // Connection types explanation
  connections: {
    // Direct database connection (via @keystone/database package)
    database: 'Direct MongoDB connection for simple operations',
    // Backend API connection (for business logic, CRUD operations)
    backend: 'HTTP API calls to NestJS backend service'
  },
  
  // Railway-specific environment variables
  railwayEnvironment: {
    staticUrl: process.env.RAILWAY_STATIC_URL,
    serviceUrl: process.env.RAILWAY_SERVICE_URL,
    publicUrl: process.env.RAILWAY_PUBLIC_URL,
  }
};

/**
 * Get the full API URL for a specific endpoint
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = config.apiBaseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Get the health check API URL
 */
export function getHealthCheckUrl(): string {
  return getApiUrl('/api/health');
}

/**
 * Get the database status API URL
 */
export function getDatabaseStatusUrl(): string {
  return getApiUrl('/api/database/status');
}

/**
 * Debug configuration (for troubleshooting)
 */
export function debugConfig() {
  console.log('🔍 CMS Configuration Debug:');
  console.log('  Environment:', process.env.NODE_ENV);
  console.log('  API Base URL:', config.apiBaseUrl);
  console.log('  Is Production:', config.isProduction);
  console.log('  Railway Static URL:', config.railwayEnvironment.staticUrl);
  console.log('  Railway Service URL:', config.railwayEnvironment.serviceUrl);
  console.log('  Railway Public URL:', config.railwayEnvironment.publicUrl);
  console.log('  All Railway Env Vars:', Object.keys(process.env).filter(key => key.startsWith('RAILWAY_')));
}

/**
 * Test backend connectivity
 */
export async function testBackendConnectivity() {
  const healthUrl = getHealthCheckUrl();
  console.log('🧪 Testing backend connectivity to:', healthUrl);
  
  try {
    const response = await fetch(healthUrl, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend connection successful:', data);
      return { success: true, data };
    } else {
      console.log('❌ Backend responded with error:', response.status, response.statusText);
      return { success: false, status: response.status, statusText: response.statusText };
    }
  } catch (error) {
    console.log('❌ Backend connection failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
