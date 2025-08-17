import { getCurrentUser } from "@/app/actions/user.actions";
import { AccountClient } from "./AccountClient";
import styles from "./page.module.css";

export default async function AccountPage() {
  let user;
  let error;

  try {
    user = await getCurrentUser();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load account data";
    console.error("Error loading account data:", err);
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Account</h1>
        </div>
        <div className={styles.error}>
          <h2>❌ Error Loading Account</h2>
          <p>{error}</p>
          <p>Please try again or contact support if the problem persists.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Account</h1>
        </div>
        <div className={styles.error}>
          <h2>Not Authenticated</h2>
          <p>You need to be logged in to view your account.</p>
        </div>
      </div>
    );
  }

  return <AccountClient />;
}
