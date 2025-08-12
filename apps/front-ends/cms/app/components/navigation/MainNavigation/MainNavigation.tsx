"use client";

// This must be server side in future.
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@keystone/ui";
import { signOutUser } from "../../../../lib/auth-client";
import styles from "./MainNavigation.module.css";

interface UserInfo {
  email: string;
  given_name: string;
  family_name: string;
}

export function MainNavigation() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  // Hide navigation on auth pages
  const isAuthPage = pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  useEffect(() => {
    if (!isAuthPage) {
      checkAuthStatus();
    } else {
      setIsLoading(false);
    }
  }, [isAuthPage]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/status");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error("Failed to check auth status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    const success = await signOutUser();
    if (success) {
      setUser(null);
      window.location.href = "/login";
    }
  };

  // Don't render navigation on auth pages
  if (isAuthPage) {
    return null;
  }

  if (isLoading) {
    return (
      <nav className={styles.navbar}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            Keystone CMS
          </Link>
          <div className={styles.authSection}>
            <div className={styles.loading}>Loading...</div>
          </div>
        </div>
      </nav>
    );
  }

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
                Welcome, {user.given_name}!
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
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
