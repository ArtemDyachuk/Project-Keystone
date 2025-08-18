"use client";

import { TenantSwitcher } from "@/app/components/tenants";
import { useStytchB2BClient } from "@stytch/nextjs/b2b";
import { useRouter } from "next/navigation";
import styles from "./CMSNavigation.module.css";

interface CMSNavigationProps {
  className?: string; // for dark mode
  userData: any;
  selectedTenant: any;
  userTenants: any[];
}

export function CMSNavigation({ className, userData, selectedTenant, userTenants }: CMSNavigationProps) {
  const stytch = useStytchB2BClient();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await stytch.session.revoke();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

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
          <button 
            type="button" 
            className={styles.logoutButton}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
