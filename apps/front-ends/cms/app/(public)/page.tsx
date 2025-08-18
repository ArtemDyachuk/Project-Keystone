import styles from './page.module.css';

export default async function HomePage() {
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
            <h2>🚀 Get Started</h2>
            <p>Ready to manage your content? Sign in to access your dashboard.</p>
            <div style={{ marginTop: '1rem' }}>
              <a href="/login" className={styles.button}>
                Sign In
              </a>
            </div>
          </div>

          <div className={styles.card}>
            <h2>🔐 Secure & Multi-Tenant</h2>
            <p>Built with enterprise-grade security and multi-tenancy support.</p>
            <ul className={styles.features}>
              <li>✅ Firebase Authentication</li>
              <li>✅ Multi-tenant isolation</li>
              <li>✅ Role-based access control</li>
              <li>✅ Server-side sessions</li>
            </ul>
          </div>

          <div className={styles.card}>
            <h2>🏗️ Architecture</h2>
            <p>Modern tech stack for scalable content management.</p>
            <ul className={styles.features}>
              <li>✅ Turborepo monorepo</li>
              <li>✅ Next.js frontend</li>
              <li>✅ NestJS backend</li>
              <li>✅ MongoDB database</li>
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