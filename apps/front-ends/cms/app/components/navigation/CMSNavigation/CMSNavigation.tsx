"use client";

import Link from "next/link";
import { TenantSwitcher } from "@/app/components/tenants";
import { logoutAction } from "@/app/actions";
import styles from "./CMSNavigation.module.css";

interface CMSNavigationProps {
  className?: string; // for dark mode
  userData: any;
  selectedCorporation: any;
  userCorporations: any[];
}

export function CMSNavigation({ className, userData, selectedCorporation, userCorporations }: CMSNavigationProps) {
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
            selectedCorporation={selectedCorporation}
            userCorporations={userCorporations}
          />
          <Link href="/account" className={styles.userInfo}>
            {displayName}
          </Link>
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
