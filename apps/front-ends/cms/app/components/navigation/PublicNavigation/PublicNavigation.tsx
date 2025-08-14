"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@keystone/ui";
import styles from "./PublicNavigation.module.css";

interface UserInfo {
  email: string;
  firstName: string;
  lastName: string;
}

export function PublicNavigation() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated by looking for auth cookies
    const checkAuth = () => {
      try {
        // Simple client-side auth check
        const hasAuthCookies = document.cookie.includes("accessToken=") || document.cookie.includes("idToken=");
        
        if (hasAuthCookies) {
          // For now, just show a generic user
          setUser({
            email: "user@example.com",
            firstName: "User",
            lastName: "Name"
          });
        }
      } catch (error) {
        // Silently handle auth check failures in production
        // In development, you might want to log this
        if (process.env.NODE_ENV === "development") {
          console.error("Auth check failed:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <nav className={styles.navbar}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            Keystone CMS
          </Link>
          <div className={styles.authSection}>
            <span className={styles.loading}>Loading...</span>
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
                Welcome, {user.firstName}!
              </span>
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
