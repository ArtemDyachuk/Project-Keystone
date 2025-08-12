import styles from './page.module.css';
import { config } from '../lib/config';
import ConnectionTest from './components/ConnectionTest';
import { TenantService, connectToDatabase } from '@keystone/database';

export default async function HomePage() {
  // Server-side data fetching using shared TenantService
  let serverSideData = {
    success: false,
    tenantCount: 0,
    responseTime: 0,
    error: null as string | null
  };

  const startTime = Date.now();
  try {
    // Connect to database and fetch data using shared service
    await connectToDatabase();
    const tenants = await TenantService.getAllTenants();

    serverSideData = {
      success: true,
      tenantCount: tenants.length,
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
      <main className={styles.main}>
        <h1 className={styles.title}>
          🏗️ Project Keystone CMS
        </h1>

        <p className={styles.description}>
          Multi-tenant CMS built with <strong>Turborepo</strong>, <strong>Next.js</strong>, and <strong>NestJS</strong>
        </p>

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
            <h2>🚀 Quick Links</h2>
            <ul className={styles.links}>
              <li><a href="/ui-test">UI Components Test</a></li>
              <li><a href="/api/database/status" target="_blank">API: Database Status</a></li>
              <li><a href={`${config.apiBaseUrl}/api/health`} target="_blank">API: Health Check</a></li>
            </ul>
          </div>

          <div className={styles.card}>
            <h2>🏗️ Architecture</h2>
            <p>Frontend (Vercel) → Backend (Render.com) → MongoDB Atlas</p>
            <ul className={styles.features}>
              <li>✅ Turborepo monorepo</li>
              <li>✅ Shared database package</li>
              <li>✅ Shared UI components</li>
              <li>✅ TypeScript everywhere</li>
            </ul>
          </div>

          <div className={styles.card}>
            <h2>📝 Development</h2>
            <pre className={styles.code}>
              npm run dev          # Start all services{'\n'}
              npm run dev:cms      # Frontend only{'\n'}
              npm run dev:cms-api  # Backend only{'\n'}
              npm run build        # Build everything
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}