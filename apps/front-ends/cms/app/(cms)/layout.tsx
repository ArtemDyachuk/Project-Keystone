import { Sidebar, CMSNavigation } from "@/app/components/navigation";
import { Footer } from "@/app/components/navigation/Footer/Footer";
import { ThemeProvider } from "@/context/ThemeContext";
import { getCurrentUserServer } from "@/lib/sessions/server";
import type { Corporation } from "@/app/components/corporations/types";
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

  // Get user's corporations from database
  let userCorporations: Corporation[] = [];
  let selectedCorporation: Corporation | null = null;

  if (userData) {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("session")?.value || '';

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenants/user/me`, {
        method: "GET",
        headers: {
          Cookie: `session=${sessionId}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        userCorporations = data.corporations || [];
        selectedCorporation = userCorporations.find((c: Corporation) => c._id === userData.selectedCorporationId) || null;
      }
    } catch (error) {
      console.error("Failed to fetch user corporations:", error);
    }
  }

  return (
    <ThemeProvider>
      <div className={styles.appContainer}>
        {/* Application Header - Full Width */}
        <CMSNavigation
          userData={userData}
          selectedCorporation={selectedCorporation}
          userCorporations={userCorporations}
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
