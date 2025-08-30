"use client";

import Link from "next/link";
import styles from "./page.module.css";

export default function DocumentationPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📚 Documentation</h1>
        <p>Complete guides and references for the Keystone CMS system</p>
      </div>

      <div className={styles.docsGrid}>
        <div className={styles.docCard}>
          <div className={styles.docIcon}>🔐</div>
          <div className={styles.docContent}>
            <h2>RBAC System Guide</h2>
            <p>Complete guide to Role-Based Access Control system</p>
            <ul>
              <li>System architecture and concepts</li>
              <li>How to manage roles and permissions</li>
              <li>Component protection patterns</li>
              <li>Testing and monitoring tools</li>
              <li>Maintenance workflows</li>
            </ul>
            <Link href="/documentation/rbac-guide" className={styles.docLink}>
              📖 Read Full Guide
            </Link>
          </div>
        </div>

        <div className={styles.docCard}>
          <div className={styles.docIcon}>⚡</div>
          <div className={styles.docContent}>
            <h2>RBAC Developer Cheat Sheet</h2>
            <p>Quick reference for common RBAC operations</p>
            <ul>
              <li>Copy-paste code examples</li>
              <li>Common permission patterns</li>
              <li>Quick troubleshooting guide</li>
              <li>Testing instructions</li>
              <li>Best practices summary</li>
            </ul>
            <Link href="/documentation/rbac-cheatsheet" className={styles.docLink}>
              📋 View Cheat Sheet
            </Link>
          </div>
        </div>

        <div className={styles.docCard}>
          <div className={styles.docIcon}>🧪</div>
          <div className={styles.docContent}>
            <h2>Testing Tools</h2>
            <p>Built-in tools for validating RBAC system</p>
            <ul>
              <li>Component access testing</li>
              <li>Performance benchmarking</li>
              <li>Security validation</li>
              <li>Role behavior verification</li>
            </ul>
            <Link href="/system/rbac/component-test" className={styles.docLink}>
              🧪 Run Tests
            </Link>
          </div>
        </div>

        <div className={styles.docCard}>
          <div className={styles.docIcon}>📁</div>
          <div className={styles.docContent}>
            <h2>System Administration</h2>
            <p>Tools and utilities for system management</p>
            <ul>
              <li>RBAC testing and monitoring</li>
              <li>Performance metrics</li>
              <li>System health checks</li>
              <li>Configuration management</li>
            </ul>
            <Link href="/system" className={styles.docLink}>
              ⚙️ System Tools
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.quickStart}>
        <h2>🚀 Quick Start</h2>
        <div className={styles.quickStartGrid}>
          <div className={styles.quickStartItem}>
            <h3>1. Understand the System</h3>
            <p>Read the <Link href="/documentation/rbac-guide">RBAC Guide</Link> to understand how roles, permissions, and components work together.</p>
          </div>

          <div className={styles.quickStartItem}>
            <h3>2. Use the Cheat Sheet</h3>
            <p>Keep the <Link href="/documentation/rbac-cheatsheet">Developer Cheat Sheet</Link> handy for quick code examples.</p>
          </div>

          <div className={styles.quickStartItem}>
            <h3>3. Test Your Changes</h3>
            <p>Use the <Link href="/system/rbac/component-test">Component Access Tests</Link> to validate your RBAC implementation.</p>
          </div>

          <div className={styles.quickStartItem}>
            <h3>4. Monitor Performance</h3>
            <p>Check <Link href="/system/rbac/performance">Performance Tests</Link> to ensure your system remains fast.</p>
          </div>
        </div>
      </div>

      <div className={styles.info}>
        <h3>💡 Documentation Philosophy</h3>
        <p>
          This documentation is designed to be <strong>practical and actionable</strong>. Each guide provides:
        </p>
        <ul>
          <li><strong>Copy-paste examples</strong> you can use immediately</li>
          <li><strong>Step-by-step workflows</strong> for common tasks</li>
          <li><strong>Built-in testing tools</strong> to validate your work</li>
          <li><strong>Troubleshooting guides</strong> for common issues</li>
        </ul>
        <p>
          <strong>Remember</strong>: The best documentation is the one you actually use. These guides are designed to be
          your daily reference, not just something you read once and forget.
        </p>
      </div>
    </div>
  );
}
