import styles from './page.module.css';
import { getHealthCheckUrl, debugConfig } from '../lib/config';

async function getDatabaseStatus() {
  try {
    // Debug configuration in development
    if (process.env.NODE_ENV === 'development') {
      debugConfig();
    }
    
    const apiUrl = getHealthCheckUrl();
    console.log('🔍 Fetching database status from:', apiUrl);
    
    // Direct API call to backend
    const response = await fetch(apiUrl, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch database status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching database status:', error);
    return {
      status: 'error',
      database: { connected: false, initialized: false },
      error: 'Failed to check database status'
    };
  }
}

export default async function HomePage() {
  const dbStatus = await getDatabaseStatus();
  
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
          <div className={styles.card}>
            <h2>📊 Database Status</h2>
            <div className={styles.status}>
              <p><strong>Status:</strong> <span className={dbStatus.status === 'ok' ? styles.success : styles.error}>{dbStatus.status}</span></p>
              <p><strong>Connected:</strong> {dbStatus.database?.connected ? '✅ Yes' : '❌ No'}</p>
              {dbStatus.error && (
                <p><strong>Error:</strong> <span className={styles.error}>{dbStatus.error}</span></p>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h2>🚀 Quick Links</h2>
            <ul className={styles.links}>
              <li><a href="/ui-test">UI Components Test</a></li>
              <li><a href="/api/database/status" target="_blank">API: Database Status</a></li>
              <li><a href={getHealthCheckUrl()} target="_blank">API: Health Check</a></li>
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