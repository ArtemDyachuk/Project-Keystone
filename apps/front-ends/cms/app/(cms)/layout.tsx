import { Sidebar, CMSNavigation } from "@/app/components/navigation";
import { Footer } from "@/app/components/navigation/Footer/Footer";
import { ThemeProvider } from "@/context/ThemeContext";
import { getUserDataFromJWT } from "@/lib/auth-utils";
import { TenantServiceClient } from "@/app/services";
import styles from "./styles.module.css";

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get user data from JWT
  const userData = await getUserDataFromJWT();

  // Get user's tenants from database (only if user has tenant IDs)
  const userTenants = userData?.tenantIds && userData.tenantIds.length > 0 
    ? await TenantServiceClient.getTenantsByIds(userData.tenantIds)
    : [];

  // Find selected tenant with robust comparison
  let selectedTenant = userTenants.find(tenant => {
    // Convert both to strings for comparison to handle any type mismatches
    const tenantId = String(tenant._id);
    const selectedId = String(userData?.selectedTenantId);
    return tenantId === selectedId;
  }) || null;

  // Fallback: if no tenant is selected or selected tenant doesn't exist, use the first available
  if (!selectedTenant && userTenants.length > 0) {
    selectedTenant = userTenants[0];
  }

  return (
    <ThemeProvider>
      <div className={styles.appContainer}>
        {/* Application Header - Full Width */}
        <CMSNavigation
          userData={userData}
          selectedTenant={selectedTenant}
          userTenants={userTenants}
        />

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
