import styles from './page.module.css';

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
            <h2>🚀 Quick Start</h2>
            <p>Get started with your multi-tenant CMS:</p>
            <ul className={styles.features}>
              <li>📝 <a href="/login">Sign in</a> to access your dashboard</li>
              <li>🏢 <a href="/signup">Create an account</a> to get started</li>
              <li>⚙️ <a href="/settings">Access settings</a> once authenticated</li>
            </ul>
          </div>

          <div className={styles.card}>
            <h2>🏗️ Architecture</h2>
            <p>Modern, scalable architecture:</p>
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