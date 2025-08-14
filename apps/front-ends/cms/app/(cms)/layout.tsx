import { TenantSwitcher } from "@/app/components/tenants";
import { getUserDataFromJWT, getUserDisplayName } from "@/lib/auth-utils";
import { TenantServiceClient } from "@/app/services";
import styles from "./styles.module.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get user data from JWT
  const userData = await getUserDataFromJWT();
  
  // Get user's tenants from database
  const userTenants = await TenantServiceClient.getTenantsByIds(userData?.tenantIds || []);
  
  // Find selected tenant
  const selectedTenant = userTenants.find(tenant => tenant._id === userData?.selectedTenantId) || null;

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
            <span className={styles.userInfo}>{userData ? getUserDisplayName(userData) : "Admin User"}</span>
            <form action="/api/auth/signout" method="POST" style={{ display: "inline" }}>
              <button type="submit" className={styles.logoutButton}>
                Logout
              </button>
            </form>
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
