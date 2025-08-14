"use client";

import { useState, useTransition } from "react";
import { toggleSidebarAction } from "@/actions/sidebar.actions";
import { NavItem } from "./Sidebar";
import styles from "./Sidebar.module.css";

interface SidebarClientProps {
  initialCollapsed: boolean;
  navigationItems: NavItem[];
  className?: string;
}

export function SidebarClient({ initialCollapsed, navigationItems, className }: SidebarClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isPending, startTransition] = useTransition();

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState); // Optimistic update for immediate UI response

    // Update server-side cookie
    startTransition(async () => {
      await toggleSidebarAction(newState);
    });
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : styles.expanded} ${className || ""}`}>
      <div className={styles.sidebarHeader}>
        <button
          type="button"
          onClick={toggleSidebar}
          className={styles.toggleButton}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          disabled={isPending}
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
