import Link from "next/link";
import styles from "./page.module.css";

export default function SystemPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>System Administration</h1>
        <p>Tools and utilities for system management and testing</p>
      </div>

      <div className={styles.sections}>
        <div className={styles.section}>
          <h2>🔐 RBAC Testing & Monitoring</h2>
          <p>Test and monitor the Role-Based Access Control system</p>

          <div className={styles.tools}>
            <Link href="/system/rbac/performance" className={styles.toolCard}>
              <div className={styles.toolIcon}>🚀</div>
              <div className={styles.toolContent}>
                <h3>Performance Testing</h3>
                <p>Measure RBAC operation performance and throughput</p>
                <ul>
                  <li>Permission check speed</li>
                  <li>Role validation performance</li>
                  <li>Scalability testing</li>
                </ul>
              </div>
            </Link>

            <Link href="/system/rbac/security" className={styles.toolCard}>
              <div className={styles.toolIcon}>🔒</div>
              <div className={styles.toolContent}>
                <h3>Security Testing</h3>
                <p>Comprehensive security validation of access controls</p>
                <ul>
                  <li>Permission boundary testing</li>
                  <li>Role escalation prevention</li>
                  <li>Edge case validation</li>
                </ul>
              </div>
            </Link>
          </div>
        </div>

        <div className={styles.section}>
          <h2>📊 System Health</h2>
          <p>Monitor system performance and health metrics</p>

          <div className={styles.tools}>
            <div className={styles.toolCard}>
              <div className={styles.toolIcon}>📈</div>
              <div className={styles.toolContent}>
                <h3>Performance Metrics</h3>
                <p>Real-time system performance monitoring</p>
                <span className={styles.comingSoon}>Coming Soon</span>
              </div>
            </div>

            <div className={styles.toolCard}>
              <div className={styles.toolIcon}>🔍</div>
              <div className={styles.toolContent}>
                <h3>Audit Logs</h3>
                <p>System access and permission audit trails</p>
                <span className={styles.comingSoon}>Coming Soon</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2>⚙️ Configuration</h2>
          <p>System configuration and settings management</p>

          <div className={styles.tools}>
            <div className={styles.toolCard}>
              <div className={styles.toolIcon}>🎛️</div>
              <div className={styles.toolContent}>
                <h3>RBAC Configuration</h3>
                <p>Manage roles, permissions, and access policies</p>
                <span className={styles.comingSoon}>Coming Soon</span>
              </div>
            </div>

            <div className={styles.toolCard}>
              <div className={styles.toolIcon}>🌐</div>
              <div className={styles.toolContent}>
                <h3>Tenant Settings</h3>
                <p>Multi-tenant configuration and management</p>
                <span className={styles.comingSoon}>Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.info}>
        <h3>About System Administration</h3>
        <p>
          This section provides tools for system administrators to test, monitor, and configure
          the Keystone CMS system. The RBAC testing tools are particularly useful for:
        </p>
        <ul>
          <li><strong>Development:</strong> Verify access control logic during development</li>
          <li><strong>Testing:</strong> Ensure security policies work correctly</li>
          <li><strong>Performance:</strong> Monitor system performance under load</li>
          <li><strong>Security:</strong> Validate security boundaries and prevent vulnerabilities</li>
        </ul>
        <p>
          <strong>Note:</strong> These tools are intended for system administrators and developers.
          Regular users should not have access to this section.
        </p>
      </div>
    </div>
  );
}
