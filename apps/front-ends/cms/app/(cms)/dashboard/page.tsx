import styles from "./dashboard.module.css";
import { getCurrentUserServer } from "@/lib/sessions/server";

// Force dynamic rendering since layout uses cookies
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Fetch real session data via server-side cookie forwarding
  let userData = null as any;
  let error = null as any;

  try {
    userData = await getCurrentUserServer();
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Welcome to your CMS dashboard</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>📊 Analytics</h3>
          <p className={styles.cardContent}>View your site statistics and performance metrics.</p>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Total Views</span>
            <span className={styles.metricValue}>12,345</span>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>👥 Users</h3>
          <p className={styles.cardContent}>Manage user accounts and permissions.</p>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Active Users</span>
            <span className={styles.metricValue}>8</span>
          </div>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>⚙️ System Health</h3>
          <p className={styles.cardContent}>Monitor system performance and status.</p>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Status</span>
            <span className={`${styles.metricValue} ${styles.statusGood}`}>Healthy</span>
          </div>
        </div>
      </div>

      {/* Real Session Data Display */}
      <div className={styles.sessionData}>
        <h2 className={styles.sessionTitle}>🔐 Session Data (Debug)</h2>
        <div className={styles.sessionInfo}>
          <p><strong>Note:</strong> This shows your current session data. In production, remove this section.</p>
          <div className={styles.sessionDebug}>
            {error ? (
              <pre className={styles.jsonDisplay}>
                {JSON.stringify({
                  error: "Failed to fetch session data",
                  message: error,
                  timestamp: new Date().toISOString(),
                }, null, 2)}
              </pre>
            ) : userData ? (
              <pre className={styles.jsonDisplay}>
                {JSON.stringify({
                  message: "✅ Real session data loaded successfully",
                  user: {
                    uid: userData.uid,
                    email: userData.email,
                    displayName: userData.displayName,
                    emailVerified: userData.emailVerified,
                    tenantId: userData.tenantId,
                    roles: userData.roles,
                  },
                  timestamp: new Date().toISOString(),
                }, null, 2)}
              </pre>
            ) : (
              <pre className={styles.jsonDisplay}>
                {JSON.stringify({
                  message: "❌ No session data found",
                  note: "You may not be logged in or session has expired",
                  timestamp: new Date().toISOString(),
                }, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
