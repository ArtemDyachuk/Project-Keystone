import { getCurrentUserServer } from "@/lib/sessions/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TenantManagement } from "@/components/tenants";
import styles from "./page.module.css";

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

interface TenantPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { id } = await params;

  // Get current user from server-side session
  const currentUser = await getCurrentUserServer();

  // If no user session, redirect to login
  if (!currentUser) {
    redirect("/login");
  }

  // Get tenant details from backend API
  let tenant = null;
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value || '';

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenants/${id}`, {
      method: "GET",
      headers: {
        Cookie: `session=${sessionId}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      tenant = data.tenant;
    }
  } catch (error) {
    console.error("Failed to fetch tenant:", error);
  }

  if (!tenant) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Tenant Not Found</h1>
          <p>The tenant you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/tenants" className={styles.backButton}>
            ← Back to Tenants
          </Link>
        </div>
      </div>
    );
  }

  return <TenantManagement tenant={tenant} />;
}
