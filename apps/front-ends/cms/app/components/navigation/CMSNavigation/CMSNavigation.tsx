"use client";

import { TenantSwitcher } from "@/app/components/tenants";
import { logoutAction } from "@/app/actions";
import styles from "./CMSNavigation.module.css";

interface CMSNavigationProps {
  className?: string; // for dark mode
  userData: any;
  selectedTenant: any;
  userTenants: any[];
}

export function CMSNavigation({ className, userData, selectedTenant, userTenants }: CMSNavigationProps) {
  // Client-safe display name extraction
  const getDisplayName = (user: any): string => {
    if (user?.displayName) {
      return user.displayName;
    }
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return "User";
  };

  const displayName = userData ? getDisplayName(userData) : "User";

  return (
    <header className={`${styles.appHeader} ${className || ""}`}>
      <div className={styles.headerContent}>
        <h1 className={styles.logo}>Keystone CMS</h1>
        <div className={styles.headerActions}>
          <TenantSwitcher
            selectedTenant={selectedTenant}
            userTenants={userTenants}
          />
          <span className={styles.userInfo}>
            {displayName}
          </span>
          <form action={logoutAction} style={{ display: "inline" }}>
            <button type="submit" className={styles.logoutButton}>
              Logout
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
