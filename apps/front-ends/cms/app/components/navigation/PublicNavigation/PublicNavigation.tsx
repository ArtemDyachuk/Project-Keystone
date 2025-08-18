"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@keystone/ui";
import { useStytchMember, useStytchB2BClient } from "@stytch/nextjs/b2b";
import { useRouter } from "next/navigation";
import styles from "./PublicNavigation.module.css";

export function PublicNavigation() {
  const { member } = useStytchMember();
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

  // Extract user display name safely
  const getUserDisplayName = () => {
    if (!member) return "User";
    
    // Try to get name from member object (type-safe approach)
    try {
      // Access member properties safely using any type
      const memberAny = member as any;
      const firstName = memberAny?.name?.first_name || memberAny?.name?.firstName;
      const email = memberAny?.emails?.[0]?.email || memberAny?.email;
      
      if (firstName) return firstName;
      if (email) return email.split("@")[0];
      return "User";
    } catch {
      return "User";
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          Keystone CMS
        </Link>

        <div className={styles.authSection}>
          {member ? (
            <div className={styles.userSection}>
              <span className={styles.welcome}>
                Welcome, {getUserDisplayName()}!
              </span>
              <Link href="/dashboard">
                <Button variant="primary" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className={styles.guestSection}>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
