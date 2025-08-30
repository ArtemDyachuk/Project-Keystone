import styles from './page.module.css';
import { config } from '../../../../lib/config';
import ConnectionTest from '../../../components/ConnectionTest';

export default async function SystemStatusPage() {
  // Server-side data fetching using shared TenantService
  let serverSideData = {
    success: false,
    tenantCount: 0,
    responseTime: 0,
    error: null as string | null
  };

  const startTime = Date.now();
  try {
    // Test backend API connection instead of direct database access
    const response = await fetch(`${config.apiBaseUrl}/api/health`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (response.ok) {
      serverSideData = {
        success: true,
        tenantCount: 0, // Hidden for security in multi-tenant system
        responseTime: Date.now() - startTime,
        error: null
      };
    } else {
      throw new Error(`Backend API returned ${response.status}`);
    }
  } catch (error) {
    serverSideData = {
      success: false,
      tenantCount: 0,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📊 System Status</h1>
      
      <div className={styles.grid}>
        {/* Server-side data fetching result */}
        <div className={styles.card}>
          <h2>🗄️ Backend API Connection Test</h2>
          <p>Testing connection to the backend API:</p>
          <div style={{
            padding: '1rem',
            backgroundColor: serverSideData.success ? '#f0f9ff' : '#fef2f2',
            borderRadius: '4px',
            border: `1px solid ${serverSideData.success ? '#0ea5e9' : '#ef4444'}`,
            marginTop: '0.5rem'
          }}>
            <p><strong>Status:</strong> {serverSideData.success ? '✅ Success' : '❌ Failed'}</p>
            <p><strong>Tenant Count:</strong> {serverSideData.tenantCount}</p>
            <p><strong>Response Time:</strong> {serverSideData.responseTime}ms</p>
            {serverSideData.error && (
              <p style={{ color: '#ef4444' }}><strong>Error:</strong> {serverSideData.error}</p>
            )}
            <small style={{ color: '#6b7280' }}>
              💡 This data was fetched by testing the backend API connection
            </small>
          </div>
        </div>

        <ConnectionTest serverData={serverSideData} />

        <div className={styles.card}>
          <h2>🔗 Quick Links</h2>
          <ul className={styles.links}>
            <li><a href="/api/database/status" target="_blank">API: Database Status</a></li>
            <li><a href={`${config.apiBaseUrl}/api/health`} target="_blank">API: Health Check</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
