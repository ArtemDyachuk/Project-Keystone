"use client";

import { useState } from "react";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  className?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navigationItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/tenants", label: "Tenants", icon: "🏢" },
];

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : styles.expanded} ${className || ""}`}>
      <div className={styles.sidebarHeader}>
        <button
          type="button"
          onClick={toggleSidebar}
          className={styles.toggleButton}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className={styles.toggleIcon}>
            {isCollapsed ? "→" : "←"}
          </span>
        </button>
      </div>
      
      <nav className={styles.navigation} role="navigation" aria-label="Main navigation">
        <ul className={styles.navList}>
          {navigationItems.map((item) => (
            <li key={item.href} className={styles.navItem}>
              <a 
                href={item.href} 
                className={styles.navLink}
                title={isCollapsed ? item.label : undefined}
              >
                <span className={styles.navIcon} aria-hidden="true">
                  {item.icon}
                </span>
                <span className={styles.navLabel}>
                  {item.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
