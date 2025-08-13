"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={styles.container}>
      {/* Top Navigation Bar */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button
            className={styles.menuButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <h1 className={styles.logo}>Keystone CMS</h1>
          <div className={styles.headerActions}>
            <span className={styles.userInfo}>Admin User</span>
            <form action="/api/auth/signout" method="POST" style={{ display: "inline" }}>
              <button type="submit" className={styles.logoutButton}>
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className={styles.main}>
        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
          <nav className={styles.navigation}>
            <ul className={styles.navList}>
              <li className={styles.navItem}>
                <a href="/dashboard" className={styles.navLink}>
                  📊 Dashboard
                </a>
              </li>
              <li className={styles.navItem}>
                <a href="/dashboard/content" className={styles.navLink}>
                  📝 Content
                </a>
              </li>
              <li className={styles.navItem}>
                <a href="/dashboard/media" className={styles.navLink}>
                  🖼️ Media
                </a>
              </li>
              <li className={styles.navItem}>
                <a href="/dashboard/users" className={styles.navLink}>
                  👥 Users
                </a>
              </li>
              <li className={styles.navItem}>
                <a href="/dashboard/settings" className={styles.navLink}>
                  ⚙️ Settings
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
