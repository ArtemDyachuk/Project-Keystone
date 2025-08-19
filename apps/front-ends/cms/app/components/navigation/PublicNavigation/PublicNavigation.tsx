"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@keystone/ui";
import styles from "./PublicNavigation.module.css";
import { UserData } from "@/lib/auth-utils";

interface PublicNavigationProps {
  user: UserData | null;
}

export function PublicNavigation({ user }: PublicNavigationProps) {
  // Client-safe display name extraction
  const getDisplayName = (user: UserData): string => {
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

  const displayName = user ? getDisplayName(user) : "Guest";

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          Keystone CMS
        </Link>

        <div className={styles.authSection}>
          {user ? (
            <div className={styles.userSection}>
              <span className={styles.welcome}>
                Hello, {displayName}! 👋
              </span>
              <Link href="/dashboard">
                <Button variant="primary" size="sm">
                  Dashboard
                </Button>
              </Link>
              <form action="/api/auth/signout" method="POST" style={{ display: "inline" }}>
                <Button type="submit" variant="outline" size="sm">Sign Out</Button>
              </form>
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
