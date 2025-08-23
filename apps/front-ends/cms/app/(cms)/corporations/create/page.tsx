import { getCurrentUserServer } from "@/lib/sessions/server";
import { redirect } from "next/navigation";
import { CreateCorporationForm } from "@/app/components/corporations/CreateCorporationForm";
import styles from "./page.module.css";

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export default async function CreateCorporationPage() {
   // Get current user from server-side session
   const currentUser = await getCurrentUserServer();

   // If no user session, redirect to login
   if (!currentUser) {
      redirect("/login");
   }

   // Get user's tenants to choose from
   let userTenants: Array<{ _id: string; name: string; gipTenantId: string }> = [];
   try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("session")?.value || '';

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tenants/management/list`, {
         method: "GET",
         headers: {
            Cookie: `session=${sessionId}`,
         },
         cache: "no-store",
      });

      if (response.ok) {
         const data = await response.json();
         userTenants = data.tenants || [];
      }
   } catch (error) {
      console.error("Failed to fetch user tenants:", error);
   }

   if (userTenants.length === 0) {
      return (
         <div className={styles.container}>
            <div className={styles.error}>
               <h1>No Tenants Available</h1>
               <p>You need to create a tenant first before you can create corporations.</p>
               <a href="/tenants/create" className={styles.createTenantButton}>
                  ➕ Create Tenant
               </a>
            </div>
         </div>
      );
   }

   return (
      <div className={styles.container}>
         <div className={styles.header}>
            <div className={styles.breadcrumb}>
               <a href="/corporations" className={styles.breadcrumbLink}>
                  ← Corporations
               </a>
            </div>
            <h1>🏢 Create Corporation</h1>
            <p>Create a new corporation and assign it to a tenant.</p>
         </div>

         <div className={styles.content}>
            <CreateCorporationForm userTenants={userTenants} />
         </div>
      </div>
   );
}
