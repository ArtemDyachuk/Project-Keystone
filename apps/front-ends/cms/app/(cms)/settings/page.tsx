import styles from './page.module.css';

export default function SettingsPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>⚙️ Settings</h1>
      
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2>🎨 UI Elements</h2>
          <p>Test and preview shared UI components</p>
          <a href="/settings/ui-elements" className={styles.link}>
            View UI Elements →
          </a>
        </div>

        <div className={styles.card}>
          <h2>📊 System Status</h2>
          <p>Monitor system health and connections</p>
          <a href="/settings/system-status" className={styles.link}>
            View System Status →
          </a>
        </div>
      </div>
    </div>
  );
}
