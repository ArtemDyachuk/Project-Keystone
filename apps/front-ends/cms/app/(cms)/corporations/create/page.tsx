import { getCurrentUserServer } from "@/lib/sessions/server";
import { redirect } from "next/navigation";
import { CreateCorporationForm } from "@/app/components/corporations/CreateCorporationForm";
import styles from "./page.module.css";
import Link from "next/link";

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export default async function CreateCorporationPage() {
   // Get current user from server-side session
   const currentUser = await getCurrentUserServer();

   // If no user session, redirect to login
   if (!currentUser) {
      redirect("/login");
   }

   // Check if user has a tenant (required for corporation creation)
   let hasTenant = false;
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
         hasTenant = (data.tenants || []).length > 0;
      }
   } catch (error) {
      console.error("Failed to check user tenants:", error);
   }

   if (!hasTenant) {
      return (
         <div className={styles.container}>
            <div className={styles.error}>
               <h1>No Tenants Available</h1>
               <p>You need to create a tenant first before you can create corporations.</p>
               <Link href="/tenants/create" className={styles.createTenantButton}>
                  ➕ Create Tenant
               </Link>
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
            <p>Create a new corporation in your organization.</p>
         </div>

         <div className={styles.content}>
            <CreateCorporationForm />
         </div>
      </div>
   );
}
