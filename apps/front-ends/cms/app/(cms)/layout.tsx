import { TenantSwitcher } from "@/app/components/tenants";
import { getUserDataFromJWT, getUserDisplayName } from "@/lib/auth-utils";
import { TenantServiceClient } from "@/app/services";
import styles from "./styles.module.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Extract user data from JWT token (server-side)
  const userData = await getUserDataFromJWT();
  const displayName = userData ? getUserDisplayName(userData) : "Admin User";

  // Fetch user's tenants server-side if we have tenant IDs
  const userTenants = await TenantServiceClient.getTenantsByIds(userData?.tenantIds || []);
  const selectedTenant = userTenants.find(t => t._id === userData?.selectedTenantId);

  console.log("🔍 Display Name:", userData);
  console.log("🔍 User Tenants:", userTenants);
  console.log("🔍 Selected Tenant:", selectedTenant);

  return (
    <div className={styles.container}>
      {/* Top Navigation Bar */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>Keystone CMS</h1>
          <div className={styles.headerActions}>
            <TenantSwitcher
              selectedTenant={selectedTenant}
              userTenants={userTenants}
            />
            <span className={styles.userInfo}>{displayName}</span>
            <a href="/api/auth/signout" className={styles.logoutButton}>
              Logout
            </a>
          </div>
        </div>
      </header>

      <div className={styles.main}>
        {/* Fixed Sidebar */}
        <aside className={styles.sidebar}>
          <nav className={styles.navigation}>
            <ul className={styles.navList}>
              <li className={styles.navItem}>
                <a href="/dashboard" className={styles.navLink}>
                  📊 Dashboard
                </a>
              </li>
              <li className={styles.navItem}>
                <a href="/tenants" className={styles.navLink}>
                  🏢 Tenants
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
