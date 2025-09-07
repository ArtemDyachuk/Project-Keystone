import { getCurrentUserServer } from "@/lib/sessions/server";
import { AccountForm } from "@/app/components/users";
import { MfaManagement } from "@/app/components/mfa";
import styles from "./page.module.css";

export default async function AccountPage() {
  // Get current user from server session
  const user = await getCurrentUserServer();

  // If no user, middleware will handle redirect
  if (!user) {
    return null;
  }

  // Prepare MFA status from user data
  const mfaStatus = {
    success: true,
    mfaEnabled: user.mfa || false,
    mfaEnrolledAt: user.mfaEnrolledAt,
    message: user.mfa ? 'MFA is enabled' : 'MFA is not enabled'
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Account</h1>
        <p>Manage your account information and preferences</p>
      </div>

      <MfaManagement initialMfaStatus={mfaStatus} />
      <AccountForm user={user} />
    </div>
  );
}
