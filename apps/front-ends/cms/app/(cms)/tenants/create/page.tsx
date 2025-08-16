import { TenantCreate } from "@/components/tenants";
import { getCurrentUser } from "@/app/actions/user.actions";
import { redirect } from "next/navigation";

// Force dynamic rendering since we use cookies and server actions
export const dynamic = 'force-dynamic';

export default async function TenantCreationPage() {
  // Get user data server-side
  const userData = await getCurrentUser();

  // Redirect if no user data (not authenticated)
  if (!userData) {
    redirect("/auth/login");
  }

  return <TenantCreate userData={userData} />;
}
