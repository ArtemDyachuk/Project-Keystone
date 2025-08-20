import styles from './page.module.css';
import { config } from '../../../../lib/config';
import ConnectionTest from '../../../components/ConnectionTest';
import { connectToDatabase } from '@keystone/database';

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
    // Connect to database - removed tenant count for security
    // In multi-tenant systems, public pages should not expose tenant information
    await connectToDatabase();

    serverSideData = {
      success: true,
      tenantCount: 0, // Hidden for security in multi-tenant system
      responseTime: Date.now() - startTime,
      error: null
    };
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
          <h2>🗄️ Server-Side Database Test</h2>
          <p>Direct database access from server component using shared TenantService:</p>
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
              💡 This data was fetched on the server using the shared @keystone/database package
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
