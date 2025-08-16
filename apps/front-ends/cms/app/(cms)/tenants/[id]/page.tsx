import { notFound } from "next/navigation";
import { TenantManagement } from "@/components/tenants";
import { TenantServiceClient } from "@/app/services";
import { getCurrentUser } from "@/app/actions/user.actions";

// Force dynamic rendering since TenantManagement uses server actions with cookies
export const dynamic = 'force-dynamic';

interface TenantPageProps {
  params: {
    id: string;
  };
}

export default async function TenantPage({ params }: TenantPageProps) {
  const resolvedParams = await params;

  try {
    const tenant = await TenantServiceClient.getTenantById(resolvedParams.id);

    if (!tenant) {
      // Check if this is an access issue or if tenant doesn't exist
      const userData = await getCurrentUser();

      if (userData && userData.tenantIds && userData.tenantIds.length > 0) {
        // User has tenants but not this one - show access denied
        return (
          <div style={{ padding: "20px" }}>
            <h1>Access Denied</h1>
            <p>You don't have access to this organization.</p>
            <p>Available organizations: {userData.tenantIds.join(", ")}</p>
            <p>If you just created this organization, please log out and log back in to refresh your permissions.</p>
          </div>
        );
      } else {
        // User has no tenants - show not found
        notFound();
      }
    }

    return <TenantManagement tenant={tenant} />;
  } catch (error) {
    console.error("Failed to fetch tenant:", error);
    notFound();
  }
}
