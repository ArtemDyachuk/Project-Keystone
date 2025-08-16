import { Sidebar, CMSNavigation } from "@/app/components/navigation";
import { Footer } from "@/app/components/navigation/Footer/Footer";
import { ThemeProvider } from "@/context/ThemeContext";
import { getUserDataAndTenants } from "@/app/actions/tenant.actions";
import styles from "./styles.module.css";

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get fresh user data and tenants using the same logic as pages
  const { userData, userTenants, selectedTenant } = await getUserDataAndTenants();

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
