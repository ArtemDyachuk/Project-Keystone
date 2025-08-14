import { Tenant } from "@/components/tenants/types";
import { TenantServiceClient } from "@/app/services";
import { getUserDataFromJWT } from "@/lib/auth-utils";
import styles from "./page.module.css";

export default async function TenantsPage() {
  let userTenants: Tenant[] = [];
  let error: string | null = null;

  try {
    // Get user data from JWT (server-side)
    const userData = await getUserDataFromJWT();
    
    if (userData?.tenantIds && userData.tenantIds.length > 0) {
      // Use the service to fetch tenants directly from database
      userTenants = await TenantServiceClient.getTenantsByIds(userData.tenantIds);
    }
  } catch (err) {
    console.error("Failed to load tenants:", err);
    error = err instanceof Error ? err.message : "Failed to load organizations";
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>🏢 Organizations</h1>
          <p>Manage your organizations and their settings.</p>
        </div>
        <div className={styles.error}>
          <p>Error loading organizations: {error}</p>
        </div>
      </div>
    );
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
