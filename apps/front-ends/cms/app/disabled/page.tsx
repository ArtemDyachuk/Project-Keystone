import { redirect } from "next/navigation";
import { getCurrentUserServer } from "@/lib/sessions/server";
import { Card } from "@keystone/ui";
import styles from "./page.module.css";

export default async function DisabledUserPage() {
  // Get current user from server session
  const user = await getCurrentUserServer();

  // If no user, middleware will handle redirect
  if (!user) {
    return null;
  }

  // If user is NOT disabled, redirect them to dashboard
  if (!user.disabled) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logo}>Keystone CMS</div>
        <div className={styles.status}>Account Disabled</div>
      </div>

      <div className={styles.content}>
        <Card className={styles.mainCard}>
          <div className={styles.iconContainer}>
            <div className={styles.disabledIcon}>🚫</div>
          </div>

          <h1 className={styles.title}>Account Disabled</h1>

          <p className={styles.message}>
            Your account has been disabled by an administrator.
            You are no longer able to access the system.
          </p>

          <div className={styles.userInfo}>
            <h2>Account Details</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Email:</span>
                <span className={styles.value}>{user.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>User ID:</span>
                <span className={styles.value}>{user.uid}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Display Name:</span>
                <span className={styles.value}>{user.displayName || "Not set"}</span>
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <p className={styles.helpText}>
              If you believe this is an error, please contact your system administrator.
            </p>

            <form action="/api/auth/signout" method="POST" className={styles.logoutForm}>
              <button type="submit" className={styles.logoutButton}>
                Sign Out
              </button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
