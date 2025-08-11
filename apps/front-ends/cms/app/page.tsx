import styles from './page.module.css';
import { getHealthCheckUrl } from '../lib/config';

export default function HomePage() {
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
              <p><strong>Status:</strong> <span className={styles.loading}>Loading...</span></p>
              <p><strong>Connected:</strong> <span className={styles.loading}>Checking...</span></p>
              <div id="db-status" className={styles.loading}>
                {/* Database status will be loaded client-side */}
              </div>
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