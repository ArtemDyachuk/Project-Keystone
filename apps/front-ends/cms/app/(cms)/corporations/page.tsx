import { getCurrentUserServer } from "@/lib/sessions/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

interface Corporation {
   _id: string;
   name: string;
   tenantId: string;
   createdAt: string;
   updatedAt: string;
}

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export default async function CorporationsPage() {
   // Get current user from server-side session
   const currentUser = await getCurrentUserServer();

   // If no user session, redirect to login
   if (!currentUser) {
      redirect("/login");
   }

   // Get user's corporations from backend API
   let userCorporations: Corporation[] = [];
   try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("session")?.value || '';

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/corporations/user/me`, {
         method: "GET",
         headers: {
            Cookie: `session=${sessionId}`,
         },
         cache: "no-store",
      });

      if (response.ok) {
         const data = await response.json();
         userCorporations = data.corporations || [];
      }
   } catch (error) {
      console.error("Failed to fetch user corporations:", error);
   }

   return (
      <div className={styles.container}>
         <div className={styles.header}>
            <h1>🏢 Corporations</h1>
            <p>Manage your corporations and business entities.</p>
         </div>

         <div className={styles.corporationsList}>
            {userCorporations.length === 0 ? (
               <div className={styles.emptyState}>
                  <p>No corporations found. Create your first corporation to get started.</p>
               </div>
            ) : (
               <div className={styles.corporationsGrid}>
                  {userCorporations.map((corporation) => (
                     <div key={corporation._id || 'unknown'} className={styles.corporationCard}>
                        <div className={styles.corporationInfo}>
                           <h3 className={styles.corporationName}>{corporation.name}</h3>
                           <p className={styles.corporationId}>ID: {corporation._id || 'Unknown'}</p>
                           <p className={styles.tenantId}>Tenant: {corporation.tenantId || 'Unknown'}</p>
                           <p className={styles.corporationCreated}>
                              Created: {corporation.createdAt ? new Date(corporation.createdAt).toLocaleDateString() : 'Unknown'}
                           </p>
                        </div>
                        <div className={styles.corporationActions}>
                           <Link
                              href={`/corporations/${corporation._id || 'unknown'}`}
                              className={styles.manageButton}
                           >
                              ⚙️ Manage
                           </Link>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>

         <div className={styles.createSection}>
            <Link href="/corporations/create" className={styles.createButton}>
               ➕ Create New Corporation
            </Link>
         </div>
      </div>
   );
}
