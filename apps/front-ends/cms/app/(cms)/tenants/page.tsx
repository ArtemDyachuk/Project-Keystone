import { getCurrentUser } from "@/app/actions/user.actions";
import { config } from "@/lib/config";
import styles from "./page.module.css";

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export default async function TenantsPage() {
  // Get user data from backend API
  const userData = await getCurrentUser();

  // Get user's tenants from backend API directly
  let userTenants: any[] = [];

  try {
    // Determine the API base URL
    let apiBaseUrl = config.apiBaseUrl;

    // Get the session cookie from the server
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("fb_session")?.value;

    if (!sessionCookie) {
      return (
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>🏢 Organizations</h1>
            <p>Please log in to view your organizations.</p>
          </div>
        </div>
      );
    }

    // Call backend API directly with the session cookie
    const response = await fetch(`${apiBaseUrl}/api/tenants/user/me`, {
      headers: {
        "Cookie": `fb_session=${sessionCookie}`,
      },
      cache: "no-store", // Don't cache this request
    });

    if (response.ok) {
      const result = await response.json();
      userTenants = result.tenants || [];
    } else {
      console.error("❌ Failed to fetch tenants from API:", response.status);
      // Fallback to empty array
      userTenants = [];
    }
  } catch (error) {
    console.error("❌ Error fetching tenants:", error);
    // Fallback to empty array
    userTenants = [];
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🏢 Organizations</h1>
        <p>Manage your organizations and their settings.</p>

        {/* Show re-authentication notice if user has no tenants but might have created one */}
        {userTenants.length === 0 && userData?.sub && (
          <div style={{
            background: "#fff3cd",
            border: "1px solid #ffeaa7",
            borderRadius: "8px",
            padding: "15px",
            marginTop: "15px",
            fontSize: "14px"
          }}>
            <p style={{ margin: "0 0 10px 0", fontWeight: "500" }}>
              💡 Just created an organization?
            </p>
            <p style={{ margin: "0 0 10px 0" }}>
              If you just created an organization but don't see it here, you may need to sign out and sign back in to refresh your permissions.
            </p>
            <p style={{ margin: "0", fontSize: "12px", opacity: "0.8" }}>
              This happens because Firebase custom claims are updated on the server but your current session still has the old permissions.
            </p>
          </div>
        )}
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
              // Get user's role for this tenant from backend data
              const userRole = "admin"; // Default role for now

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
