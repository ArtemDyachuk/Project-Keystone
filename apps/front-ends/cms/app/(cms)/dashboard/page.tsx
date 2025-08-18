"use client";

import styles from "./dashboard.module.css";

export default function DashboardPage() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.subtitle}>Welcome to your CMS dashboard</p>
          </div>
        </div>
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
          <h3 className={styles.cardTitle}>📝 Recent Content</h3>
          <p className={styles.cardContent}>Manage your latest posts and pages.</p>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Published Posts</span>
            <span className={styles.metricValue}>23</span>
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
    </div>
  );
}
