import TenantCreationForm from "@/app/components/tenant-creation/TenantCreationForm";
import { getCurrentUserServer } from "@/lib/sessions/server";
import { redirect } from "next/navigation";
import styles from "./page.module.css";

// Force dynamic rendering since we use session cookies
export const dynamic = "force-dynamic";

interface CreateTenantPageProps {
  searchParams: Promise<{
    uid?: string;
    email?: string;
  }>;
}

export default async function CreateTenantPage({ searchParams }: CreateTenantPageProps) {
  const { uid, email } = await searchParams;

  // Get current user from server-side session
  const currentUser = await getCurrentUserServer();

  // If no user session, redirect to login
  if (!currentUser) {
    console.log("🔍 Debug: No authenticated user found, redirecting to login");
    redirect("/login");
  }

  // If we have uid/email from signup flow, use those
  // Otherwise, use the authenticated user's data
  const finalUid = uid || currentUser.uid;
  const finalEmail = email || currentUser.email;

  console.log("🔍 Debug: User authenticated:", {
    fromParams: { uid, email },
    fromSession: { uid: currentUser.uid, email: currentUser.email },
    final: { finalUid, finalEmail }
  });

  if (!finalUid || !finalEmail) {
    console.log("🔍 Debug: Missing uid or email, showing access denied");
    return (
      <div className={styles.container}>
        <div className={styles.accessDenied}>
          <h1 className={styles.title}>Access Denied</h1>
          <p className={styles.message}>Unable to determine user information.</p>
        </div>
      </div>
    );
  }

  console.log("🔍 Debug: Rendering TenantCreationForm with:", { finalUid, finalEmail });

  return <TenantCreationForm userId={finalUid} userEmail={finalEmail} />;
}
