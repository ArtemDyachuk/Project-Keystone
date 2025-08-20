import { Sidebar, CMSNavigation } from "@/app/components/navigation";
import { Footer } from "@/app/components/navigation/Footer/Footer";
import { ThemeProvider } from "@/context/ThemeContext";
import { getCurrentUserServer } from "@/lib/sessions/server";
// import { TenantServiceClient } from "@/app/services";
import styles from "./styles.module.css";

// Force dynamic rendering since we use cookies
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get user data from session
  const userData = await getCurrentUserServer();

  // Get user's tenants from database (only if user has tenant IDs)
  const userTenants: Array<{ _id: string; name: string }> = []; // tenants integration later
  const selectedTenant: { _id: string; name: string } | null = null;

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
            <div className={styles.pageContent}>{children}</div>
            <Footer />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
