import { TenantCreate } from "@/components/tenants";
import { getUserDataFromJWT } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

// Force dynamic rendering since we use cookies and server actions
export const dynamic = 'force-dynamic';

export default async function TenantCreationPage() {
  // Get user data server-side
  const userData = await getUserDataFromJWT();
  
  // If no user data, redirect to login
  if (!userData) {
    redirect("/login");
  }

  return <TenantCreate userData={userData} />;
}
