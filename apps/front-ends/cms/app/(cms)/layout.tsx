import { TenantSwitcher } from "@/app/components/tenants";
import { Sidebar } from "@/app/components/navigation";
import { Footer } from "@/app/components/layout/Footer";
import { ThemeProvider } from "@/app/context/ThemeContext";
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
    <ThemeProvider>
      <div className={styles.appContainer}>
        {/* Application Header - Full Width */}
        <header className={styles.appHeader}>
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

        {/* Application Body - Sidebar + Main Content */}
        <div className={styles.appBody}>
          <Sidebar />
          
          <main className={styles.mainContent}>
            <div className={styles.pageContent}>
              {children}
            </div>
            <Footer />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
