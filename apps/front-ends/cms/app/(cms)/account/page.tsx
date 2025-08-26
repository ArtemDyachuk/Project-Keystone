import { getCurrentUserServer } from "@/lib/sessions/server";
import { AccountForm } from "@/app/components/users";
import styles from "./page.module.css";

export default async function AccountPage() {
  // Get current user from server session
  const user = await getCurrentUserServer();

  // If no user, middleware will handle redirect
  if (!user) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Account</h1>
        <p>Manage your account information and preferences</p>
      </div>

      <AccountForm user={user} />
    </div>
  );
}
