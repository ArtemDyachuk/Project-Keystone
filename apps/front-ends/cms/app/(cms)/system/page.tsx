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

            <Link href="/system/rbac/component-test" className={styles.toolCard}>
              <div className={styles.toolIcon}>🧪</div>
              <div className={styles.toolContent}>
                <h3>Component Access Testing</h3>
                <p>Test which UI components each role can access</p>
                <ul>
                  <li>Component-level permission testing</li>
                  <li>Page access validation</li>
                  <li>Role behavior verification</li>
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
        <h3>Quick RBAC Reference</h3>
        <div className={styles.quickRef}>
          <div className={styles.refSection}>
            <h4>🔑 Key Commands</h4>
            <ul>
              <li><strong>Add Permission:</strong> Edit <code>packages/rbac/src/roles.config.ts</code></li>
              <li><strong>Add Role:</strong> Define in <code>roles.config.ts</code> then rebuild</li>
              <li><strong>Protect Component:</strong> Wrap with <code>&lt;PermissionGuard&gt;</code></li>
              <li><strong>Test Changes:</strong> Run component access tests</li>
            </ul>
          </div>

          <div className={styles.refSection}>
            <h4>📁 Key Files</h4>
            <ul>
              <li><strong>Roles:</strong> <code>packages/rbac/src/roles.config.ts</code></li>
              <li><strong>Service:</strong> <code>app/services/rbac.service.ts</code></li>
              <li><strong>Guards:</strong> <code>app/components/rbac/guards/</code></li>
              <li><strong>Documentation:</strong> <code>app/(cms)/system/rbac/README.md</code></li>
            </ul>
          </div>
        </div>

        <div className={styles.workflow}>
          <h4>🔄 Workflow for New Features</h4>
          <ol>
            <li>Define permissions in <code>roles.config.ts</code></li>
            <li>Assign to appropriate roles</li>
            <li>Protect components with guards</li>
            <li>Add to test suite</li>
            <li>Rebuild package & test</li>
          </ol>
        </div>

        <div className={styles.docsLink}>
          <p>
            <strong>📚 Full Documentation:</strong>
            <Link href="/documentation">
              View Complete RBAC Guide
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
