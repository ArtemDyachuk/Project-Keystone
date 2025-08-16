import styles from "./page.module.css";

export default function FirebaseAuthTestPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Firebase Authentication Test</h1>
        <p className={styles.description}>
          Test the new Firebase-based authentication system
        </p>

        <div className={styles.section}>
          <h2>🚀 Test Firebase Authentication</h2>
          <p>Use these forms to test the new Firebase authentication:</p>
          
          <div className={styles.buttonGroup}>
            <a href="/signup" className={styles.button}>
              📝 Test Signup
            </a>
            <a href="/login" className={styles.button}>
              🔐 Test Login
            </a>
          </div>
        </div>

        <div className={styles.section}>
          <h2>✅ What's Working</h2>
          <ul className={styles.checklist}>
            <li>✅ Firebase project configured</li>
            <li>✅ Environment variables set</li>
            <li>✅ Firebase forms created</li>
            <li>✅ Signup/login pages updated</li>
            <li>⚠️ Test user creation</li>
            <li>⚠️ Test user authentication</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>🔧 Firebase Console</h2>
          <p>Check your Firebase project to see created users:</p>
          <a 
            href="https://console.firebase.google.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.link}
          >
            Open Firebase Console
          </a>
        </div>

        <div className={styles.section}>
          <h2>🏢 Multi-Tenancy Test</h2>
          <p>Test Firebase multi-tenancy with custom claims:</p>
          <a href="/firebase-multi-tenant-test" className={styles.button}>
            🏢 Test Multi-Tenancy
          </a>
        </div>

        <div className={styles.footer}>
          <p>
            <a href="/" className={styles.homeLink}>← Back to Home</a>
          </p>
        </div>
      </div>
    </div>
  );
}
