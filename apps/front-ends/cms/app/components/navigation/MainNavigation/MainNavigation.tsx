import Link from "next/link";
import { Button } from "@keystone/ui";
import { SignOutButton } from "./SignOutButton";
import { getServerUserData } from "../../../../lib/auth-server";
import styles from "./MainNavigation.module.css";

export async function MainNavigation() {
  const user = await getServerUserData();

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
              <SignOutButton />
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
