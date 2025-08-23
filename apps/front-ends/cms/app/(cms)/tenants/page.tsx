import { getCurrentUserServer } from "@/lib/sessions/server";
import { redirect } from "next/navigation";
import styles from "./page.module.css";

interface Tenant {
  _id: string;
  name: string;
  gipTenantId: string;
  createdAt: string;
  updatedAt: string;
}

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export default async function TenantsPage() {
  // Get current user from server-side session
  const currentUser = await getCurrentUserServer();

  // If no user session, redirect to login
  if (!currentUser) {
    redirect("/login");
  }

  // Get user's tenants from backend API
  let userTenants: Tenant[] = [];
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value || '';

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenants/management/list`, {
      method: "GET",
      headers: {
        Cookie: `session=${sessionId}`,
      },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json();
      userTenants = data.tenants || [];
    }
  } catch (error) {
    console.error("Failed to fetch user tenants:", error);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🏢 Organizations</h1>
        <p>Manage your organizations and their settings.</p>
      </div>

      <div className={styles.tenantsList}>
        {userTenants.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No organizations found. Create your first organization to get started.</p>
            <a href="/tenants/create" className={styles.createButton}>
              ➕ Create Organization
            </a>
          </div>
        ) : (
          <div className={styles.tenantsGrid}>
            {userTenants.map((tenant) => (
              <div key={tenant._id || 'unknown'} className={styles.tenantCard}>
                <div className={styles.tenantInfo}>
                  <h3 className={styles.tenantName}>{tenant.name}</h3>
                  <p className={styles.tenantId}>ID: {tenant._id || 'Unknown'}</p>
                  <p className={styles.tenantCreated}>
                    Created: {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div className={styles.tenantActions}>
                  <a
                    href={`/tenants/${tenant._id || 'unknown'}`}
                    className={styles.manageButton}
                  >
                    ⚙️ Manage
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.createSection}>
        <a href="/tenants/create" className={styles.createButton}>
          ➕ Create New Organization
        </a>
      </div>
    </div>
  );
}
