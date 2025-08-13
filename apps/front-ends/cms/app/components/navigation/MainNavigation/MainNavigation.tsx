import React from "react";
import Link from "next/link";
import { Button } from "@keystone/ui";
import { getAuthCookies } from "../../../../lib/auth-cookies";
import { isTokenExpired, extractUserFromIdToken } from "@keystone/auth";
import styles from "./MainNavigation.module.css";

interface UserInfo {
  email: string;
  given_name: string;
  family_name: string;
}

export async function MainNavigation() {
  // Server-side auth check - no loading state needed
  let user: UserInfo | null = null;
  
  try {
    const { accessToken, idToken } = await getAuthCookies();
    
    if (accessToken && idToken && !isTokenExpired(accessToken)) {
      const userData = extractUserFromIdToken(idToken);
      user = {
        email: userData.email || "",
        given_name: userData.given_name || "",
        family_name: userData.family_name || "",
      };
    }
  } catch (error) {
    // User not authenticated, user remains null
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
              <form action="/api/auth/signout" method="POST" style={{ display: "inline" }}>
                <Button type="submit" variant="outline" size="sm">
                  Sign Out
                </Button>
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
