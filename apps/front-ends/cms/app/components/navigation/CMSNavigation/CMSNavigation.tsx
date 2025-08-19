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
            {userData?.firstName || ""}
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
