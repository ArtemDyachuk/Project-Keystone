import { getUserDataFromJWT } from "@/lib/auth/utils";
import { TenantServiceClient } from "@/app/services";
import styles from "./page.module.css";

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export default async function TenantsPage() {
  // Get user data from JWT
  const userData = await getUserDataFromJWT();
  
  // Get user's tenants directly from database using IDs from JWT
  let userTenants: any[] = [];
  
  if (userData?.tenantIds && userData.tenantIds.length > 0) {
    try {
      userTenants = await TenantServiceClient.getTenantsByIds(userData.tenantIds);
      console.log("✅ Fetched tenants from database:", userTenants.length);
    } catch (error) {
      console.error("❌ Failed to fetch tenants from database:", error);
      // Fallback to empty array
      userTenants = [];
    }
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
            {userTenants.map((tenant: any) => {
              // Get user's role for this tenant from JWT
              const userRole = userData?.tenantRoles?.[tenant._id] || "Unknown";
              
              return (
                <div key={tenant._id || 'unknown'} className={styles.tenantCard}>
                  <div className={styles.tenantInfo}>
                    <h3 className={styles.tenantName}>{tenant.name}</h3>
                    <p className={styles.tenantId}>ID: {tenant._id || 'Unknown'}</p>
                    <p className={styles.tenantCreated}>
                      Created: {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : 'Unknown'}
                    </p>
                    {tenant.firebaseTenantId && (
                      <p className={styles.tenantRole}>Firebase ID: {tenant.firebaseTenantId}</p>
                    )}
                    <p className={styles.tenantRole}>Your Role: {userRole}</p>
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
              );
            })}
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
